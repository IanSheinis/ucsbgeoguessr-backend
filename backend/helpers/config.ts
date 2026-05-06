import path from 'path';
import { logger } from '../logger';
import {
    ApiStackConfig,
    CommonConfigType,
    DynamoDBStackConfigType,
    EndpointConfig,
    MetadataStackConfigType,
    S3StackConfigType,
} from './types';
import * as lambda from 'aws-cdk-lib/aws-lambda';

/**
 * Function to get optional environment variables
 * @param key Env name
 * @param defaultValue Default config value
 * @returns Void
 */
function getOptionalEnv(key: string, defaultValue: string): string {
    if (!process.env[key]) {
        logger.info(`No Env Var: ${key} using default value ${defaultValue}`);
    }
    return process.env[key] ?? defaultValue;
}

/**
 * Typecheck winston log level
 * @param logLevel Winston log level
 * @returns
 */
function checkLogEnv(logLevel: string): 'INFO' | 'DEBUG' | 'WARN' | 'TRACE' | 'ERROR' | 'FATAL' {
    logLevel = logLevel.toUpperCase();
    const validLevels = ['INFO', 'DEBUG', 'WARN', 'TRACE', 'ERROR', 'FATAL'];

    if (!validLevels.includes(logLevel)) {
        throw new Error(`Log level is not appropiate, LOG_LEVEL = ${logLevel}`);
    }
    return logLevel as 'DEBUG' | 'INFO' | 'WARN' | 'TRACE' | 'ERROR' | 'FATAL';
}

export const environment = getOptionalEnv('ENVIRONMENT', 'dev').toLowerCase();
export const region = getOptionalEnv('REGION', 'us-west-1');
export const app_name = 'ucsbgeoguesser';
console.log(environment);
export const GeneralConfig: CommonConfigType = {
    environment,
    region,
    app_name,
};

export const S3StackConfig: S3StackConfigType = {
    ...GeneralConfig,
};

export const DynamoDBStackConfig: DynamoDBStackConfigType = {
    ...GeneralConfig,
};

export const MetadataStackConfig: MetadataStackConfigType = {
    ...GeneralConfig,
};
const currentFile = __filename;
const helpersDir = path.dirname(currentFile);
const backendDir = path.dirname(helpersDir);
const srcPath = path.join(backendDir, 'src');

/**
 * Backend endpoints to be attatched to APIGateway
 */
export const endpointList: EndpointConfig[] = [
    {
        // GET /image/random
        path: '/image/random',
        httpMethod: 'GET',
        lambdaBuilderConfig: {
            fileName: 'image/random/get.ts',
            memorySize: 512, // Increased from 256MB for faster execution
        },
        pathParameterRequired: false,
        readMetadataTable: true,
    },
    {
        // POST /image
        path: '/image',
        httpMethod: 'POST',
        lambdaBuilderConfig: {
            fileName: 'image/post.ts',
            memorySize: 512, // Increased from 256MB for faster execution
        },
        pathParameterRequired: true,
        readMetadataTable: true,
    },
    {
        // GET /image/random/{amount}
        path: '/image/random/{amount}',
        httpMethod: 'GET',
        lambdaBuilderConfig: {
            fileName: '/image/random/{amount}/get.ts',
            memorySize: 512, // Increased from 256MB for faster execution
        },
        pathParameterRequired: true,
        readMetadataTable: true,
    },
    {
        // POST /image/random
        path: '/image/random',
        httpMethod: 'POST',
        lambdaBuilderConfig: {
            fileName: 'image/random/post.ts',
            memorySize: 512, // Increased from 256MB for faster execution
        },
        pathParameterRequired: false,
        readMetadataTable: true,
    },
    {
        // POST /image/category/random
        path: '/image/category/random',
        httpMethod: 'POST',
        lambdaBuilderConfig: {
            fileName: 'image/category/random/post.ts',
            memorySize: 512, // Increased from 256MB for faster execution
        },
        pathParameterRequired: false,
        readMetadataTable: true,
    },
];

/**
 * Config used for APIGateway
 */
export const ApiConfig: ApiStackConfig = {
    ...GeneralConfig,
    originDomain: getOptionalEnv('ORIGIN_DOMAIN', '*'),
    srcPath: srcPath,
    defaultRuntime: 'node22',
    defaultRuntimeProperty: lambda.Runtime.NODEJS_22_X,
    defaultHandler: 'handler',
    defaultSystemLogLevel: 'INFO', // log level of os
    defaultApplicationLogLevel: checkLogEnv(getOptionalEnv('LOG_LEVEL', 'INFO')), // default to INFO for dev
    //TODO enable authorizer
    authorizerEnable:
        !(GeneralConfig.environment === 'dev' || GeneralConfig.environment === 'development') ||
        getOptionalEnv('AUTHORIZER', 'false').toLowerCase() !== 'false', // enable authorizer unless explicitly false in dev

    endpointConfig: endpointList,
};
