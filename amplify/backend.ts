import { defineBackend } from '@aws-amplify/backend'
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { storage } from './storage/resource'
import { postConfirmation } from './functions/post-confirmation/resource'
import { preTokenGeneration } from './functions/pre-token-generation/resource'
import { sendContactEmail } from './functions/send-contact-email/resource'
import { sendInvitationEmail } from './functions/send-invitation-email/resource'
import { pineconeSearch } from './functions/pinecone-search/resource'

// Get the current directory in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env file in the root directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
  postConfirmation,
  preTokenGeneration,
  sendContactEmail,
  sendInvitationEmail,
  pineconeSearch,
})

// Configure the contact email function
const emailFunction = backend.sendContactEmail.resources.lambda

// Add SES permissions
emailFunction.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  }),
)

// Add environment variables
backend.sendContactEmail.addEnvironment('SES_FROM_EMAIL', 'ross@exelion.ai')
backend.sendContactEmail.addEnvironment('SES_TO_EMAIL', 'ross@exelion.ai')
backend.sendContactEmail.addEnvironment('NODE_ENV', 'production')

// Configure the invitation email function
const invitationEmailFunction = backend.sendInvitationEmail.resources.lambda

// Add SES permissions for invitation emails
invitationEmailFunction.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  }),
)

// Add environment variables for invitation emails
backend.sendInvitationEmail.addEnvironment('SES_FROM_EMAIL', 'ross@exelion.ai')
backend.sendInvitationEmail.addEnvironment('NODE_ENV', 'production')

// Configure Pinecone environment variables
const pineconeApiKey = process.env.PINECONE_API_KEY || process.env.VITE_PINECONE_API_KEY
const pineconeIndexName = process.env.PINECONE_INDEX_NAME || process.env.VITE_PINECONE_INDEX_NAME || 'scopeiq-documents'

// Use the loaded environment variable or fallback to placeholder for build
const apiKeyForLambda = pineconeApiKey || 'PLACEHOLDER_FOR_BUILD'

backend.pineconeSearch.addEnvironment('PINECONE_API_KEY', apiKeyForLambda)
backend.pineconeSearch.addEnvironment('PINECONE_INDEX_NAME', pineconeIndexName)

// NOTE: Polly permissions need to be added manually to the Cognito Identity Pool role
// Run this AWS CLI command after deployment:
// aws iam put-role-policy --role-name <authenticated-role-name> --policy-name PollyTTS --policy-document file://polly-policy.json
