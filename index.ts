import { setupApplication } from './src/application';
import { setupDatabaseCluster } from './src/database.cluster';
import { setupDbSecretRotation } from './src/database.secretRotation';
import { setupNetwork } from './src/network';

// This index.ts is the main starting point for Pulumi
// It will set up our infrastructure using the contents of 'src'
const setupProject = async (): Promise<void> => {
  const { vpc, securityGroupId } = await setupNetwork();

  const { dbEndpoint, dbPassword } = await setupDatabaseCluster(vpc);

  await setupDbSecretRotation({
    vpc,
    securityGroupId,
    dbEndpoint,
    dbPassword,
  });

  await setupApplication(vpc, securityGroupId);
};

setupProject();
