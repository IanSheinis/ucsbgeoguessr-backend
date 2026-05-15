import * as path from 'path';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ICommandHooks, NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LambdaBuilderConfig, LambdaEnvVariables } from './types';
import { ApiConfig } from './config';
import * as logs from 'aws-cdk-lib/aws-logs';

type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

/**
 * Lambda builder utility using the fluent/builder pattern for constructing NodejsFunctions.
 * Based on https://github.com/TomorrowTechReviews/aws-cdk-ts
 *
 * Original code MIT License, Copyright (c) 2024 Tomorrow Tech Reviews
 * See LICENSE-third-party or the original repo for full license text.
 */
export default class LambdaBuilder {
    private props: Mutable<NodejsFunctionProps>;
    private entry: string;

    constructor(
        private scope: Construct,
        private functionName: string,
        private config: LambdaBuilderConfig,
    ) {
        this.functionName = this.functionName.replace(/[^a-zA-Z0-9-_]/g, ''); // Remove characters not allowed in AWS Lambda function names

        this.props = {
            functionName: this.functionName,
            //depsLockFilePath:
            depsLockFilePath: path.join(process.cwd(), 'package-lock.json'),
            bundling: {
                target: config.runtime ?? ApiConfig.defaultRuntime,
                nodeModules: [...(config.nodeModules ?? [])],
                externalModules: [
                    // For some reason these need docker so make sure to have docker running
                    '@aws-sdk/*', // Already external in Lambda runtime
                    '@smithy/*', // Already external in Lambda runtime
                ],
                loader: {
                    '.pem': 'file',
                    '.html': 'text',
                },
            },
            tracing: lambda.Tracing.ACTIVE,
            runtime: config.runtimeProperty ?? ApiConfig.defaultRuntimeProperty,
            architecture: lambda.Architecture.ARM_64,
            handler: config.handler ?? ApiConfig.defaultHandler,
            timeout: config.timeout ?? Duration.seconds(30),
            initialPolicy: [],
            description: '',
            memorySize: config.memorySize ?? 256,
            loggingFormat: lambda.LoggingFormat.JSON,
            systemLogLevelV2: ApiConfig.defaultSystemLogLevel as lambda.SystemLogLevel,
            applicationLogLevelV2:
                ApiConfig.defaultApplicationLogLevel as lambda.ApplicationLogLevel,
        };
        this.entry = path.join(ApiConfig.srcPath, config.fileName);
    }

    addCommandHooks(hooks: ICommandHooks) {
        this.props.bundling = {
            ...(this.props.bundling ?? {}),
            commandHooks: hooks,
        };
        return this;
    }

    setEnv(env: LambdaEnvVariables) {
        this.props.environment = env as unknown as { [key: string]: string }; // Typescript is being very strict with conversions
        return this;
    }

    setTimeout(seconds: number) {
        this.props.timeout = Duration.seconds(seconds);
        return this;
    }

    setMemory(mb: number) {
        this.props.memorySize = mb;
        return this;
    }

    addNodeModules(moduleNames: string | string[]) {
        if (Array.isArray(moduleNames)) {
            this.props.bundling?.nodeModules?.push(...moduleNames);
        } else {
            this.props.bundling?.nodeModules?.push(moduleNames);
        }
        return this;
    }

    addExternalModules(moduleNames: string | string[]) {
        if (Array.isArray(moduleNames)) {
            this.props.bundling?.externalModules?.push(...moduleNames);
        } else {
            this.props.bundling?.externalModules?.push(moduleNames);
        }
        return this;
    }

    addPolicy(policy: iam.PolicyStatement) {
        this.props.initialPolicy?.push(policy);
        return this;
    }

    setDescription(text: string) {
        this.props.description = text;
        return this;
    }

    private logRetention: logs.RetentionDays = logs.RetentionDays.ONE_WEEK;

    setLogRetention(retention: logs.RetentionDays) {
        this.logRetention = retention;
        return this;
    }

    build() {
        const id = `${this.functionName}Fn`;

        const fn = new NodejsFunction(this.scope, id, {
            entry: this.entry,
            ...this.props,
        });

        // Add deletion policy to the Lambda function itself
        fn.applyRemovalPolicy(RemovalPolicy.DESTROY);

        // Allow existing log groups to persist by letting Lambda manage them implicitly.
        const existingLogGroup = fn.node.tryFindChild('LogGroup');
        if (existingLogGroup) {
            fn.node.tryRemoveChild('LogGroup');
        }

        new logs.LogGroup(this.scope, `${this.functionName}Logs`, {
            logGroupName: `/aws/lambda/${fn.functionName}`,
            retention: this.logRetention,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        return fn;
    }
}
