/**
 * Retrieve a random image from the s3 bucket, no exclusion implemented here
 */
import { ApiGateway } from "aws-cdk-lib/aws-events-targets";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import ResponseHandler from "../../../utils/json_format";
import { logger } from "../../../../logger";
import readConfig from "../../../utils/config";
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getRandomElement, getRandomElements } from "../../../utils/helpers";
import { fetchBase64, getAllObjectKeys } from "../../../utils/bucketHelper";

/**
 * How to send images via lambda
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/lambda-proxy-binary-media.html
 */
const config = readConfig();
const s3 = new S3Client({ region: process.env.REGION });

/**
 * Returns a list of random images given parameter amount
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const bucket = config.S3_BUCKET_NAME;
    if (!bucket) {
      return ResponseHandler.internalServerError("No bucket env")
    }

    const objects = await getAllObjectKeys(s3, bucket)
    if (!objects) {
      return ResponseHandler.success("", 204)
    }
    

    // 1. Extract path parameter
    const amountStr = event.pathParameters?.amount;
    if (!amountStr) {
      return ResponseHandler.badRequest("Missing amount path parameter");
    }

    // 2. Integer conversion (Radix 10)
    const amount = parseInt(amountStr, 10);

    // 3. Error handling for non-numbers or negative values
    if (isNaN(amount) || amount <= 0) {
      return ResponseHandler.badRequest("Amount must be a positive integer");
    }

    const randomObject: string[] = getRandomElements(objects, amount);
    return ResponseHandler.success(randomObject)
  }
  catch (e) {
    console.error(e);
    return ResponseHandler.internalServerError('Internal server error: ' + e);
  }
};
