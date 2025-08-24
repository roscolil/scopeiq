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
    sm: 'w-8 h-8 min-w-8 min-h-8',
    md: 'w-16 h-16 min-w-16 min-h-16',
    lg: 'w-24 h-24 min-w-24 min-h-24',
    xl: 'w-32 h-32 min-w-32 min-h-32',
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
    lg: 'inset-3',
    xl: 'inset-4',
  }

  const borderWidths = {
    sm: 'border-2',
    md: 'border-4',
    lg: 'border-4',
    xl: 'border-[6px]',
  }

  const innerBorderWidths = {
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-4',
    xl: 'border-4',
  }

  const innerCircle = {
    sm: 'inset-2',
    md: 'inset-4',
    lg: 'inset-8',
    xl: 'inset-12',
  }

  const content = (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className={`relative ${sizeClasses[size]} flex-shrink-0`}>
        {/* Outer spinning ring - brighter colors */}
        <div className={`absolute inset-0 rounded-full ${borderWidths[size]} border-white/30 border-t-white animate-spin`}></div>

        {/* Inner spinning ring - counter rotation */}
        <div
          className={`absolute ${innerPadding[size]} rounded-full ${innerBorderWidths[size]} border-primary/50 border-b-primary animate-spin-reverse`}
          style={{ animationDuration: '1.5s' }}
        ></div>

        {/* Brand "IQ" text - emerald gradient to match header */}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-bold ${iqTextSizes[size]} tracking-wider drop-shadow-lg`}
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
