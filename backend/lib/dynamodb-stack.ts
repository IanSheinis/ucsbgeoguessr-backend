import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  DynamoDBStackConfigType,
  DynamoDBStackOutputs,
} from "../helpers/types";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";

/**
 * DynamoDB that stores metadata
 *
 * Schema:
 *  PK: pk 's3Key' sk 'category' - Lookup by image name
 *  GSI: pk 'category' sk 'index' - Lookup by Category, index for random lookups
 */
export class DynamoDBStack extends cdk.Stack implements DynamoDBStackOutputs {
  public readonly metadataTable: TableV2;

  constructor(scope: Construct, id: string, props: DynamoDBStackConfigType) {
    super(scope, id, props);

    // Table w/ metadata per image
    const metadataTable = new TableV2(this, "MetadataTable", {
      tableName: `metadata-table-${props.environment}`,

      partitionKey: { name: "s3Key", type: AttributeType.STRING },
      sortKey: { name: "category", type: AttributeType.STRING },
      billing: Billing.onDemand(),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI to query randomly by category (ddb[i % category.size])
    metadataTable.addGlobalSecondaryIndex({
      indexName: "category-index",
      partitionKey: { name: "category", type: AttributeType.STRING },
      sortKey: { name: "index", type: AttributeType.NUMBER },
    });

    this.metadataTable = metadataTable;
  }
}
