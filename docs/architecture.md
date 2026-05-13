# Architecture

## Overview

## Content Delivery

CloudFront -> Origin Shield -> S3
S3: GeoGuessr Images are stored in S3
Origin Shield: Region level caching
CloudFront: CDN to deliver S3 images and provide edge caching
TTL is set to 1 year, this is to make image latency as low as possible (However AWS automatically takes images off of cache if unused, making it not so effective)

## Data Layer

Metdata is stored in a table in DDB
Metadata table needs to be able to handle random lookups for a specific image category.
Hence the schema being made for index lookups:

### Metadata table Schema

Primary key:
Pk: s3Key (Image name)
Sk: Category (Specific category)

GSI:
Pk: Category (Specific category)
Sk: Index (Incremental index for random lookups by category)

For each category, it is a new row in ddb.

Image metadata columns are:
s3Key - Image name
category - specific category
index - specific index for random lookups
location - Image description
latitude
longitude

There are seperate columns to find the number of elements under a certain category:
s3Key - Specific category
category - Specific category
size - Number of elements under a category

an additional 'all' category is included for random lookups on all indices

### Random lookups

Lambda functions random access the metadata table through:

- First lookup category size with s3Key = category
- Lambda function randomly picks a number between 0 and category size
- Lambda function looks up table with {category: category, index: randomly picked index}

### Metadata writes

## Design Decisions

- **Why serverless?:** Zero infrastructure to manage, scales to zero when unused, and pay-per-request pricing keeps costs near $0 for a low-traffic project.

- **Why CloudFront for serving images?:** CloudFront is the AWS-recommended approach for serving static content from S3, providing edge caching and lower latency.

- **Why GitHub Actions?:** GitHub Actions was the most accessible CI/CD tool for our team. It runs Jest tests on every PR to catch breaking changes and automates image and metadata deployment on merge to main.

- **Why DynamoDB over RDS?:** DynamoDB's pay-per-request pricing makes it ideal for a low-traffic project. RDS would offer more flexible querying with SQL, but requires paying for a running instance, making it hard to justify for a project at this scale.
