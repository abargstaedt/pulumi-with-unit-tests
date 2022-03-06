import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';
import {
  fakeGetAvailabilityZonesResult,
  MockedResource,
  mockResource,
} from '../mock';
import {
  DbSecretRotationLambdaOutput,
  setupDbSecretRotationLambda,
} from './database.secretRotation.lambda';

const mocks: pulumi.runtime.Mocks = {
  newResource: (args: pulumi.runtime.MockResourceArgs): MockedResource => {
    if (
      args.type === 'aws:ec2/subnet:Subnet' &&
      args.inputs.tags?.type === 'isolated'
    ) {
      return mockResource({
        id: 'mockIsolatedSubnetId',
        inputs: args.inputs,
      });
    }
    if (args.type === 'aws:iam/role:Role') {
      return mockResource({
        id: 'mockRoleId',
        state: { arn: 'mockRoleArn' },
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

describe('dbSecretRotationLambda', () => {
  let output: DbSecretRotationLambdaOutput;

  beforeAll(async () => {
    pulumi.runtime.setMocks(mocks);
    output = await setupDbSecretRotationLambda({
      codePath: 'fakeCodePath',
      vpc: new awsx.ec2.Vpc('fakeVpc', { subnets: [{ type: 'isolated' }] }),
      securityGroupId: pulumi.output('fakeSecurityGroupId'),
    });
  });

  describe('lambda', () => {
    it('should be created with the expected inputs', (done) => {
      pulumi
        .all([
          output.lambda.urn,
          output.lambda.code,
          output.lambda.role,
          output.lambda.handler,
          output.lambda.runtime,
          output.lambda.timeout,
          output.lambda.vpcConfig,
          output.lambda.environment,
        ])
        .apply(
          ([
            urn,
            code,
            role,
            handler,
            runtime,
            timeout,
            vpcConfig,
            environment,
          ]) => {
            try {
              expect(urn).toBeDefined();
              expect((<pulumi.asset.FileArchive>code).path).toBe(
                'fakeCodePath',
              );
              expect(role).toBe('mockRoleArn');
              expect(handler).toBe('lambda_function.lambda_handler');
              expect(runtime).toBe('python3.7');
              expect(timeout).toBe(30);
              expect(vpcConfig).toMatchObject({
                securityGroupIds: ['fakeSecurityGroupId'],
                subnetIds: ['mockIsolatedSubnetId'],
              });
              expect(environment?.variables).toMatchObject({
                EXCLUDE_CHARACTERS: '/@"\'\\',
                SECRETS_MANAGER_ENDPOINT:
                  'https://secretsmanager.eu-central-1.amazonaws.com',
              });
              done();
            } catch (error) {
              done(error);
            }
          },
        );
    });
  });

  describe('role', () => {
    it('should be created with the expected assumeRolePolicy', (done) => {
      pulumi
        .all([output.role.urn, output.role.assumeRolePolicy])
        .apply(([urn, assumeRolePolicy]) => {
          try {
            expect(urn).toBeDefined();
            expect(JSON.parse(assumeRolePolicy)).toMatchObject({
              Version: '2012-10-17',
              Statement: [
                {
                  Action: 'sts:AssumeRole',
                  Principal: {
                    Service: 'lambda.amazonaws.com',
                  },
                  Effect: 'Allow',
                  Sid: '',
                },
              ],
            });
            done();
          } catch (error) {
            done(error);
          }
        });
    });
  });
});
