#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { Stack } from "../lib/stack";

const app = new cdk.App();
new Stack(app, "Uluru Weather Daily Email Stack");
