/**
 * Get a random image based on specific category and exclude all images in exclusion list
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import ResponseHandler, { parseEventBody } from '../../../utils/apigw_format';
import readConfig from '../../../utils/config';
import { aggregateMetadata, getRandomElement } from '../../../utils/helpers';
import { queryAllS3Keys, queryMetadata } from '../../../utils/ddb_helper';
import { MetadataRow } from '../../../utils/types';

const config = readConfig();
const client = new DynamoDBClient({ region: config.REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * JSON example
 * {
 *  "category" : "food", // Not case sensitive
 *  "exclusionList" : ["image.jpg","image2.jpg"] // Case sensitive
 * }
 *
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
        return ResponseHandler.badRequest('JSON syntax error');
    }
    try {
        const { category, exclusionList } = body;

        console.log('body: ' + JSON.stringify(body));

        if (!category) {
            return ResponseHandler.badRequest("Missing 'category' query parameter");
        }

        const categoryLower = category.toLowerCase();

        if (exclusionList === undefined) {
            return ResponseHandler.badRequest("Missing 'exclusionList' query parameter");
        }

        const tableName = config.METADATA_TABLE_NAME;
        if (!tableName) {
            return ResponseHandler.internalServerError('Table name not configured');
        }

        const remainingS3Keys = await queryAllS3Keys(
            exclusionList,
            tableName,
            docClient,
            categoryLower,
        );

        if (remainingS3Keys.length === 0) {
            // If everything is excluded
            return ResponseHandler.success('', 204);
        }

        const randomS3Key: string = getRandomElement(remainingS3Keys)!; // Null assertion b/c remainingObjects is non-empty

        const metadataRaw = await queryMetadata(randomS3Key, tableName, docClient);
        if (!metadataRaw) {
            console.error('metadataRaw was null for S3key: ', randomS3Key);
            return ResponseHandler.internalServerError(); // This shouldn't happen
        }
        const metadata = aggregateMetadata(metadataRaw as MetadataRow[]);
        return ResponseHandler.success(metadata);
    } catch (error) {
        console.error(error);
        return ResponseHandler.internalServerError();
    }
};
