import { GetAvailabilityZonesResult } from '@pulumi/aws';

export type MockedResource = {
  id: string;
  state: Record<string, any>;
};

export const mockResource = (args: {
  id?: string;
  inputs?: any;
  state?: Record<string, any>;
}): MockedResource => {
  return {
    id: args.id || args.inputs?.name + '_id',
    state: { ...args.inputs, ...args.state },
  };
};

export const fakeGetAvailabilityZonesResult = (
  args?: Partial<GetAvailabilityZonesResult>,
): GetAvailabilityZonesResult => {
  return {
    id: args?.id || 'fakeId',
    groupNames: args?.groupNames || ['fakeGroup'],
    names: args?.names || ['fakeName'],
    zoneIds: args?.zoneIds || ['fakeZone'],
  };
};
