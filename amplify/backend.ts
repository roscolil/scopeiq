import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { storage } from './storage/resource'
import { postConfirmation } from './functions/post-confirmation/resource'

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
  postConfirmation,
})

// Grant the post-confirmation function access to the data resources
backend.data.resources.tables['User'].grantWriteData(
  backend.postConfirmation.resources.lambda,
)
backend.data.resources.tables['Company'].grantWriteData(
  backend.postConfirmation.resources.lambda,
)
