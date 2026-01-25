import { Tags, Stack, StackProps } from 'aws-cdk-lib'
import { IConstruct } from 'constructs'
import { Construct } from 'constructs'
import { Vpc, SubnetType } from 'aws-cdk-lib/aws-ec2'
import config from '../config'

interface TagMap {
 [key: string]: string
}

function addTagsToResource(resource: IConstruct, tags: TagMap): void {
 Object.entries(tags).forEach(([key, value]) => {
  Tags.of(resource).add(key, value)
 })
}

export class CommonNetworkStack extends Stack {
 public readonly vpc: Vpc

 constructor(scope: Construct, id: string, props?: StackProps) {
  super(scope, id, props)

  // Create a VPC with public and private subnets
  // The VPC construct automatically creates:
  // - 1 Internet Gateway (for public subnets)
  // - 1 NAT Gateway (for private subnets with natGateways: 1)
  // - Associated route tables for both public and private subnets
  this.vpc = new Vpc(this, 'GitOps-VPC', {
   maxAzs: 2, // Default is all AZs in region
   natGateways: 1,
   subnetConfiguration: [
    {
     cidrMask: 24,
     name: 'PublicSubnet',
     subnetType: SubnetType.PUBLIC,
    },
    {
     cidrMask: 24,
     name: 'PrivateSubnet',
     subnetType: SubnetType.PRIVATE_WITH_EGRESS,
    },
   ],
  })

  // Tagging resources
  const tags: TagMap = {
   env: config.env,
   app: config.app,
  }
  addTagsToResource(this.vpc, tags)
 }
}
