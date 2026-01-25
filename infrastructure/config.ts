// Configuration file for environment variables

const config = {
 env: process.env.ENV || 'dev', // Default to 'dev' if ENV variable is not set
 app: process.env.APP || 'gitops-platform-aws', // Default app name
 githubOidcArn:
  process.env.GITHUB_OIDC_ARN ||
  'arn:aws:iam::695418593935:oidc-provider/token.actions.githubusercontent.com', // GitHub OIDC provider ARN
}

export default config
