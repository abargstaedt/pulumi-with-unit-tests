import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';
import {
  DbSecretRotationOutput,
  setupDbSecretRotation,
} from './database.secretRotation';
import {
  fakeGetAvailabilityZonesResult,
  MockedResource,
  mockResource,
} from './mock';

jest.mock('./config', () => {
  return { dbUserName: 'mockDbUserName' };
});

jest.mock('./util', () => {
  return {
    getCurrentAccountId: () => 'mockAccountId',
    getCurrentRegionName: () => 'mockRegionName',
  };
});

const mocks: pulumi.runtime.Mocks = {
  newResource: (args: pulumi.runtime.MockResourceArgs): MockedResource => {
    if (args.type === 'aws:secretsmanager/secret:Secret') {
      return mockResource({
        id: 'mockSecretId',
        state: { arn: 'mockSecretArn' },
      });
    }
    return mockResource({ inputs: args.inputs });
  },
  call: (args: pulumi.runtime.MockCallArgs): Record<string, any> => {
    if (args.token === 'aws:index/getAvailabilityZones:getAvailabilityZones')
      return fakeGetAvailabilityZonesResult();
    return args;
  },
};

describe('dbSecretRotation', () => {
  let output: DbSecretRotationOutput;

  beforeAll(async () => {
    pulumi.runtime.setMocks(mocks);
    output = await setupDbSecretRotation({
      vpc: new awsx.ec2.Vpc('fakeVpc', {}),
      securityGroupId: pulumi.output('fakeSecurityGroupId'),
      dbEndpoint: pulumi.output('fakeSecurityGroupId'),
      dbPassword: pulumi.output('fakeSecurityGroupId'),
    });
  });

  describe('dbSecretArn', () => {
    it('should be "mockSecretArn"', (done) => {
      pulumi.all([output.dbSecretArn]).apply(([dbSecretArn]) => {
        try {
          expect(dbSecretArn).toBe('mockSecretArn');
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});
