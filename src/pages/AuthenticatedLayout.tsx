// AuthenticatedLayout.tsx
import { Outlet } from 'react-router-dom'
import { Authenticator } from '@aws-amplify/ui-react'

const AuthenticatedLayout = () => (
  <Authenticator>
    <Outlet />
  </Authenticator>
)

export default AuthenticatedLayout
