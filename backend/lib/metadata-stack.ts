import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ImageConfig, LambdaEnvVariables, MetadataStackConfigType, MetadataStackOutputs } from '../helpers/types';
import { imgConfig } from '../../assets/metadata/images';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import LambdaBuilder from '../helpers/lambdaBuilder';
import * as iam from 'aws-cdk-lib/aws-iam';
import { MetadataStackConfig } from '../helpers/config';
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb';

/**
 * MetadataStack
 * 
 * Deploys and always invokes metadata lambda function and update table function
 * - metadata function: Adds metadata to s3 objects
 * - update table function: Adds s3 objects to DDB
 */
export class MetadataStack extends cdk.Stack implements MetadataStackOutputs {
    constructor(scope: Construct, id: string, props: MetadataStackConfigType) {
        super(scope, id, props);
        const imageBucketName = cdk.Fn.importValue(`${props.environment}-image-bucket-name`);
        const imageBucketARN = cdk.Fn.importValue(`${props.environment}-image-bucket-arn`);
        const bucketTableARN = cdk.Fn.importValue( `${props.environment}-BucketTableArn`);
        const bucketTableName = cdk.Fn.importValue( `${props.environment}-BucketTableName`);
        const invokeMetadata = this.attatchMetadata(props, imgConfig, imageBucketName, imageBucketARN);
        this.updateBucketTable(props, bucketTableName, bucketTableARN, invokeMetadata);
    }


  /**
   * Lambda Function to attatch metadata (Invoked on each deployment)
   */
  private attatchMetadata(
    props: MetadataStackConfigType,
    metadata: ImageConfig[], 
    bucketName: string,
    bucketArn: string
  ): AwsCustomResource {

    const metadataLambdaEnvVars: LambdaEnvVariables = {
      REGION: props.region,
      LOG_LEVEL: "debug", // TODO change to be from config
      S3_BUCKET_NAME: bucketName,
    }
    // TODO create shared lambda layer
    const metadataLambdaBuilder = new LambdaBuilder(
      this,
      `deployMetaData-${props.environment}`,
      {
        fileName: "imgbucket/init.ts", 
        timeout: cdk.Duration.seconds(600),
      },
    )
      .setEnv(metadataLambdaEnvVars)
      .addPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:GetObject", "s3:PutObject"],
          resources: [`${bucketArn}/*`],
        }),
      )
      .addPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:ListBucket"],
          resources: [bucketArn],  
        }),
      );

    const metadataLambda = metadataLambdaBuilder.build();

    // Use a timestamp to always invoke deployment (previously cdk wasn't detecting if metadata changed)
    const runTimestamp = Date.now().toString();

    const invokeMetadata = new AwsCustomResource(this, `InvokeMetadata-${props.environment}`, {
    onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
        FunctionName: metadataLambda.functionName,
        InvocationType: 'RequestResponse',
        },
        // Changing this ID forces a re-run
        physicalResourceId: PhysicalResourceId.of(`${bucketName}-metadata-${runTimestamp}`),
    },
    // You MUST add onUpdate if you want it to run during stack updates
    onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
        FunctionName: metadataLambda.functionName,
        InvocationType: 'RequestResponse',
        },
        physicalResourceId: PhysicalResourceId.of(`${bucketName}-metadata-${runTimestamp}`),
    },
    policy: AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        effect: iam.Effect.ALLOW,
        resources: [metadataLambda.functionArn],
        })
    ]),
    });

    // Ensure the invocation happens after the bucket deployment and Lambda creation
    invokeMetadata.node.addDependency(metadataLambda);

    return invokeMetadata;
  }

  private updateBucketTable(
    props: MetadataStackConfigType,
    bucketTableName: string,
    bucketTableARN: string,    
    precedingResource: AwsCustomResource       
  ) {
    const imageBucketName = cdk.Fn.importValue(`${props.environment}-image-bucket-name`);
    const imageBucketARN = cdk.Fn.importValue(`${props.environment}-image-bucket-arn`);

    const lambdaEnv: LambdaEnvVariables = {
      REGION: props.region,
      LOG_LEVEL: "debug",
      S3_BUCKET_NAME: imageBucketName,
      BUCKET_TABLE_NAME: bucketTableName,    
    };

    const lambdaBuilder = new LambdaBuilder(
      this,
      `deployBucketTable-${props.environment}`,
      {
        fileName: "imgbucket/dynamodb.ts",
        timeout: cdk.Duration.seconds(600),
      },
    )
      .setEnv(lambdaEnv)

      // S3 permissions
      .addPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:ListBucket"],
          resources: [imageBucketARN],
        })
      )
      .addPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`${imageBucketARN}/*`],
        })
      )

      // DynamoDB permissions (table + GSI)
      .addPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:PutItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:UpdateItem",
            "dynamodb:Scan",    
            "dynamodb:DeleteItem"
          ],
          resources: [
            bucketTableARN,
            `${bucketTableARN}/index/by-category`,
          ],
        })
      );

    const lambda = lambdaBuilder.build();

    // Use a timestamp to always invoke deployment (previously cdk wasn't detecting if metadata changed)
    const runTimestamp = Date.now().toString();
    const invokeTableLambda = new AwsCustomResource(this, `InvokeBucketTableLambda-${props.environment}`, {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: lambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify({}),
        },
        // Use a timestamp to ensure this is "different" every time you run cdk deploy
        physicalResourceId: PhysicalResourceId.of(`${imageBucketName}-table-init-${runTimestamp}`),
      },
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: lambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify({}),
        },
        physicalResourceId: PhysicalResourceId.of(`${imageBucketName}-table-init-${runTimestamp}`),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          effect: iam.Effect.ALLOW,
          resources: [lambda.functionArn],
        }),
      ]),
    });

    invokeTableLambda.node.addDependency(precedingResource);
  }

}