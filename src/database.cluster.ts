import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import { dbClusterInstanceCount, dbUserName } from './config';

export type DatabaseClusterOutput = {
  dbEndpoint: pulumi.Output<string>;
  dbPassword: pulumi.Output<string>;
};

export const setupDatabaseCluster = async (
  vpc: awsx.ec2.Vpc,
): Promise<DatabaseClusterOutput> => {
  const dbPassword = new random.RandomPassword('example-docdb-password', {
    length: 16,
    special: true,
    overrideSpecial: '/@" ',
    keepers: { dbUserName },
  });

  const subnetGroup = new aws.docdb.SubnetGroup('example-docdb-subnet-group', {
    subnetIds: vpc.isolatedSubnetIds,
  });

  const dbCluster = new aws.docdb.Cluster('example-docdb-cluster', {
    clusterIdentifier: 'example-docdb-cluster',
    backupRetentionPeriod: 5,
    storageEncrypted: true,
    enabledCloudwatchLogsExports: ['audit'],
    preferredBackupWindow: '01:00-03:00',
    preferredMaintenanceWindow: 'wed:03:00-wed:05:00',
    finalSnapshotIdentifier: 'pre-delete-backup',
    dbSubnetGroupName: subnetGroup.name,

    // TODO: set to true for production
    deletionProtection: false,

    // TODO: set to false after testing
    applyImmediately: true,

    masterUsername: dbUserName,
    masterPassword: dbPassword.result,
  });

  const dbClusterInstances: aws.docdb.ClusterInstance[] = [];
  for (let i = 0; i < dbClusterInstanceCount; i++) {
    dbClusterInstances.push(
      new aws.docdb.ClusterInstance(`example-docdb-cluster-instance-${i}`, {
        clusterIdentifier: dbCluster.id,
        identifier: `example-docdb-cluster-instance-${i}`,
        instanceClass: 'db.t3.medium',

        // TODO: set to false after testing
        applyImmediately: true,
      }),
    );
  }

  return {
    dbEndpoint: dbCluster.endpoint,
    dbPassword: pulumi.secret(dbPassword.result),
  };
};
