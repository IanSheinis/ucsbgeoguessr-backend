import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb';

export interface CommonConfigType {
    readonly environment: string;
    readonly region: string;
    readonly app_name: string;
}
export interface S3StackConfigType extends cdk.StackProps, CommonConfigType {}

export interface DynamoDBStackConfigType extends cdk.StackProps, CommonConfigType {}

export interface MetadataStackConfigType extends cdk.StackProps, CommonConfigType {
    readonly metadataTable?: TableV2;
}

export interface S3StackOutputs {
    imageBucket: s3.IBucket;
}

export interface DynamoDBStackOutputs {
    metadataTable: TableV2;
}

export interface MetadataStackOutputs {}

export interface ImageConfig {
    imgName: string;
    Location: string;
    Latitude: string;
    Longitude: string;
    Categories: string[];
}

export interface LambdaBuilderConfig {
    readonly fileName: string;
    readonly runtime?: string;
    readonly runtimeProperty?: lambda.Runtime;
    readonly handler?: string;
    readonly timeout?: Duration;
    readonly nodeModules?: string[];
    /**
     * Lambda memory size in MB. Higher memory = more CPU = faster cold starts.
     * Default: 256MB. Recommended for critical endpoints: 512-1024MB.
     */
    readonly memorySize?: number;
}
export interface LambdaEnvVariables {
    // Almost same config as in src_ts/utils/types
    ORIGIN_DOMAIN?: string;
    ENVIRONMENT?: string;
    FIREBASE_CREDS?: string;
    REGION: string;
    LOG_LEVEL: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';
    S3_BUCKET_NAME?: string;
    METADATA_TABLE_NAME?: string;
}

export interface EndpointConfig {
    readonly path: string;
    readonly httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ANY';
    readonly lambdaBuilderConfig: LambdaBuilderConfig;
    readonly sharedLambdaKey?: string; // Used to tell if using an existing lambda

    // Permission list for resources, add to this when there is a new resource (MAKE SURE TO ADD LOGIC IN API-STACK.TS GETORCREATE FUNCTION)
    readonly readImageBucket?: boolean;
    readonly readMetadataTable?: boolean;
}

export interface ApiStackConfig extends cdk.StackProps, CommonConfigType {
    readonly originDomain: string;
    readonly srcPath: string;
    readonly defaultRuntime: string;
    readonly defaultRuntimeProperty: lambda.Runtime;
    readonly defaultHandler: string;
    readonly defaultSystemLogLevel: 'INFO' | 'DEBUG' | 'WARN'; // lambda.SystemLogLevel
    readonly defaultApplicationLogLevel: 'INFO' | 'DEBUG' | 'WARN' | 'TRACE' | 'ERROR' | 'FATAL'; //lambda.ApplicationLogLevel
    readonly endpointConfig: EndpointConfig[];
    readonly imageBucket?: s3.IBucket;
    readonly metadataTable?: TableV2;
}
