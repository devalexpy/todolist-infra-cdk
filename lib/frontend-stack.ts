import { NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CloudFrontToS3 } from "@aws-solutions-constructs/aws-cloudfront-s3";
import { WafwebaclToCloudFront } from "@aws-solutions-constructs/aws-wafwebacl-cloudfront";

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

    /* new WafwebaclToCloudFront(this, "WafwebaclToCloudFrontPattern", {
      existingCloudFrontWebDistribution: cloudfrontS3.cloudFrontWebDistribution,
    }); */

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
