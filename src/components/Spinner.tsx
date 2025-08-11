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
    sm: 'w-6 h-6', // was w-8 h-8 (8*0.75 = 6)
    md: 'w-12 h-12', // was w-16 h-16 (16*0.75 = 12)
    lg: 'w-18 h-18', // was w-24 h-24 (24*0.75 = 18)
    xl: 'w-24 h-24', // was w-32 h-32 (32*0.75 = 24)
  }

  const textSizes = {
    sm: 'text-xs', // keeping text-xs as it's already smallest
    md: 'text-xs', // was text-sm, scaling down to text-xs
    lg: 'text-lg', // was text-xl, scaling down to text-lg
    xl: 'text-xl', // was text-2xl, scaling down to text-xl
  }

  const iqTextSizes = {
    sm: 'text-xs', // keeping text-xs as it's already smallest
    md: 'text-xs', // was text-sm, scaling down to text-xs
    lg: 'text-lg', // was text-xl, scaling down to text-lg
    xl: 'text-xl', // was text-2xl, scaling down to text-xl
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
        <p className={`text-gray-400 ${textSizes[size]} text-center`}>{text}</p>
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
