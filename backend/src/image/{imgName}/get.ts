/**
 * Retrieve a random image from the s3 bucket, no exclusion implemented here
 */
import { ApiGateway } from "aws-cdk-lib/aws-events-targets";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import ResponseHandler from "../../utils/json_format";
import { logger } from "../../../logger";
import readConfig from "../../utils/config";
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getRandomElement } from "../../utils/helpers";
import { fetchBase64, getAllObjectKeys } from "../../utils/bucketHelper";

/**
 * How to send images via lambda
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/lambda-proxy-binary-media.html
 */
const config = readConfig();
const s3 = new S3Client({ region: process.env.REGION });

/**
 * Sends specific image name given parameter imgName
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

    const imgName = event.pathParameters?.imgName;
    if (!imgName) {
      return ResponseHandler.badRequest("Missing imgName path parameter");
    }

    const { base64body, metadata } = await fetchBase64(s3, bucket, imgName);
    if (!base64body) {
      return ResponseHandler.badRequest("No image available"); 
    }
    const headers = {
      ...metadata,
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Content-Type": "image/png",
    }

    // Custom return for base64 encoded
    return {
        'headers': headers,
        'statusCode': 200,
        'body': base64body,
        'isBase64Encoded': true
        }
  }
  catch (e) {
    console.error(e);
    return ResponseHandler.internalServerError('Internal server error: ' + e);
  }
};
