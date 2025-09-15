import React from 'react'
import { Loader2 } from 'lucide-react'

interface IQPageLoaderProps {
  message?: string
  subMessage?: string
  minHeightClass?: string
  showProgress?: boolean
  progress?: number
}

export const IQPageLoader: React.FC<IQPageLoaderProps> = ({
  message = 'Loading...',
  subMessage,
  minHeightClass = 'min-h-[40vh]',
  showProgress = false,
  progress = 0,
}) => {
  return (
    <div
      className={`${minHeightClass} w-full flex flex-col items-center justify-center gap-4 animate-fade-in`}
    >
      <div className="relative">
        <Loader2 className="h-10 w-10 text-cyan-300 animate-spin" />
        <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm md:text-base tracking-wide font-medium text-cyan-200">
          {message}
        </p>
        {subMessage && (
          <p className="text-xs uppercase tracking-wider text-cyan-300/70">
            {subMessage}
          </p>
        )}
        {showProgress && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-24 h-1 bg-cyan-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <span className="text-xs text-cyan-300/60">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default IQPageLoader
