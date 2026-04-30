import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDBStackConfigType, DynamoDBStackOutputs } from '../helpers/types';
import { AttributeType, Billing, TableV2 } from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBStack extends cdk.Stack implements DynamoDBStackOutputs {

  public readonly BucketTableName: string;

  constructor(scope: Construct, id: string, props: DynamoDBStackConfigType) {
    super(scope, id, props);

    // Table w/ metadata per image
    const bucketTable = new TableV2(this, 'S3ObjectsTable', {   
      tableName: `${props.environment}-s3-objects`,                                 

      partitionKey: { name: 's3Key', type: AttributeType.STRING },
      billing: Billing.onDemand(),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI to query randomly by category (ddb[i % category.size])
    bucketTable.addGlobalSecondaryIndex({
      indexName: 'by-category-index',
      partitionKey: { name: 'category', type: AttributeType.STRING },
      sortKey: { name: 'index', type: AttributeType.NUMBER }, 
    });

    // GSI to query specificaly ALL images randomly
    bucketTable.addGlobalSecondaryIndex({
      indexName: 'by-category-index',
      partitionKey: { name: 'global_index', type: AttributeType.NUMBER },
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