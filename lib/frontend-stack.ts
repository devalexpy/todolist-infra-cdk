import { NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CloudFrontToS3 } from "@aws-solutions-constructs/aws-cloudfront-s3";
import { WafwebaclToCloudFront } from "@aws-solutions-constructs/aws-wafwebacl-cloudfront";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { CfnLoggingConfiguration } from "aws-cdk-lib/aws-wafv2";

interface objectType {
  [key: string]: string;
}
export class FrontendStack extends NestedStack {
  public readonly cloudfrontUrl: string;
  private websiteBucketName: string;
  private distributionId: string;
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props);

    const cloudfrontS3 = new CloudFrontToS3(this, "CloudFrontToS3Pattern", {
      bucketProps: {
        bucketName: "todolistapp-frontend",
        removalPolicy: RemovalPolicy.DESTROY,
      },
      insertHttpSecurityHeaders: false,
    });

    const cloudfrontWebACL = new WafwebaclToCloudFront(
      this,
      "WafwebaclToCloudFrontPattern",
      {
        existingCloudFrontWebDistribution:
          cloudfrontS3.cloudFrontWebDistribution,
      }
    );

    const cloudfrontWebACLLogGroup = new LogGroup(
      this,
      "cloudfrontWebACLLogGroup",
      {
        logGroupName: "cloudfrontWebACLLogGroup",
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );

    new CfnLoggingConfiguration(this, "cloudfrontWebACLLoggingConfiguration", {
      logDestinationConfigs: [cloudfrontWebACLLogGroup.logGroupArn],
      resourceArn: cloudfrontWebACL.webacl.attrArn,
    });

    this.cloudfrontUrl = cloudfrontS3.cloudFrontWebDistribution.domainName;
    this.websiteBucketName = cloudfrontS3.s3Bucket?.bucketName as string;
    this.distributionId = cloudfrontS3.cloudFrontWebDistribution.distributionId;
  }

  public getOutputs(): objectType {
    return {
      website_bucket_name: this.websiteBucketName,
      distribution_id: this.distributionId,
    };
  }
}
