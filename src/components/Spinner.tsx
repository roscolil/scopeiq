interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullScreen?: boolean
  className?: string
  text?: string
}

export const Spinner = ({
  size = 'md',
  fullScreen = false,
  className = '',
  text = 'Loading...',
}: SpinnerProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-2xl',
  }

  const iqTextSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-2xl',
  }

  const innerPadding = {
    sm: 'inset-1',
    md: 'inset-2',
    lg: 'inset-4',
    xl: 'inset-6',
  }

  const innerCircle = {
    sm: 'inset-2',
    md: 'inset-4',
    lg: 'inset-8',
    xl: 'inset-12',
  }

  const content = (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <div
          className={`absolute ${innerPadding[size]} rounded-full border-4 border-secondary border-b-transparent animate-spin-slow`}
        ></div>
        <div
          className={`absolute ${innerCircle[size]} rounded-full bg-primary/20 animate-pulse`}
        ></div>
        <span
          className={`absolute inset-0 flex items-center justify-center text-primary font-bold ${iqTextSizes[size]}`}
        >
          IQ
        </span>
      </div>
      {text && (
        <p className={`text-muted-foreground ${textSizes[size]} text-center`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex justify-center items-center h-screen">{content}</div>
    )
  }

  return content
}
