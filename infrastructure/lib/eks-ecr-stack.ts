import * as cdk from 'aws-cdk-lib'
import { Stack, StackProps, Tags } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import {
 Vpc,
 SubnetType,
 InstanceType,
 InstanceClass,
 InstanceSize,
} from 'aws-cdk-lib/aws-ec2'
// import * as eks from 'aws-cdk-lib/aws-eks'
import { Cluster, KubernetesVersion } from 'aws-cdk-lib/aws-eks'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecr from 'aws-cdk-lib/aws-ecr'
// import * as lambda from 'aws-cdk-lib/aws-lambda'
// import * as path from 'path'
import config from '../config'
import { KubectlV34Layer } from '@aws-cdk/lambda-layer-kubectl-v34'

interface TagMap {
 [key: string]: string
}

function addTagsToResource(resource: any, tags: TagMap): void {
 Object.entries(tags).forEach(([key, value]) => {
  Tags.of(resource).add(key, value)
 })
}

interface EksEcrStackProps extends StackProps {
 vpc: Vpc
 githubOidcArn: string
}

export class EksEcrStack extends Stack {
 constructor(scope: Construct, id: string, props: EksEcrStackProps) {
  super(scope, id, props)

  const { vpc, githubOidcArn } = props

  // Create EKS Cluster
  // Reference kubectl layer from lambda-layer directory
  //   const kubectlLayer = new lambda.LayerVersion(this, 'KubectlLayer', {
  //    code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda-layer')),
  //    compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
  //    description: 'Lambda layer for EKS kubectl operations',
  //   })

  const cluster = new Cluster(this, 'EksCluster', {
   version: KubernetesVersion.V1_28,
   vpc,
   vpcSubnets: [
    {
     subnetType: SubnetType.PRIVATE_WITH_EGRESS,
    },
   ],
   defaultCapacity: 0, // We'll use managed node groups instead
   clusterName: `${config.app}-eks-cluster-${config.env}`,
   kubectlLayer: new KubectlV34Layer(this, 'kubectl'),
  })

  // Add Managed Node Group
  cluster.addNodegroupCapacity('ManagedNodeGroup', {
   minSize: 2,
   maxSize: 4,
   desiredSize: 2,
   instanceTypes: [InstanceType.of(InstanceClass.T3, InstanceSize.SMALL)],
   diskSize: 30,
  })

  // Create IAM Role for GitHub Actions
  const githubOidcProvider =
   iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
    this,
    'GithubOIDCProvider',
    githubOidcArn
   )

  const githubActionsRole = new iam.Role(this, 'GitHubActionsRole', {
   assumedBy: new iam.OpenIdConnectPrincipal(githubOidcProvider, {
    StringEquals: {
     'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    },
    StringLike: {
     'token.actions.githubusercontent.com:sub': [
      'repo:kenneth-de-guzman/gitops-platform-aws/*',
      'repo:kenneth-de-guzman/gitops-platform-aws',
     ],
    },
   }),
   roleName: `${config.app}-github-actions-role-${config.env}`,
  })

  githubActionsRole.addManagedPolicy(
   iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess')
  )

  // Add policy to allow GitHub Actions to deploy via ArgoCD
  githubActionsRole.addToPrincipalPolicy(
   new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
     'eks:DescribeCluster',
     'eks:ListClusters',
     'eks:DescribeNodegroup',
     'eks:ListNodegroups',
    ],
    resources: [cluster.clusterArn],
   })
  )

  // Add policy to assume a role for ArgoCD deployment
  //   githubActionsRole.addToPrincipalPolicy(
  //    new iam.PolicyStatement({
  //     effect: iam.Effect.ALLOW,
  //     actions: ['sts:AssumeRole'],
  //     resources: [cluster.clusterArn],
  //    })
  //   )

  // Create ECR Repository for demo app
  const ecrRepo = new ecr.Repository(this, 'AppECR', {
   repositoryName: `${config.app}-app-${config.env}`,
   imageScanOnPush: true,
   encryption: ecr.RepositoryEncryption.AES_256,
   lifecycleRules: [
    {
     maxImageCount: 10,
    },
   ],
  })

  // Grant GitHub Actions role permission to push/pull from ECR
  ecrRepo.grantPullPush(githubActionsRole)

  // Tag all resources
  const tags: TagMap = {
   env: config.env,
   app: config.app,
  }
  addTagsToResource(cluster, tags)
  addTagsToResource(githubActionsRole, tags)
  addTagsToResource(ecrRepo, tags)
 }
}
