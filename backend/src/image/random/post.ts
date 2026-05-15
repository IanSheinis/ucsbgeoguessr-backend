/**
 * POST /image/random
 *
 * Returns a random image's metadata, excluding previously seen images.
 * Fetches all S3 keys, filters out exclusions, then retrieves metadata for a random remaining key.
 *
 * Body: { exclusionList: string[] }
 *
 * Responses:
 *   200 - ImageMetadata
 *   204 - No images remaining after exclusions
 *   400 - Missing exclusionList or invalid JSON
 *   500 - Internal error
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import ResponseHandler, { parseEventBody } from '../../utils/apigw_format';
import readConfig from '../../utils/config';
import { aggregateMetadata, getRandomElement } from '../../utils/helpers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { queryAllS3Keys, queryMetadata } from '../../utils/ddb_helper';
import { MetadataRow } from '../../utils/types';
import { getLogger } from '../../utils/logger';

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
        return ResponseHandler.badRequest('Invalid JSON in request body');
    }
    try {
        const { exclusionList } = body;

        if (exclusionList === undefined) {
            return ResponseHandler.badRequest("Missing 'exclusionList' query parameter");
        }

        const tableName = config.METADATA_TABLE_NAME;

        if (!tableName) {
            logger.error('Missing bucket table environment variable');
            return ResponseHandler.internalServerError();
        }

        logger.debug(`Exclusion list: ${JSON.stringify(exclusionList)}`);

        // Return remaining s3key after excluding the exclusion list
        const remainingS3Keys = await queryAllS3Keys(exclusionList, tableName, docClient);
        if (remainingS3Keys.length === 0) {
            // If everything is excluded or no images return 204
            logger.debug('No images remaining after exclusions');
            return ResponseHandler.success('', 204);
        }

        const s3Key: string = getRandomElement<string>(remainingS3Keys)!; // Null assertion b/c remainingObjects is non-empty
        logger.debug(`Selected s3Key: ${s3Key} from ${remainingS3Keys.length} remaining`);

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
