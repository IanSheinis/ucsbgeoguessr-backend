/**
 * Retrieve a random image from the s3 bucket, exclusion is implemented here
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import ResponseHandler, { parseEventBody } from '../../utils/apigw_format';
import readConfig from '../../utils/config';
import { getRandomElement, removeExcluded } from '../../utils/helpers';
import { fetchBase64, getAllObjectKeys } from '../../utils/bucketHelper';
import { S3Client } from '@aws-sdk/client-s3';

const config = readConfig();
const s3 = new S3Client({ region: process.env.REGION });

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

        const bucket = config.S3_BUCKET_NAME;
        if (!bucket) {
            return ResponseHandler.internalServerError('No bucket env');
        }

        // Turn object Name into list of objects
        const objects = await getAllObjectKeys(s3, bucket);
        if (!objects) {
            return ResponseHandler.badRequest('No images in s3 bucket');
        }

        const excludedObjects = removeExcluded(objects, exclusionList);

        if (excludedObjects.length === 0) {
            // If everything is excluded
            return ResponseHandler.success('', 204);
        }

        const randomObject: string = getRandomElement(excludedObjects);

        console.log('Fetching from:', randomObject);

        const { base64body, metadata } = await fetchBase64(s3, bucket, randomObject);
        if (!base64body) {
            return ResponseHandler.internalServerError('No image available');
        }
        const headers = {
            ...metadata,
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Content-Type': 'image/png',
        };

        // Custom return for base64 encoded
        return {
            headers: headers,
            statusCode: 200,
            body: base64body,
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error('Query error:', error);
        return ResponseHandler.internalServerError(error);
    }
};
