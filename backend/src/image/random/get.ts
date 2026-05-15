/**
 * GET /image/random
 *
 * Returns metadata for one random image from the entire collection.
 * Uses the 'all' category index and a random offset to avoid a full table scan.
 *
 * Responses:
 *   200 - ImageMetadata
 *   400 - No image available at selected index
 *   500 - Internal error (missing config or 'all' category row)
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import ResponseHandler from '../../utils/apigw_format';
import readConfig from '../../utils/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { queryByCategoryIndex, queryCategory, queryMetadata } from '../../utils/ddb_helper';
import { aggregateMetadata } from '../../utils/helpers';
import { MetadataRow } from '../../utils/types';
import { getLogger } from '../../utils/logger';

const config = readConfig();
const client = new DynamoDBClient({ region: config.REGION });
const docClient = DynamoDBDocumentClient.from(client);
const logger = getLogger();
/**
 * returns 200 w/ an image upon success
 * returns 204 if no images
 * returns 400 if bad request
 * returns 500 if internal server error
 */
export const handler = async (
    _event: APIGatewayProxyEvent,
    _context: Context,
): Promise<APIGatewayProxyResult> => {
    try {
        const tableName = config.METADATA_TABLE_NAME;

        if (!tableName) {
            logger.error('Missing bucket table environment variable');
            return ResponseHandler.internalServerError();
        }

        // Row with 'all' s3Key
        const allCategoryRow = await queryCategory('all', tableName, docClient);
        if (!allCategoryRow.length) {
            logger.error('Could not find all category');
            return ResponseHandler.internalServerError();
        }

        const allSize = allCategoryRow[0].size;

        const randomIndex = Math.floor(Math.random() * allSize);
        logger.debug(`Random index selected: ${randomIndex} out of ${allSize}`);

        const s3Key = await queryByCategoryIndex('all', randomIndex, tableName, docClient);
        if (!s3Key) {
            return ResponseHandler.badRequest('No image available');
        }
        logger.debug(`Selected s3Key: ${s3Key}`);

        const metadataRaw = await queryMetadata(s3Key, tableName, docClient);
        if (!metadataRaw) {
            logger.error('metadataRaw was null for S3key: ', s3Key);
            return ResponseHandler.internalServerError(); // This shouldn't happen
        }
        const metadata = aggregateMetadata(metadataRaw as MetadataRow[]);
        return ResponseHandler.success(metadata);
    } catch (e) {
        logger.error(e);
        return ResponseHandler.internalServerError();
    }
};
