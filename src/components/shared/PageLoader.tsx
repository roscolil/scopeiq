import { Spinner } from './Spinner'

interface PageLoaderProps {
  type?: 'documents' | 'projects' | 'profile' | 'default'
  message?: string
}

export const PageLoader = ({ type = 'default', message }: PageLoaderProps) => {
  const getLoadingMessage = () => {
    if (message) return message

    switch (type) {
      case 'documents':
        return 'Loading documents...'
      case 'projects':
        return 'Loading projects...'
      case 'profile':
        return 'Loading profile...'
      default:
        return 'Loading...'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" text={getLoadingMessage()} />
    </div>
  )
}

// Lightweight loader for small sections
export const SectionLoader = ({
  message = 'Loading...',
}: {
  message?: string
}) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Spinner size="md" text={message} />
      </div>
    </div>
  )
}

// Inline loader for buttons and small components
export const InlineLoader = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
  return (
    <div className="flex items-center justify-center">
      <Spinner size={size} text="" />
    </div>
  )
}
