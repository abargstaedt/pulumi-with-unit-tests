import * as apigateway from '@pulumi/aws-apigateway';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';
import { setupBasicLambda } from './lambda-creation';

export type ApplicationOutput = {
  restApi: apigateway.RestAPI;
};

export const setupApplication = async (
  vpc: awsx.ec2.Vpc,
  securityGroupId: pulumi.Output<string>,
): Promise<ApplicationOutput> => {
  const testLambda = await setupBasicLambda({
    functionName: 'basicTestLambda',
    codePath: '../application/lambda-functions/test-lambda/dist',
    vpc,
    securityGroupId,
  });

  const restApi = new apigateway.RestAPI('example', {
    routes: [
      {
        path: '/',
        method: 'GET',
        eventHandler: testLambda.lambda,
      },
    ],
  });

  return {
    restApi,
  };
};
