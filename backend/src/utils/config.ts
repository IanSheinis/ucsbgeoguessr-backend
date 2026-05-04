import {
  LambdaEnvVariables,
} from "./types";
/**
 * Config file to get env var's passed into lambda
 */

/**
 * Functions to make error handling of env var's recursive
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

export function getRequiredEnvInt(key: string): number {
  // Throw error if env variable is undefined
  const value = getRequiredEnv(key);

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer`);
  }

  return parsed;
}

function getOptionalEnv(key: string, defaultValue: string = ""): string {
  return process.env[key] ?? defaultValue;
}

function getOptionalEnvInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Checks for Winston log level
 */
function checkLogLevel(
  logLevel: string,
): "error" | "warn" | "info" | "verbose" | "debug" | "silly" {
  logLevel = logLevel.toLowerCase();
  if (
    !["error", "warn", "info", "verbose", "debug", "silly"].includes(logLevel)
  ) {
    throw new Error(`LOG_LEVEL not appropiate, LOG_LEVEL = ${logLevel}`);
  }

  return logLevel as "error" | "warn" | "info" | "verbose" | "debug" | "silly";
}


export default function readConfig(): LambdaEnvVariables {
    const ORIGIN_DOMAIN = getOptionalEnv("ORIGIN_DOMAIN", "");
    const ENVIRONMENT = getOptionalEnv("ENVIRONMENT", "dev");
    const REGION = getOptionalEnv("REGION", "us-west-1");
    const S3_BUCKET_NAME = getOptionalEnv("S3_BUCKET_NAME", "");
    const LOG_LEVEL = checkLogLevel(getOptionalEnv("LOG_LEVEL", "info"));
    const METADATA_TABLE_NAME = getOptionalEnv("METADATA_TABLE_NAME", ""); 
    return {
    ORIGIN_DOMAIN,
    ENVIRONMENT,
    REGION,
    LOG_LEVEL,
    S3_BUCKET_NAME,
    METADATA_TABLE_NAME
    };
}

