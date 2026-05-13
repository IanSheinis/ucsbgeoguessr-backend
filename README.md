# GeoGuessr Clone
UCSB GeoGuessr was built by a team of 7 where I had full ownership over the CI/CD pipeline and backend. 
The game displays images of the UCSB campus and players have to guess where they are on a map.
The CI/CD pipeline allowed developers to continuously deploy proprietary images. The backend delivered those images randomly to the frontend along with metadata (coordinates, category, image name). 

- The main UCSBGeoGuessr repo is private, so this contains my backend
  contributions + additional changes for fun.
- This version deploys images of tourist attractions sourced from Wikidata via a [scraper script](assets/scripts/README.md) (the original used proprietary UCSB campus images instead).

**Tech stack:** AWS CDK, Lambda, DynamoDB, S3, CloudFront, API Gateway, GitHub Actions, Jest, (Frontend: React Native + Expo, private repo)



## Architecture

![Architecture Diagram](docs/architecture.png)

- **Image delivery:** S3 for image storage + Cloudfront for delivery and caching

- **Metadata API:** API Gateway as proxy + Lambda for endpoint logic + Dynamo DB for metadata storage
  
- **Deployment:** Images deployed via GitHub Actions -> CDK deploys, uploading images to S3 and Metadata to DDB via Lambdas

For design decisions and trade-offs, see [Architecture Docs](docs/architecture.md).

API reference: [OpenAPI Spec](docs/openapi.yaml)

## How to Run

See [backend/README.md](backend/README.md) for full setup details
