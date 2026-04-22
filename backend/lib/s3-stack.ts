import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3StackConfigType, S3StackOutputs } from '../helpers/types';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { S3StackConfig } from '../helpers/config';

/**
 * S3 Stack
 * 
 * Create the object oriented storage which will allow UCSBGeoguesser to store images w/ metadata in
 * S3StackOutputs is the outputs (exported variables) that will go to other stacks/files
 */
export class S3Stack extends cdk.Stack implements S3StackOutputs {
  public readonly S3_BUCKET_NAME: string;
  public readonly S3_BUCKET_ARN: string;

  constructor(scope: Construct, id: string, props: S3StackConfigType) {
    super(scope, id, props);
    // Public image bucket (game image assets do not need to be private)
    const bucket = new s3.Bucket(this, 'ImageBucket', {
      bucketName: `ucsb-geoguesser-images-${props?.environment}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,       // Any new object has to private for security reasons
        ignorePublicAcls: true,      // Ignore existing public ACLs (recommended)
        blockPublicPolicy: false,    // Allow public policies
        restrictPublicBuckets: false // Allow public access beyond your account
      }),
      cors: [
      {
        allowedMethods: [
          s3.HttpMethods.GET, // Add other methods like POST, PUT if needed
        ],
        allowedOrigins: ['*'], // Or specify like ['https://example.com']
        allowedHeaders: ['*'], // Or specify specific headers
      },
      ],
    });

    // Attach the public read policy
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [bucket.arnForObjects('*')],
      principals: [new iam.AnyPrincipal()],
    }));

    this.S3_BUCKET_NAME = bucket.bucketName;
    this.S3_BUCKET_ARN = bucket.bucketArn;

    // Put images from assets/images into s3 bucket
    const imgFilePath = "../assets/images";
    const bucketDeployment = new s3deploy.BucketDeployment(this, `deployed-images-${S3StackConfig.environment}`, {
      sources: [s3deploy.Source.asset(imgFilePath)],
      destinationBucket: bucket,
      memoryLimit: 1024, // Need more memory for images
      ephemeralStorageSize: cdk.Size.gibibytes(2), // Amount of images to upload to s3, if it exceeds 2 GB, how
      exclude: ['images.ts'],
      outputObjectKeys: true // Will need this when assigning metadata
    })

    

    new cdk.CfnOutput(this, "ImageS3BucketName", {
      value: this.S3_BUCKET_NAME,
      exportName: `${props.environment}-image-bucket-name`,
      description: `Image bucket name for ${props.environment} environment`,
    });

    new cdk.CfnOutput(this, "ImageS3BucketARN", {
      value: this.S3_BUCKET_ARN,
      exportName: `${props.environment}-image-bucket-arn`,
      description: `Image bucket ARN for ${props.environment} environment`,
    });

  }


}
