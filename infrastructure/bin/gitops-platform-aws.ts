#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { GitopsPlatformAwsStack } from '../lib/gitops-platform-aws-stack'
import { CommonNetworkStack } from '../lib/common-network-stack'
import { EksEcrStack } from '../lib/eks-ecr-stack'
import config from '../config'

const app = new cdk.App()

// Environment configuration
const env = {
 account: process.env.AWS_ACCOUNT_ID || '695418593935',
 region: process.env.AWS_REGION || 'ap-southeast-2',
}

// Create Common Network Stack first
const commonNetworkStack = new CommonNetworkStack(app, 'CommonNetworkStack', {
 env,
})

// Create EKS/ECR Stack with VPC from Common Network Stack
new EksEcrStack(app, 'EksEcrStack', {
 env,
 vpc: commonNetworkStack.vpc,
 githubOidcArn: config.githubOidcArn,
})

app.synth()
