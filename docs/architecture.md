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
