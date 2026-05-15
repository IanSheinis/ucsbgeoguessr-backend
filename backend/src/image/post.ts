/**
 * POST /image/metadata
 *
 * Returns metadata for a specific image by name.
 *
 * Body: { imgName: string }
 *
 * Responses:
 *   200 - ImageMetadata (s3Key, categories, location, latitude, longitude)
 *   400 - Missing imgName or invalid JSON
 *   500 - Internal error
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import ResponseHandler, { parseEventBody } from '../utils/apigw_format';
import readConfig from '../utils/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { queryMetadata } from '../utils/ddb_helper';
import { aggregateMetadata } from '../utils/helpers';
import { MetadataRow } from '../utils/types';
import { getLogger } from '../utils/logger';

const config = readConfig();
const client = new DynamoDBClient({ region: config.REGION });
const docClient = DynamoDBDocumentClient.from(client);
const logger = getLogger();

export const handler = async (
    event: APIGatewayProxyEvent,
    _context: Context,
): Promise<APIGatewayProxyResult> => {
    let body;

    // Turn event body to json
    try {
        body = parseEventBody(event);
    } catch (parseError) {
        logger.error('Failed to parse request body', parseError);
        return ResponseHandler.badRequest('JSON syntax error');
    }
    try {
        const { imgName } = body;

        if (!imgName) {
            return ResponseHandler.badRequest('Missing imgName path parameter');
        }

        const tableName = config.METADATA_TABLE_NAME;

        if (!tableName) {
            logger.error('Missing bucket table environment variable');
            return ResponseHandler.internalServerError();
        }

        logger.debug(`Looking up metadata for imgName: ${imgName}`);

        const metadataRaw = await queryMetadata(imgName, tableName, docClient);
        if (!metadataRaw) {
            logger.error('metadataRaw was null for S3key: ', imgName);
            return ResponseHandler.internalServerError(); // This shouldn't happen
        }
        const metadata = aggregateMetadata(metadataRaw as MetadataRow[]);
        return ResponseHandler.success(metadata);
    } catch (e) {
        logger.error(e);
        return ResponseHandler.internalServerError();
    }
};
