#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TodolistInfraCdkStack } from '../lib/todolist-infra-cdk-stack';

const app = new cdk.App();
new TodolistInfraCdkStack(app, 'TodolistInfraCdkStack');
