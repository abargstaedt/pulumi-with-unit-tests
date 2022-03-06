import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();

export const dbUserName = config.require('docdb-master-user-name');

export const dbClusterInstanceCount =
  config.getNumber('docdb-cluster-instance-count') || 1;
