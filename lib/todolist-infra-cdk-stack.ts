import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { BackendStack } from "./backend-stack";
import { FrontendStack } from "./frontend-stack";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class TodolistInfraCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const frontendStack = new FrontendStack(this, "FrontendStack");
    const backendStack = new BackendStack(this, "BackendStack", {
      cloudfrontUrl: frontendStack.cloudfrontUrl,
    });

    const outputs = {
      ...frontendStack.getOutputs(),
      ...backendStack.getOutputs(),
    };

    Object.keys(outputs).forEach((key) => {
      new ssm.StringParameter(this, `${key}-param`, {
        parameterName: key,
        stringValue: outputs[key],
      });
    });
  }
}
