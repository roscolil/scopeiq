import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Loader2, Sparkles } from 'lucide-react'
import { novaSonic } from '@/services/nova-sonic'
import { useToast } from '@/hooks/use-toast'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NovaSonicPromptsProps {
  onPromptComplete?: () => void
  disabled?: boolean
  context?: 'welcome' | 'listening' | 'guidance' | 'custom'
  customText?: string
  voice?:
    | 'Joanna'
    | 'Salli'
    | 'Kendra'
    | 'Ivy'
    | 'Ruth'
    | 'Matthew'
    | 'Justin'
    | 'Joey'
    | 'Brian'
    | 'Amy'
    | 'Emma'
    | 'Olivia'
}

export const NovaSonicPrompts: React.FC<NovaSonicPromptsProps> = ({
  onPromptComplete,
  disabled = false,
  context = 'guidance',
  customText,
  voice = 'Ruth',
}) => {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if Nova Sonic service is available
    setIsAvailable(novaSonic.isAvailable())
  }, [])

  const handleSpeak = async () => {
    if (!isAvailable || disabled || isSpeaking) return

    setIsSpeaking(true)

    try {
      let success = false

      switch (context) {
        case 'welcome':
          success = await novaSonic.speakPrompt('welcome', { voice })
          break
        case 'listening':
          success = await novaSonic.speakPrompt('listening', { voice })
          break
        case 'guidance':
          success = await novaSonic.speakPrompt('guidance', { voice })
          break
        case 'custom':
          if (customText) {
            success = await novaSonic.speak(customText, { voice })
          } else {
            throw new Error('Custom text required for custom context')
          }
          break
        default:
          success = await novaSonic.speakPrompt('guidance', { voice })
      }

      if (success) {
        toast({
          title: 'Nova Sonic completed',
          description: 'AI voice guidance has been spoken.',
        })
        onPromptComplete?.()
      } else {
        throw new Error('Failed to synthesize speech')
      }
    } catch (error) {
      console.error('Nova Sonic error:', error)
      toast({
        title: 'Voice prompt failed',
        description:
          'Could not play AI voice guidance. Check your AWS configuration.',
        variant: 'destructive',
      })
    } finally {
      setIsSpeaking(false)
    }
  }

  const handleTest = async () => {
    if (!isAvailable || isSpeaking) return

    setIsSpeaking(true)
    try {
      const success = await novaSonic.testService()
      if (success) {
        toast({
          title: 'Nova Sonic test successful',
          description: 'AWS Nova Sonic is working correctly.',
        })
      }
    } catch (error) {
      toast({
        title: 'Nova Sonic test failed',
        description: 'Check your AWS credentials and region settings.',
        variant: 'destructive',
      })
    } finally {
      setIsSpeaking(false)
    }
  }

  // Don't render if not available
  if (!isAvailable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex items-center gap-1 text-xs opacity-50"
            >
              <VolumeX className="h-3 w-3" />
              <span className="hidden sm:inline">Unavailable</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nova Sonic not available - check AWS configuration</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const getButtonText = () => {
    switch (context) {
      case 'welcome':
        return '🎙️'
      case 'listening':
        return 'Guide'
      case 'guidance':
        return 'Examples'
      case 'custom':
        return 'Speak'
      default:
        return 'AI Voice'
    }
  }

  const getTooltipText = () => {
    switch (context) {
      case 'welcome':
        return 'Play AI welcome message with Nova Sonic'
      case 'listening':
        return 'Hear AI listening instructions'
      case 'guidance':
        return 'Hear AI examples of questions you can ask'
      case 'custom':
        return 'Speak custom text with AI voice'
      default:
        return 'Get AI voice guidance'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex gap-1">
            <Button
              onClick={handleSpeak}
              disabled={disabled || isSpeaking}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-xs bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100"
            >
              {isSpeaking ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                  <VolumeX className="h-3 w-3 text-purple-600" />
                </>
              ) : (
                <>
                  <Volume2 className="h-3 w-3 text-purple-600" />
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  <span className="hidden sm:inline font-medium text-purple-700">
                    {getButtonText()}
                  </span>
                </>
              )}
            </Button>

            {/* Test button for debugging */}
            {process.env.NODE_ENV === 'development' && (
              <Button
                onClick={handleTest}
                disabled={isSpeaking}
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-xs"
                title="Test Nova Sonic"
              >
                🧪
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isSpeaking ? 'Nova Sonic is speaking...' : getTooltipText()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Powered by AWS Nova Sonic AI
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default NovaSonicPrompts
