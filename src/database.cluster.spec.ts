import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';
import {
  DatabaseClusterOutput,
  setupDatabaseCluster,
} from './database.cluster';
import {
  fakeGetAvailabilityZonesResult,
  MockedResource,
  mockResource,
} from './mock';

jest.mock('./config', () => {
  return { dbUserName: 'mockDbUserName', dbClusterInstanceCount: 3 };
});

const mocks: pulumi.runtime.Mocks = {
  newResource: (args: pulumi.runtime.MockResourceArgs): MockedResource => {
    if (args.type === 'random:index/randomPassword:RandomPassword') {
      return mockResource({
        id: 'mockPasswordId',
        inputs: args.inputs,
        state: { result: 'mockPasswordResult' },
      });
    }
    if (
      args.type === 'aws:docdb/cluster:Cluster' &&
      args.inputs.clusterIdentifier === 'example-docdb-cluster'
    ) {
      return mockResource({
        id: 'mockClusterId',
        inputs: args.inputs,
        state: { endpoint: 'mockClusterEndpoint' },
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

describe('databaseCluster', () => {
  let output: DatabaseClusterOutput;

  beforeAll(async () => {
    pulumi.runtime.setMocks(mocks);
    output = await setupDatabaseCluster(new awsx.ec2.Vpc('fakeVpc', {}));
  });

  describe('dbEndpoint', () => {
    it('should be the mocked cluster endpoint', (done) => {
      pulumi.all([output.dbEndpoint]).apply(([dbEndpoint]) => {
        try {
          expect(dbEndpoint).toBe('mockClusterEndpoint');
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });

  describe('dbPassword', () => {
    it('should be the mocked password result', (done) => {
      pulumi.all([output.dbPassword]).apply(([dbPassword]) => {
        try {
          expect(dbPassword).toBe('mockPasswordResult');
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});
