import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';
import { dbUserName } from './config';
import { setupDbSecretRotationLambda } from './lambda-creation';
import { getCurrentAccountId, getCurrentRegionName } from './util';

export type DbSecretRotationOutput = {
  dbSecretArn: pulumi.Output<string>;
};

export const setupDbSecretRotation = async (args: {
  vpc: awsx.ec2.Vpc;
  securityGroupId: pulumi.Output<string>;
  dbEndpoint: pulumi.Output<string>;
  dbPassword: pulumi.Output<string>;
}): Promise<DbSecretRotationOutput> => {
  const currentAccountId = getCurrentAccountId();
  const currentRegionName = getCurrentRegionName();

  const rotationLambda = await setupDbSecretRotationLambda({
    codePath: '../vendor/lambda-functions/rotate-docdb-credentials/dist',
    vpc: args.vpc,
    securityGroupId: args.securityGroupId,
  });

  const dbSecretString = pulumi
    .all([args.dbEndpoint, args.dbPassword])
    .apply(([host, password]) =>
      JSON.stringify({
        engine: 'mongo',
        host,
        username: dbUserName,
        password,
        ssl: true,
      }),
    );

  const dbSecret = new aws.secretsmanager.Secret('example-docdb-secret', {});

  new aws.secretsmanager.SecretVersion('docdb-secret-version', {
    secretId: dbSecret.id,
    secretString: dbSecretString,
  });

  const networkAndLogPolicy = new aws.iam.Policy('networkInterfacePolicy', {
    description: 'A policy for log and vpc access',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: [
            'ec2:CreateNetworkInterface',
            'ec2:DeleteNetworkInterface',
            'ec2:DescribeNetworkInterfaces',
            'ec2:DetachNetworkInterface',
          ],
          Resource: '*',
          Effect: 'Allow',
        },
      ],
    },
  });

  new aws.iam.RolePolicyAttachment('networkInterfacePolicy-attachment', {
    policyArn: networkAndLogPolicy.arn,
    role: rotationLambda.role.name,
  });

  const rotationLambdaPolicy = new aws.iam.Policy('rotationLambdaPolicy', {
    description: 'A secret rotation policy',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Condition: {
            StringEquals: {
              'secretsmanager:resource/AllowRotationLambdaArn': pulumi.interpolate`arn:aws:lambda:${currentRegionName}:${currentAccountId}:function:${rotationLambda.lambda.name}`,
            },
          },
          Effect: 'Allow',
          Action: [
            'secretsmanager:DescribeSecret',
            'secretsmanager:GetSecretValue',
            'secretsmanager:PutSecretValue',
            'secretsmanager:UpdateSecretVersionStage',
          ],
          Resource: [
            pulumi.interpolate`arn:aws:secretsmanager:${currentRegionName}:${currentAccountId}:secret:*`,
          ],
        },
        {
          Effect: 'Allow',
          Action: ['secretsmanager:GetRandomPassword'],
          Resource: '*',
        },
      ],
    },
  });

  new aws.iam.RolePolicyAttachment('rotationLambdaPolicy-attachment', {
    policyArn: rotationLambdaPolicy.arn,
    role: rotationLambda.role.name,
  });

  new aws.lambda.Permission('secretManager-execution-permission', {
    action: 'lambda:InvokeFunction',
    function: rotationLambda.lambda.name,
    principal: 'secretsmanager.amazonaws.com',
    sourceArn: dbSecret.arn,
  });

  new aws.secretsmanager.SecretRotation('example-docdb-secret-rotation', {
    secretId: dbSecret.id,
    rotationLambdaArn: rotationLambda.lambda.arn,
    rotationRules: {
      automaticallyAfterDays: 7,
    },
  });

  return { dbSecretArn: dbSecret.arn };
};
