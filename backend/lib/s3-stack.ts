import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3StackConfigType, S3StackOutputs } from '../helpers/types';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { S3StackConfig } from '../helpers/config';
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';

/**
 * S3 Stack
 *
 * Create the object oriented storage which will allow UCSBGeoguesser to store images w/ metadata in
 * S3StackOutputs is the outputs (exported variables) that will go to other stacks/files
 *
 * S3 + Cloudfront w/ OAC:
 * https://www.youtube.com/watch?v=GB_R9S6XJqs
 */
export class S3Stack extends cdk.Stack implements S3StackOutputs {
    public readonly imageBucket: s3.IBucket;

    constructor(scope: Construct, id: string, props: S3StackConfigType) {
        super(scope, id, props);
        // Image bucket
        const bucket = new s3.Bucket(this, 'ImageBucket', {
            bucketName: `ucsb-geoguesser-images-${props?.environment}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        const dist = new Distribution(this, 'Distribution', {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                // S3BucketOrigin construct with OAC functionality
                origin: S3BucketOrigin.withOriginAccessControl(bucket, {
                    originShieldRegion: 'us-west-2', // Shield not available in us-west-1
                }),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
        });

        this.imageBucket = bucket;

        // Put images from assets/images into s3 bucket
        const imgFilePath = '../assets/images';
        new s3deploy.BucketDeployment(this, `deployed-images-${S3StackConfig.environment}`, {
            sources: [s3deploy.Source.asset(imgFilePath)],
            destinationBucket: bucket,
            memoryLimit: 1024, // Need more memory for images
            ephemeralStorageSize: cdk.Size.gibibytes(2), // Amount of images to upload to s3, if it exceeds 2 GB, how
            outputObjectKeys: true, // Will need this when assigning metadata
        });

        new cdk.CfnOutput(this, 'CloudFrontUrl', {
            value: `https://${dist.distributionDomainName}`,
            exportName: `${props.environment}-cloudfront-url`,
            description: `CloudFront distribution URL for ${props.environment} environment`,
        });
    }
}
