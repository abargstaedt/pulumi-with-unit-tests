import * as pulumi from '@pulumi/pulumi';
import {
  fakeGetAvailabilityZonesResult,
  MockedResource,
  mockResource,
} from './mock';
import { NetworkOutput, setupNetwork } from './network';

const mocks: pulumi.runtime.Mocks = {
  newResource: (args: pulumi.runtime.MockResourceArgs): MockedResource => {
    if (args.type === 'aws:ec2/vpc:Vpc') {
      return mockResource({
        id: 'mockVpcId',
        inputs: args.inputs,
        state: {
          defaultSecurityGroupId: 'mockVpc.defaultSecurityGroupId',
        },
      });
    }
    if (
      args.type === 'aws:ec2/subnet:Subnet' &&
      args.inputs.vpcId === 'mockVpcId' &&
      args.inputs.tags?.type === 'isolated'
    ) {
      return mockResource({
        id: 'mockIsolatedSubnetId',
        state: args.inputs,
      });
    }
    return mockResource({
      inputs: args.inputs,
    });
  },
  call: (args: pulumi.runtime.MockCallArgs): Record<string, any> => {
    if (args.token === 'aws:index/getAvailabilityZones:getAvailabilityZones')
      return fakeGetAvailabilityZonesResult();
    return args;
  },
};

describe('network', () => {
  let output: NetworkOutput;

  beforeAll(async () => {
    pulumi.runtime.setMocks(mocks);
    output = await setupNetwork();
  });

  describe('vpc', () => {
    it('should be created with the expected inputs', (done) => {
      pulumi
        .all([
          output.vpc.urn,
          output.vpc.isolatedSubnets,
          output.vpc.isolatedSubnetIds,
        ])
        .apply(([urn, isolatedSubnets, isolatedSubnetIds]) => {
          try {
            expect(urn).toBeDefined();
            expect(isolatedSubnets).toHaveLength(1);
            expect(isolatedSubnetIds).toEqual(['mockIsolatedSubnetId']);
            done();
          } catch (error) {
            done(error);
          }
        });
    });
  });

  describe('secretsManagerVpcEndpoint', () => {
    it('should be created with the expected inputs', (done) => {
      pulumi
        .all([
          output.secretsManagerVpcEndpoint.urn,
          output.secretsManagerVpcEndpoint.vpcId,
          output.secretsManagerVpcEndpoint.serviceName,
          output.secretsManagerVpcEndpoint.vpcEndpointType,
          output.secretsManagerVpcEndpoint.privateDnsEnabled,
          output.secretsManagerVpcEndpoint.subnetIds,
          output.secretsManagerVpcEndpoint.securityGroupIds,
        ])
        .apply(
          ([
            urn,
            vpcId,
            serviceName,
            vpcEndpointType,
            privateDnsEnabled,
            subnetIds,
            securityGroupIds,
          ]) => {
            try {
              expect(urn).toBeDefined();
              expect(vpcId).toBe('mockVpcId');
              expect(serviceName).toBe(
                'com.amazonaws.eu-central-1.secretsmanager',
              );
              expect(vpcEndpointType).toBe('Interface');
              expect(privateDnsEnabled).toBe(true);
              expect(subnetIds).toEqual(['mockIsolatedSubnetId']);
              expect(securityGroupIds).toEqual([
                'mockVpc.defaultSecurityGroupId',
              ]);
              done();
            } catch (error) {
              done(error);
            }
          },
        );
    });
  });
});
