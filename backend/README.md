## How to start

### First install AWS CLI

#### - AWS CLI https://aws.amazon.com/cli

**npm global install**
AWS CLI

```bash
npm install -g aws-cli
```

AWS CDK

```bash
npm install -g aws-cdk
```

also install packages in /backend

```bash
npm install
```

Can then check installations

```bash
aws --version
cdk --version
```

### Next need to be an iam user on UCSBGeoguessr account

- Owner (ian) can send an email for that

### Once you become an iam user, copy the AWS Access Key ID and AWS Secret Access Key given to you on sign up

- Now do aws configure, entering the two keys, then us-west-1 for region name, and None or json for output format
- to verify

```bash
aws sts get-caller-identity
```

### Also copy and paste .env for /backend

### Should be able to run cdk commands now (run them in /backend)

# API documentation

- In `/backend/api/openapi.yaml`
-   - Import the file into https://editor.swagger.io/ to get all the api's

# How to contribute

- Add endpoint in `/backend/helpers/config.ts`
- Add corresponding path as a nested file in `/backend/src`

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
