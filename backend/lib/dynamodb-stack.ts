import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDBStackConfigType, DynamoDBStackOutputs } from '../helpers/types';
import { AttributeType, Billing, TableV2 } from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBStack extends cdk.Stack implements DynamoDBStackOutputs {

  public readonly BucketTableName: string;

  constructor(scope: Construct, id: string, props: DynamoDBStackConfigType) {
    super(scope, id, props);

    // In case we want faster lookups we switch to dynamodb instead of s3
    const bucketTable = new TableV2(this, 'S3ObjectsTable', {   
      tableName: `${props.environment}-s3-objects`,                                 

      partitionKey: { name: 's3Key', type: AttributeType.STRING },
      sortKey:      { name: 'category', type: AttributeType.STRING },
      billing: Billing.onDemand(),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI to query objects by category
    bucketTable.addGlobalSecondaryIndex({
      indexName: 'by-category',
      partitionKey: { name: 'category', type: AttributeType.STRING },   
      sortKey:      { name: 's3Key',    type: AttributeType.STRING },
    });

    this.BucketTableName = bucketTable.tableName;  

    new cdk.CfnOutput(this, "BucketTableName", {
      value: bucketTable.tableName,
      exportName: `${props.environment}-BucketTableName`,
      description: `Image bucket table name for ${props.environment} environment`,
    });
    new cdk.CfnOutput(this, "BucketTableARN", {
      value: bucketTable.tableArn,
      exportName: `${props.environment}-BucketTableArn`,
      description: `Image bucket table arn for ${props.environment} environment`,
    });
  }

}