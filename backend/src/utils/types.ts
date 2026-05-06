import { LambdaEnvVariables as LambdaEnvVariablesSrc } from '../../helpers/types';
export interface LambdaEnvVariables extends LambdaEnvVariablesSrc {}

export interface MetadataRow {
    s3Key: string;
    category: string;
    index: number;
    latitude: number;
    longitude: number;
    location: string;
}

export interface CategoryRow {
    s3Key: string;
    category: string;
    size: number;
}
