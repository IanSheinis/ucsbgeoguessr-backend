import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { CategoryRow, MetadataRow } from './types';

/**
 * Return items of an S3Key query
 */
async function queryByS3Key(s3Key: string, tableName: string, client: DynamoDBDocumentClient) {
    console.log('Fetching from: ', s3Key); // TODO add logger
    const response = await client.send(
        new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 's3Key = :key',
            ExpressionAttributeValues: { ':key': s3Key },
        }),
    );
    return response.Items ?? [];
}

export async function queryMetadata(
    s3Key: string,
    tableName: string,
    client: DynamoDBDocumentClient,
): Promise<MetadataRow[]> {
    return (await queryByS3Key(s3Key, tableName, client)) as MetadataRow[];
}

export async function queryCategory(
    s3Key: string,
    tableName: string,
    client: DynamoDBDocumentClient,
): Promise<CategoryRow[]> {
    return (await queryByS3Key(s3Key, tableName, client)) as CategoryRow[];
}

/**
 * Return a list of S3 keys given a category (excluding elements inside exclusionList)
 */
export async function queryAllS3Keys(
    exclusionList: string[],
    tableName: string,
    client: DynamoDBDocumentClient,
    category: string = 'all',
): Promise<string[]> {
    const response = await client.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: 'category-index',
            KeyConditionExpression: 'category = :cat',
            ExpressionAttributeValues: { ':cat': category },
            ProjectionExpression: 's3Key',
        }),
    );

    const excluded = new Set(exclusionList);
    const items = response.Items ?? [];
    return items.map((item) => item.s3Key as string).filter((key) => !excluded.has(key));
}

/**
 * Return S3 key for a category + index GSI
 */
export async function queryByCategoryIndex(
    category: string,
    index: number,
    tableName: string,
    client: DynamoDBDocumentClient,
) {
    const response = await client.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: 'category-index',
            KeyConditionExpression: 'category = :cat AND #idx = :idx',
            ExpressionAttributeNames: { '#idx': 'index' },
            ExpressionAttributeValues: { ':cat': category, ':idx': index },
            ProjectionExpression: 's3Key',
        }),
    );

    return (response.Items?.[0]?.s3Key as string) ?? null;
}
