import { defineFunction } from '@aws-amplify/backend'

export const sendContactEmail = defineFunction({
  name: 'send-contact-email',
  entry: './handler.ts',
  // Add HTTP trigger for direct invocation
  timeoutSeconds: 30,
  memoryMB: 512,
})
