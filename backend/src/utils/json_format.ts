import { APIGatewayProxyResult } from "aws-lambda";

export function parseEventBody(event: any): Record<string, any> {
  let body = event.body;
  if (!body) return {};

  // If API Gateway encoded it, decode it before parsing
  if (event.isBase64Encoded) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  try {
    return JSON.parse(body);
  } catch (parseError) {
    console.error("Invalid JSON syntax");
    throw new SyntaxError("Invalid JSON format in request body");
  }
}

export default class ResponseHandler {
  private static readonly DEFAULT_HEADERS = {
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Content-Type": "application/json",
    //Authorization: "Bearer ",
  };

  static success<T>(
    body: T | null = null,
    statusCode: number = 200,
    headers: any = this.DEFAULT_HEADERS,
  ): APIGatewayProxyResult {
    return {
      statusCode,
      headers,
      body: body ? JSON.stringify(body) : "Success",
    };
  }

  static badRequest<T>(
    body: T | null = null,
    statusCode: number = 400,
    headers: any = this.DEFAULT_HEADERS,
  ): APIGatewayProxyResult {
    return {
      statusCode,
      headers,
      body: body ? JSON.stringify(body) : "Bad request",
    };
  }

  static notFound<T>(
    body: T | null = null,
    statusCode: number = 404,
    headers: any = this.DEFAULT_HEADERS,
  ): APIGatewayProxyResult {
    return {
      statusCode,
      headers,
      body: body ? JSON.stringify(body) : "Not found",
    };
  }

  static internalServerError<T>(
    body: T | null = null,
    statusCode: number = 500,
    headers: any = this.DEFAULT_HEADERS,
  ): APIGatewayProxyResult {
    return {
      statusCode,
      headers,
      body: body ? JSON.stringify(body) : "Internal server error",
    };
  }

  static _response<T>(
    body: T,
    statusCode: number,
    headers: any = this.DEFAULT_HEADERS,
  ): APIGatewayProxyResult {
    return {
      statusCode,
      headers,
      body: JSON.stringify(body, null, 2),
    };
  }
}