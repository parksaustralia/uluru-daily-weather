import { Stack } from "../lib/stack";
import { SynthUtils } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";

test("matches snapshot", () => {
  const app = new cdk.App();
  const stack = new Stack(app, "MyTestStack");
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
