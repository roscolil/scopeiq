// import { useEffect, useState } from 'react'
// import { getCurrentUser } from 'aws-amplify/auth'

// /**
//  * Returns an array of Cognito group names (roles) for the current user.
//  * Returns [] if the user is not authenticated or has no groups.
//  */
// export async function getCurrentUserRoles(): Promise<string[]> {
//   try {
//     const user = await getCurrentUser()
//     // Cognito groups are stored in the groups property or in the idToken payload under 'cognito:groups'
//     return user.groups ?? user.idToken?.payload?.['cognito:groups'] ?? []
//   } catch {
//     return []
//   }
// }
