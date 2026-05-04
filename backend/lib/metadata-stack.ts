import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaEnvVariables, MetadataStackConfigType, MetadataStackOutputs } from '../helpers/types';
import LambdaBuilder from '../helpers/lambdaBuilder';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Trigger } from 'aws-cdk-lib/triggers';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';

/**
 * MetadataStack
 * 
 * Deploys and always invokes a function to update metadata in ddb
 * - deployMetadataTable: Adds image metadata to DDB
 */
export class MetadataStack extends cdk.Stack implements MetadataStackOutputs {
    constructor(scope: Construct, id: string, props: MetadataStackConfigType) {
        super(scope, id, props);
        const metadataTableARN = cdk.Fn.importValue( `${props.environment}-MetadataTableArn`);
        const metadataTableName = cdk.Fn.importValue( `${props.environment}-MetadataTableName`);
        this.updateMetadataTable(props, metadataTableName, metadataTableARN);
    }



  private updateMetadataTable(
    props: MetadataStackConfigType,
    metadataTableName: string,
    metadataTableARN: string,    
  ) {

    const lambdaEnv: LambdaEnvVariables = {
      REGION: props.region,
      LOG_LEVEL: "debug",
      METADATA_TABLE_NAME: metadataTableName,    
    };

    const lambdaBuilder = new LambdaBuilder(
      this,
      `deployMetadataTable-${props.environment}`,
      {
        fileName: "metadata/dynamodb.ts",
        timeout: cdk.Duration.seconds(600),
      },
    )
      .setEnv(lambdaEnv)

      // DynamoDB permissions (table + GSI)
      .addPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:BatchWriteItem",
            "dynamodb:Scan",    
          ],
          resources: [
            metadataTableARN,
            `${metadataTableARN}/index/by-category`,
          ],
        })
      );

    const lambda = lambdaBuilder.build();

    /* Invoke metadata lambda on every deployment, uses timestamp trick to force invocation on each deployment
    * AwsCustomResource is the right choice here, 
    * Trigger only re-invokes when lambda code changes 
    * EventBridge does not fail the cloudformation deployment on lambda error
    * See: https://stackoverflow.com/questions/76656702/how-can-i-configure-amazon-cdk-to-trigger-a-lambda-function-after-deployment
    */
    const runTimestamp = Date.now().toString();
    const invokeTableLambda = new AwsCustomResource(this, `InvokeMetadataTableLambda-${props.environment}`, {
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: lambda.functionName,
          InvocationType: 'RequestResponse', // Fail deployment if lambda fails
          Payload: JSON.stringify({}),
        },
        physicalResourceId: PhysicalResourceId.of(`${metadataTableName}-table-init-${runTimestamp}`), // Timestamp to force invoke
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          effect: iam.Effect.ALLOW,
          resources: [lambda.functionArn],
        }),
    ]),
    });

  }

}