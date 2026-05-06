/**
 * Retrieve a random image from the s3 bucket, exclusion is implemented here
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import ResponseHandler, { parseEventBody } from '../../utils/apigw_format';
import readConfig from '../../utils/config';
import { aggregateMetadata, getRandomElement } from '../../utils/helpers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { queryAllS3Keys, queryMetadata } from '../../utils/ddb_helper';
import { MetadataRow } from '../../utils/types';

const config = readConfig();
const client = new DynamoDBClient({ region: config.REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * JSON example
 * {
 *  "exclusionList" : ["image.jpg","image2.jpg"] // Case sensitive
 * }
 * returns 200 w/ an image upon success
 * returns 204 if no images
 * returns 400 if bad request
 * returns 500 if internal server error
 */
export const handler = async (
    event: APIGatewayProxyEvent,
    _context: Context,
): Promise<APIGatewayProxyResult> => {
    let body;

    // Turn event body to json
    try {
        body = parseEventBody(event);
    } catch (parseError) {
        console.error('Failed to parse request body', parseError);
        return ResponseHandler.badRequest('Invalid JSON in request body');
    }
    try {
        const { exclusionList } = body;

        console.log('body: ' + JSON.stringify(body));

        if (exclusionList === undefined) {
            return ResponseHandler.badRequest("Missing 'exclusionList' query parameter");
        }

        const tableName = config.METADATA_TABLE_NAME;

        if (!tableName) {
            console.error('Missing bucket table environment variable');
            return ResponseHandler.internalServerError();
        }

        // Return remaining s3key after excluding the exclusion list
        const remainingS3Keys = await queryAllS3Keys(exclusionList, tableName, docClient);
        if (remainingS3Keys.length === 0) {
            // If everything is excluded or no images return 204
            return ResponseHandler.success('', 204);
        }

        const s3Key: string = getRandomElement<string>(remainingS3Keys)!; // Null assertion b/c remainingObjects is non-empty

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
