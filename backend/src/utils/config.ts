import * as fs from "fs";
import * as path from "path";
import {
  LambdaEnvVariables,
} from "./types";

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
function coalesceEnv(
  primary: string,
  fallback: string | undefined,
  defaultValue = "",
): string {
  if (process.env[primary] !== undefined) {
    return process.env[primary] ?? "";
  }
  if (fallback !== undefined) {
    return fallback;
  }
  return defaultValue;
}


export default function readConfig(): LambdaEnvVariables {
    const ORIGIN_DOMAIN = getOptionalEnv("ORIGIN_DOMAIN", "");
    const ENVIRONMENT = getOptionalEnv("ENVIRONMENT", "dev");
    const REGION = getOptionalEnv("REGION", "us-west-1");
    const S3_BUCKET_NAME = getOptionalEnv("S3_BUCKET_NAME", "");
    const LOG_LEVEL = checkLogLevel(getOptionalEnv("LOG_LEVEL", "info"));
    const BUCKET_TABLE_NAME = getOptionalEnv("BUCKET_TABLE_NAME", ""); 
    return {
    ORIGIN_DOMAIN,
    ENVIRONMENT,
    REGION,
    LOG_LEVEL,
    S3_BUCKET_NAME,
    BUCKET_TABLE_NAME
    };
}

