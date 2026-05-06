/**
 * Returns a list of random images given parameter amount
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import ResponseHandler from '../../../utils/apigw_format';
import readConfig from '../../../utils/config';
import { getRandomElements } from '../../../utils/helpers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { queryAllS3Keys } from '../../../utils/ddb_helper';

const config = readConfig();
const client = new DynamoDBClient({ region: config.REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
    event: APIGatewayProxyEvent,
    _context: Context,
): Promise<APIGatewayProxyResult> => {
    try {
        const tableName = config.METADATA_TABLE_NAME;

        if (!tableName) {
            console.error('Missing bucket table environment variable');
            return ResponseHandler.internalServerError();
        }

        const amountStr = event.pathParameters?.amount;
        if (!amountStr) {
            return ResponseHandler.badRequest('Missing amount path parameter');
        }

        const amount = parseInt(amountStr, 10);

        if (isNaN(amount) || amount <= 0) {
            return ResponseHandler.badRequest('Amount must be a positive integer');
        }

        // Return a list of all objects
        const allObjects = await queryAllS3Keys([], tableName, docClient);

        const randomObjects: string[] = getRandomElements(allObjects, amount);
        return ResponseHandler.success(randomObjects);
    } catch (e) {
        console.error(e);
        return ResponseHandler.internalServerError();
    }
};
