import { NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaToDynamoDB } from "@aws-solutions-constructs/aws-lambda-dynamodb";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { CognitoToApiGatewayToLambda } from "@aws-solutions-constructs/aws-cognito-apigateway-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { WafwebaclToApiGateway } from "@aws-solutions-constructs/aws-wafwebacl-apigateway";
import { DefaultWafwebaclProps } from "@aws-solutions-constructs/core/lib/waf-defaults";

interface BackendStackProps extends NestedStackProps {
  readonly cloudfrontUrl: string;
}
interface objectType {
  [key: string]: string;
}
export class BackendStack extends NestedStack {
  private cognitoUrl: string;
  private apiUrl: string;
  private lambdaBucket: string;
  private lambdaFunctionName: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);
    const LambdaDynamo = new LambdaToDynamoDB(this, "LambdaToDynamoDBPattern", {
      dynamoTableProps: {
        partitionKey: { name: "user_id", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "task_id", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        tableName: "todolist-table",
        removalPolicy: RemovalPolicy.DESTROY,
      },
      lambdaFunctionProps: {
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "index.lambda_handler",
        code: lambda.Code.fromInline(`
              import json
                def lambda_handler(event, context):
                    return {
                        'statusCode': 200,
                        'body': json.dumps('Hello from Lambda!')
                    }
              `),
        functionName: "lambda-crud",
      },
      tableEnvironmentVariableName: "TABLE_NAME",
    });

    const cognitoApigwLambda = new CognitoToApiGatewayToLambda(
      this,
      "CognitoToApiGatewayToLambdaPattern",
      {
        existingLambdaObj: LambdaDynamo.lambdaFunction,
        apiGatewayProps: {
          restApiName: "todolist-api",
          description: "API for the todolist app",
          defaultCorsPreflightOptions: {
            allowOrigins: ["*"],
            allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowHeaders: [
              "Content-Type",
              "X-Amz-Date",
              "Authorization",
              "X-Api-Key",
              "X-Amz-Security-Token",
            ],
          },
        },
        cognitoUserPoolProps: {
          userPoolName: "todolist-user-pool",
          autoVerify: { email: true },
          passwordPolicy: {
            minLength: 6,
            requireLowercase: false,
            requireDigits: false,
            requireUppercase: false,
            requireSymbols: false,
          },
          signInAliases: {
            username: false,
            email: true,
          },
          signInCaseSensitive: false,
          selfSignUpEnabled: true,
        },
        cognitoUserPoolClientProps: {
          userPoolClientName: "todolist-user-pool-client",
          oAuth: {
            flows: {
              implicitCodeGrant: true,
            },
            scopes: [
              {
                scopeName: "email",
                scopeDescription: "Access to your email address",
              },
              { scopeName: "openid", scopeDescription: "OpenID Connect flows" },
              {
                scopeName: "profile",
                scopeDescription: "Access to your username",
              },
            ],
            callbackUrls: [`https://${props.cloudfrontUrl}`],
          },
        },
      }
    );
    const cognitoDomain = cognitoApigwLambda.userPool.addDomain(
      "todolist-user-pool-domain",
      {
        cognitoDomain: {
          domainPrefix: "todolist-user-pool-domain",
        },
      }
    );
    const lambdaBucket = new s3.Bucket(this, "lambda-bucket", {
      bucketName: "todolistapp-lambda",
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const apigatewayWebACL = new WafwebaclToApiGateway(
      this,
      "WafwebaclToApiGatewayPattern",
      {
        existingApiGatewayInterface: cognitoApigwLambda.apiGateway,
      }
    );

    apigatewayWebACL.webacl.visibilityConfig = {
      cloudWatchMetricsEnabled: true,
      metricName: "apigatewayWebACL",
      sampledRequestsEnabled: true,
    };

    this.cognitoUrl = `https://${cognitoDomain.domainName}.auth.${process.env.CDK_DEFAULT_REGION}.amazoncognito.com/login?response_type=token&client_id=${cognitoApigwLambda.userPoolClient.userPoolClientId}&redirect_uri=https://${props.cloudfrontUrl}`;

    this.apiUrl = `https://${cognitoApigwLambda.apiGateway.restApiId}.execute-api.${process.env.CDK_DEFAULT_REGION}.amazonaws.com/${cognitoApigwLambda.apiGateway.deploymentStage.stageName}`;

    this.lambdaBucket = lambdaBucket.bucketName;
    this.lambdaFunctionName = LambdaDynamo.lambdaFunction.functionName;
  }

  public getOutputs(): objectType {
    return {
      cognito_url: this.cognitoUrl,
      api_url: this.apiUrl,
      lambda_bucket: this.lambdaBucket,
      lambda_function_name: this.lambdaFunctionName,
    };
  }
}
