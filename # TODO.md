# TODO

Document ddb architecture decision
modify lambda function random look up
modify apigw and lambda function not sending images
Add warm caching with github actions looping through imgConfig w/ curl

Arch

- DDB first deletes all, then writes in 25 batches
- DDB schema
- Cloudfront origin shield
- Cloudfront ttl 1 year
