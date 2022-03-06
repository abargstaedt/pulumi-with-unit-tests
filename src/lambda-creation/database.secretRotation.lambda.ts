import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';

export type DbSecretRotationLambdaOutput = {
  lambda: aws.lambda.Function;
  role: aws.iam.Role;
};

export const setupDbSecretRotationLambda = async (args: {
  codePath: string;
  vpc: awsx.ec2.Vpc;
  securityGroupId: pulumi.Output<string>;
}): Promise<DbSecretRotationLambdaOutput> => {
  const role = new aws.iam.Role('rotate-docdb-credentials-iamForLambda', {
    assumeRolePolicy: `{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  }
  `,
  });

  new aws.iam.RolePolicyAttachment(
    'rotate-docdb-credentials-AWSLambdaBasicExecutionRole-attachment',
    {
      policyArn:
        'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      role: role.name,
    },
  );

  new aws.iam.RolePolicyAttachment(
    'rotate-docdb-credentials-AWSLambdaVPCAccessExecutionRole-attachment',
    {
      policyArn:
        'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
      role: role.name,
    },
  );

  const lambda = new aws.lambda.Function('rotate-docdb-credentials', {
    code: new pulumi.asset.FileArchive(args.codePath),
    role: role.arn,
    handler: 'lambda_function.lambda_handler',
    runtime: 'python3.7',
    timeout: 30,
    vpcConfig: {
      securityGroupIds: [args.securityGroupId],
      subnetIds: args.vpc.isolatedSubnetIds,
    },
    environment: {
      variables: {
        EXCLUDE_CHARACTERS: '/@"\'\\',
        SECRETS_MANAGER_ENDPOINT:
          'https://secretsmanager.eu-central-1.amazonaws.com',
      },
    },
  });

  return {
    lambda,
    role,
  };
};
