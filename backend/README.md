## How to start

### Prerequisites
- [Node.js](https://nodejs.org/)
- [AWS CLI](https://aws.amazon.com/cli/)

### Install
```bash
cd backend && npm install
```

Requires AWS credentials configured via `aws configure`.

Create a `.env` file in `/backend`:

```
ACCOUNT=<your-aws-account-id>
REGION=us-west-1
ENVIRONMENT=<environment name>
```

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## Further documentation

- Architecture [docs/architecture.md](../docs/architecture.md)
- API [docs/openapi.yaml](../docs/openapi.yaml)
