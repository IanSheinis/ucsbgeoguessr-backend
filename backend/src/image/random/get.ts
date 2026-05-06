/**
 * Retrieve a random image from the s3 bucket, no exclusion implemented here
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import ResponseHandler from '../../utils/apigw_format';
import readConfig from '../../utils/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { queryByCategoryIndex, queryCategory, queryMetadata } from '../../utils/ddb_helper';
import { aggregateMetadata } from '../../utils/helpers';
import { MetadataRow } from '../../utils/types';

const config = readConfig();
const client = new DynamoDBClient({ region: config.REGION });
const docClient = DynamoDBDocumentClient.from(client);

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
            console.error('Missing bucket table environment variable');
            return ResponseHandler.internalServerError();
        }

        // Row with 'all' s3Key
        const allCategoryRow = await queryCategory('all', tableName, docClient);
        if (!allCategoryRow.length) {
            console.error('Could not find all category');
            return ResponseHandler.internalServerError();
        }

        const allSize = allCategoryRow[0].size;

        const randomIndex = Math.floor(Math.random() * allSize);
        const s3Key = await queryByCategoryIndex('all', randomIndex, tableName, docClient);
        if (!s3Key) {
            return ResponseHandler.badRequest('No image available');
        }

        const metadataRaw = await queryMetadata(s3Key, tableName, docClient);
        if (!metadataRaw) {
            console.error('metadataRaw was null for S3key: ', s3Key);
            return ResponseHandler.internalServerError(); // This shouldn't happen
        }
        const metadata = aggregateMetadata(metadataRaw as MetadataRow[]);
        return ResponseHandler.success(metadata);
    } catch (e) {
        console.error(e);
        return ResponseHandler.internalServerError();
    }
};
