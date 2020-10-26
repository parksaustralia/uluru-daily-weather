#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { UluruWeatherInstallStack } from '../lib/uluru-weather-install-stack';

const app = new cdk.App();
new UluruWeatherInstallStack(app, 'UluruWeatherInstallStack');
