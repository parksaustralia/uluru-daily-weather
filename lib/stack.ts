import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNode from "@aws-cdk/aws-lambda-nodejs";
import * as secretsManager from "@aws-cdk/aws-secretsmanager";

export class Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new lambdaNode.NodejsFunction(this, "Handler", {
      environment: {
        SENDGRID_API_KEY: `${
          secretsManager.Secret.fromSecretAttributes(this, "sendgridApiKey", {
            secretArn:
              "arn:aws:secretsmanager:ap-southeast-2:819490137741:secret:uluruWeather/sendgridApiKey-OokPfO",
          }).secretValue
        }`,
      },
      memorySize: 3008,
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
    });

    const target = new LambdaFunction(handler);

    // Execute daily at 4:15 pm Darwin time
    new Rule(this, "ScheduleRule", {
      schedule: Schedule.cron({ minute: "45", hour: "6" }),
      targets: [target],
    });
  }
}
