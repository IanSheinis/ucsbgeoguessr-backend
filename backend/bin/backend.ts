#!/usr/bin/env node
import 'dotenv/config'; // Load .env file automatically
import * as cdk from 'aws-cdk-lib';
import { S3Stack } from '../lib/s3-stack';
import {
    ApiConfig,
    DynamoDBStackConfig,
    GeneralConfig,
    MetadataStackConfig,
    S3StackConfig,
} from '../helpers/config';
import { ApiStack } from '../lib/api-stack';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { MetadataStack } from '../lib/metadata-stack';

const account = process.env['ACCOUNT'];
const region = process.env['REGION'];
const app = new cdk.App();

// Create S3 for images and metadata
const s3Stack = new S3Stack(app, `S3Stack-${GeneralConfig.environment}`, {
    ...S3StackConfig,
    description: `${GeneralConfig.app_name} S3 infrastructure stack for ${GeneralConfig.environment} environment`,
    tags: {
        Environment: GeneralConfig.environment,
        Project: `${GeneralConfig.app_name}-${GeneralConfig.environment}-stack`,
    },
    env: {
        region: region,
        account: account,
    },
});

// Create DDB for categories and metadata
const dynamoDBStack = new DynamoDBStack(app, `DynamoDBStack-${GeneralConfig.environment}`, {
    ...DynamoDBStackConfig,
    description: `${GeneralConfig.app_name} DynammoDB infrastructure stack for ${GeneralConfig.environment} environment`,
    tags: {
        Environment: GeneralConfig.environment,
        Project: `${GeneralConfig.app_name}-${GeneralConfig.environment}-stack`,
    },
    env: {
        region: region,
        account: account,
    },
});
dynamoDBStack.addDependency(s3Stack);

// Create ApiGateway with lambda functions
const apiStack = new ApiStack(app, `ApiStack-${ApiConfig.environment}`, {
    ...ApiConfig,
    imageBucket: s3Stack.imageBucket,
    metadataTable: dynamoDBStack.metadataTable,
    description: `${GeneralConfig.app_name} RestAPI infrastructure stack for ${GeneralConfig.environment} environment`,
    tags: {
        Environment: ApiConfig.environment,
        Project: `${GeneralConfig.app_name}-${GeneralConfig.environment}-stack`,
    },
    env: {
        region: region,
        account: account,
    },
});

apiStack.addDependency(dynamoDBStack);
apiStack.addDependency(s3Stack);

// Invoke metadata
const metadataStack = new MetadataStack(app, `MetadataStack-${MetadataStackConfig.environment}`, {
    ...MetadataStackConfig,
    metadataTable: dynamoDBStack.metadataTable,
    description: `${GeneralConfig.app_name} Metadata lambda invocation infrastructure stack for ${GeneralConfig.environment} environment`,
    tags: {
        Environment: MetadataStackConfig.environment,
        Project: `${GeneralConfig.app_name}-${GeneralConfig.environment}-stack`,
    },
    env: {
        region: region,
        account: account,
    },
});

metadataStack.addDependency(apiStack);
metadataStack.addDependency(dynamoDBStack);
metadataStack.addDependency(s3Stack);
