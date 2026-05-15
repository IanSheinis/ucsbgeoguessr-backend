/**
 * Add all metadata to DDB Metadata Table
 * - First delete all rows (This is to make sure if updating specific image metadata, previous iteration doesn't exist)
 * - Next add all rows
 *  - For each category in an image, add an additional row
 *  - An additional 'all' category to randomly index any image
 *  - Additional rows to get category sizes - (s3Key: category, size: size)
 *
 * DDB schema
 * [
 * Regular row:
 * s3Key - Image name
 * category - specific category
 * index - specific index for random lookups
 * location - Image description
 * latitude
 * longitude
 *
 * Category size:
 * s3Key - Category name
 * category - Category
 * size - count of how many specific categories exist
 * ]
 * How to use BatchWriteCommand:
 * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/example_dynamodb_BatchWriteItem_section.html
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, paginateScan } from '@aws-sdk/lib-dynamodb';
import imgConfig from '../../../assets/metadata/images.json';
import readConfig from '../utils/config';
import { chunkArray } from '../utils/helpers';
import { getLogger } from '../../logger';
const config = readConfig();
const client = new DynamoDBClient({ region: config.REGION });
const docClient = DynamoDBDocumentClient.from(client);
const logger = getLogger();

/**
 * Deletes everything in DDB
 * Adapted from: https://gist.github.com/mikebroberts/8737179a92f6e11494a02781329e1a11
 */
export async function deleteAllItemsInTable(tableName: string, keyFields: string[]) {
    logger.info(`Deleting all items from table: ${tableName}`);
    let deletedCount = 0;
    // Loop through and paginate deletes
    for await (const page of paginateScan(
        { client: docClient, pageSize: 25 },
        { TableName: tableName, ProjectionExpression: keyFields.join(', ') }, // Only load needed columns for deletion
    )) {
        const items = page.Items;
        if (items && items.length > 0) {
            await docClient.send(
                new BatchWriteCommand({
                    // Batch delete
                    RequestItems: {
                        [tableName]: items.map((item) => ({
                            // Transform each row to a delete request
                            DeleteRequest: {
                                Key: item,
                            },
                        })),
                    },
                }),
            );
            deletedCount += items.length;
        }
    }
    logger.info(`Deleted ${deletedCount} items from table`);
}

export const handler = async () => {
    const tableName = config.METADATA_TABLE_NAME;

    if (!tableName) {
        logger.error('Missing tableName');
        return { error: 'Missing bucket table vars' };
    }

    if (!imgConfig) {
        logger.error('images.json config is empty');
        return { error: 'Empty config' };
    }

    logger.info('Starting metadata table rebuild');

    // Erase all rows
    await deleteAllItemsInTable(tableName, ['s3Key', 'category']);

    const rows = [];
    const imgCountMap: Record<string, number> = {};

    // Process each img as a row in ddb
    for (const img of imgConfig) {
        img.Categories.push('all'); // Each image needs an all index
        for (const cat of img.Categories) {
            const catLower = cat.toLowerCase();
            const idx = imgCountMap[catLower] ?? 0; // Default 0 index
            imgCountMap[catLower] = idx + 1;
            // Build ddb row
            const row = {
                s3Key: img.imgName,
                category: catLower, // Make sure matches aren't finicky
                index: idx,
                location: img.Location,
                latitude: img.Latitude,
                longitude: img.Longitude,
            };
            rows.push(row);
        }
    }

    // Add each category lengths to ddb
    Object.entries(imgCountMap).forEach(([category, size]) => {
        const row = {
            s3Key: category,
            category,
            size,
        };
        rows.push(row);
    });

    logger.info(
        `Built ${rows.length} rows from ${imgConfig.length} images across ${Object.keys(imgCountMap).length} categories`,
    );

    // Splits array into 25 elements (batchwritecommand max)
    const imgChunks = chunkArray(rows, 25);

    let writtenChunks = 0;

    // For every chunk of 25 images, make one BatchWrite request.
    for (const chunk of imgChunks) {
        const putRequests = chunk.map((img) => ({
            PutRequest: {
                Item: img,
            },
        }));

        const command = new BatchWriteCommand({
            RequestItems: {
                [tableName]: putRequests,
            },
        });

        await docClient.send(command);
        writtenChunks++;
    }

    logger.info(`Wrote ${writtenChunks} batches to ${tableName}`);
    logger.debug(`Category breakdown: ${JSON.stringify(imgCountMap)}`);

    return { totalCount: imgCountMap['all'] };
};
