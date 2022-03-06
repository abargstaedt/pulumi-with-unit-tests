import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';
import { ApplicationOutput, setupApplication } from './application';
import {
  fakeGetAvailabilityZonesResult,
  MockedResource,
  mockResource,
} from './mock';

const mocks: pulumi.runtime.Mocks = {
  newResource: (args: pulumi.runtime.MockResourceArgs): MockedResource => {
    return mockResource({ inputs: args.inputs });
  },
  call: (args: pulumi.runtime.MockCallArgs): Record<string, any> => {
    if (args.token === 'aws:index/getAvailabilityZones:getAvailabilityZones')
      return fakeGetAvailabilityZonesResult();
    return args;
  },
};

describe('application', () => {
  let output: ApplicationOutput;

  beforeAll(async () => {
    pulumi.runtime.setMocks(mocks);
    output = await setupApplication(
      new awsx.ec2.Vpc('fakeVpc', {}),
      pulumi.output('fakeSecurityGroupId'),
    );
  });

  describe('restApi', () => {
    it('should have an urn', (done) => {
      pulumi.all([output.restApi.urn]).apply(([urn]) => {
        try {
          expect(urn).toBeDefined();
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});
