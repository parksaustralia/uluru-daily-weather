# Uluṟu daily weather email

Run daily in AWS Lambda this code generates a draft email in SendGrid pulling the BOM forecast data for Yulara (Uluṟu).

It retrieves the [Handlebars template from Sendgrid](https://mc.sendgrid.com/design-library/your-designs/2ae424d3-fb38-4610-a9c5-396ed535191c/preview) and executes a first pass render with both the forecast data and also the [fixed annual sunrise, sunset and opening hours data](./lib/data.ts).

It posts the rendered HTML back to SendGrid as a [draft email](https://mc.sendgrid.com/single-sends). The [mailing lists](https://mc.sendgrid.com/contacts/lists/d28c612e-a9f2-4b32-992f-5041612ed19f) and [unsubscribe groups](https://mc.sendgrid.com/unsubscribe-groups/15890/edit/preview/unsubscribe) are set automatically.

The code runs daily at 4:15 pm Darwin time. After which the UKTNP staff can log into SendGrid to [review the draft message](https://mc.sendgrid.com/single-sends), adjust any messaging where required, and press send.

This project is set up and deployed using [AWS CDK](https://docs.aws.amazon.com/cdk/).

## Development

This project requires [Node.js 12.x](https://nodejs.org/en/download/releases/) and that you have [AWS credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) configured in order to deploy.

- `npm install`
- `npm run test`
- `npm run debug`

The project includes a Github Codespaces config that will create an environment with all of the require dependencies installed. All that is required after creating the codespace is to run `aws configure` and enter your AWS API keys and region.

You may also like to set your SendGrid API key for local development and debugging:

`export SENDGRID_API_KEY="SG.<snip>"`

## Deployment

First the [SendGrid API key](#sendgrid-api-key) must be set in the account using AWS secrets manager.

Then you can deploy the stack with:

```
npm run cdk deploy
```

## SendGrid API key

The SendGrid API key is stored in AWS Secrets Manager and is pulled when deploying the application.

To set the key:

```
aws secretsmanager create-secret --name uluruWeather/sendgridApiKey --description "SendGrid API key" --secret-string "<key>"
```

To change the key, the secret needs to first be updated and then the CDK stack redeployed:

```
aws secretsmanager update-secret --name uluruWeather/sendgridApiKey --description "SendGrid API key" --secret-string "<key>"
```
