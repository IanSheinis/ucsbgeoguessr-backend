# TODO
Document ddb architecture decision
modify dynamodb.ts lambda
- Row for no category count
 - Get this from length of metadata list
 - category all, use global index
- Row for each category count
 - Hash map for category counts
 - Categories added as category: s3Key: cat, length: length
    - Access category random value through 0... length-1
 - _all category for 
modify lambda function random look up
modify apigw and lambda function not sending images
Add warm caching with github actions looping through imgConfig w/ curl

Arch
- DDB first deletes all, then writes in 25 batches
- DDB schema
- Cloudfront origin shield
- Cloudfront ttl 1 year
