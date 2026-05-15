import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { ApiStackConfig, EndpointConfig, LambdaEnvVariables } from '../helpers/types';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { endpointList } from '../helpers/config';
import LambdaBuilder from '../helpers/lambdaBuilder';

/**
 * Api Stack
 *
 * Iterative endpoint creating endpoint infra using /src api logc:
 *  - Lambda function
 *  - APIGW resource
 *  - APIGW method request/response
 *  - APIGW integration request/response
 *  - Request validator
 *  - Options resource for CORS
 */
export class ApiStack extends cdk.Stack {
    private readonly sharedLambdaMap = new Map<string, NodejsFunction>();
    private api: apigateway.RestApi;
    constructor(scope: Construct, id: string, props: ApiStackConfig) {
        super(scope, id, props);
        this.createApi(props);
    }

    private createApi(props: ApiStackConfig): void {
        this.api = this.createApiGateway(this, props);

        const imageBucket = props?.imageBucket;
        if (!imageBucket) {
            throw new Error('imageBucket is required in ApiStackConfig');
        }

        const metadataTable = props?.metadataTable;
        if (!metadataTable) {
            throw new Error('metadataTable is required in ApiStackConfig');
        }

        const imageBucketName = imageBucket.bucketName;
        const metadataTableName = metadataTable.tableName;

        // Environment variables for lambda functions created by the infrastructure function
        const LambdaEnvVars: LambdaEnvVariables = {
            REGION: props.region,
            LOG_LEVEL: 'debug', // TODO change to be from config
            S3_BUCKET_NAME: imageBucketName,
            METADATA_TABLE_NAME: metadataTableName,
        };

        // Recursively create infrastructure
        endpointList.forEach((config) => {
            this.createEndpoint(props, config, LambdaEnvVars);
        });
    }

    /**
     * Creates endpoint infrastructure
     */
    private createApiGateway(scope: Construct, props: ApiStackConfig): apigateway.RestApi {
        // Create CloudWatch Log Group for API Gateway access logs
        const apiGatewayLogGroup = new logs.LogGroup(scope, 'ApiGatewayLogGroup', {
            logGroupName: `/aws/apigateway/${props.app_name}-${props.environment}`,
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Create the REST API
        const api = new apigateway.RestApi(scope, `${props.app_name}-${props.environment}`, {
            restApiName: `${props.app_name}-${props.environment}`,
            description: `API gateway for ${props.app_name} backend`,
            cloudWatchRole: true,

            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
            },
            deploy: true,
            deployOptions: {
                stageName: props.environment,
                tracingEnabled: true,
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                accessLogDestination: new apigateway.LogGroupLogDestination(apiGatewayLogGroup),
                metricsEnabled: true,
                dataTraceEnabled: true,
            },
        });

        const corsResponseHeaders = (): Record<string, string> => ({
            'Access-Control-Allow-Origin': `'${props.originDomain}'`,
            'Access-Control-Allow-Headers': "'*'",
            'Access-Control-Allow-Methods': "'*'",
        });

        // Attach CORS headers on API Gateway's 4xx/5xx errors
        const responseTypes: Array<[string, apigateway.ResponseType]> = [
            ['Default4xx', apigateway.ResponseType.DEFAULT_4XX],
            ['Default5xx', apigateway.ResponseType.DEFAULT_5XX],
        ];

        responseTypes.forEach(([suffix, responseType]) => {
            api.addGatewayResponse(`Cors${suffix}GatewayResponse`, {
                type: responseType,
                responseHeaders: corsResponseHeaders(),
            });
        });

        return api;
    }

    /**
     * Creates an individual endpoint based on endpoint configuration
     */
    private createEndpoint(
        props: ApiStackConfig,
        config: EndpointConfig,
        env: LambdaEnvVariables,
    ): NodejsFunction {
        const lambdaKey = config.sharedLambdaKey;
        const functionName = lambdaKey
            ? `${lambdaKey}-${props.environment}`
            : `${config.httpMethod}-${config.path}-${props.environment}`;

        const lambdafn = this.getOrCreateFunction(functionName, config, env);

        // Grant permissions based on flags
        if (config.readImageBucket) {
            props.imageBucket!.grantRead(lambdafn);
        }
        if (config.readMetadataTable) {
            props.metadataTable!.grantReadData(lambdafn);
        }

        const integration = new apigateway.LambdaIntegration(lambdafn, {
            proxy: true,
        });

        // Look up resource from parent API (resources are still in parent stack to avoid hierarchy issues)
        const resource = this.api.root.resourceForPath(config.path);

        const methodOptions: apigateway.MethodOptions = {
            // Create method response settings

            // Declare CORS headers for all status codes (required for Lambda proxy integration)
            // Without this, API Gateway won't pass through CORS headers from Lambda responses
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.Cache-Control': true,
                    },
                },
                {
                    statusCode: '202',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                    },
                },
                {
                    statusCode: '400',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                    },
                },
                {
                    statusCode: '404',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                    },
                },
                {
                    statusCode: '500',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                    },
                },
            ],
        };

        new apigateway.Method(this, `${config.httpMethod}-${config.path}`, {
            httpMethod: config.httpMethod,
            resource: resource,
            integration: integration,
            options: methodOptions,
        });

        return lambdafn;
    }

    /**
     * Creates or reuses a lambda function
     */
    private getOrCreateFunction(
        functionName: string,
        config: EndpointConfig,
        envVars: LambdaEnvVariables,
    ): NodejsFunction {
        // Handle an endpoint reusing a lambda
        const mapKey = config.sharedLambdaKey ?? functionName;
        const existing = this.sharedLambdaMap.get(mapKey);
        if (existing) {
            return existing;
        }

        // TODO: Might want layer logic in the future
        const builder = new LambdaBuilder(this, functionName, config.lambdaBuilderConfig).setEnv(
            envVars,
        );

        const lambdaFn = builder.build();
        this.sharedLambdaMap.set(mapKey, lambdaFn);
        return lambdaFn;
    }
}
