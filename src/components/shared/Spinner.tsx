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
    lg: 'text-lg',
    xl: 'text-xl',
  }

  const iqTextSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-xl',
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
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Outer spinning ring - brighter colors */}
        <div className="absolute inset-0 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>

        {/* Inner spinning ring - counter rotation */}
        <div
          className={`absolute ${innerPadding[size]} rounded-full border-3 border-primary/50 border-b-primary animate-spin-reverse`}
          style={{ animationDuration: '1.5s' }}
        ></div>

        {/* Brand "IQ" text - much brighter */}
        <span
          className={`absolute inset-0 flex items-center justify-center text-white font-bold ${iqTextSizes[size]} tracking-wider drop-shadow-lg`}
        >
          IQ
        </span>
      </div>
      {text && (
        <p
          className={`text-white/80 ${textSizes[size]} text-center drop-shadow-sm`}
        >
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
        {content}
      </div>
    )
  }

  return content
}
