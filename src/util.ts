import * as aws from '@pulumi/aws';

export const getCurrentAccountId = async (): Promise<string> => {
  const current = await aws.getCallerIdentity({});
  return current.accountId;
};

export const getCurrentRegionName = async (): Promise<string> => {
  const currentRegion = await aws.getRegion();
  return currentRegion.name;
};
