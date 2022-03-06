import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';

export type NetworkOutput = {
  vpc: awsx.ec2.Vpc;
  securityGroupId: pulumi.Output<string>;
  secretsManagerVpcEndpoint: aws.ec2.VpcEndpoint;
};

export const setupNetwork = async (): Promise<NetworkOutput> => {
  const vpc = new awsx.ec2.Vpc('example-db-vpc', {
    subnets: [{ type: 'isolated' }],
  });

  const securityGroupId = vpc.vpc.defaultSecurityGroupId;

  const secretsManagerVpcEndpoint = new aws.ec2.VpcEndpoint(
    'secretsManagerVpcEndpoint',
    {
      vpcId: vpc.id,
      serviceName: 'com.amazonaws.eu-central-1.secretsmanager',
      vpcEndpointType: 'Interface',
      securityGroupIds: [securityGroupId],
      privateDnsEnabled: true,
      subnetIds: vpc.isolatedSubnetIds,
    },
  );

  return {
    vpc,
    securityGroupId,
    secretsManagerVpcEndpoint,
  };
};
