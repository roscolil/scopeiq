import { defineBackend } from '@aws-amplify/backend'
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { storage } from './storage/resource'
import { postConfirmation } from './functions/post-confirmation/resource'
import { sendContactEmail } from './functions/send-contact-email/resource'

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
  postConfirmation,
  sendContactEmail,
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
