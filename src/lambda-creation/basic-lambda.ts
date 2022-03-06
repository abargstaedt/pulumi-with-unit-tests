import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';

export type BasicLambdaOutput = {
  lambda: aws.lambda.Function;
  role: aws.iam.Role;
};

export const setupBasicLambda = async (args: {
  functionName: string;
  codePath: string;
  vpc: awsx.ec2.Vpc;
  securityGroupId: pulumi.Output<string>;
}): Promise<BasicLambdaOutput> => {
  const role = new aws.iam.Role(`${args.functionName}-iamForLambda`, {
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
    `${args.functionName}-AWSLambdaVPCAccessExecutionRole-attachment`,
    {
      policyArn:
        'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
      role: role.name,
    },
  );

  const lambda = new aws.lambda.Function(args.functionName, {
    code: new pulumi.asset.FileArchive(args.codePath),
    role: role.arn,
    handler: 'lambda_function.handler',
    runtime: 'nodejs14.x',
    timeout: 30,
    vpcConfig: {
      securityGroupIds: [args.securityGroupId],
      subnetIds: args.vpc.isolatedSubnetIds,
    },
  });

  return {
    lambda,
    role,
  };
};
