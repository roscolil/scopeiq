import { useState, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  isListening: boolean
  toggleListening: () => void
}

export const VoiceInput = ({
  onTranscript,
  isListening,
  toggleListening,
}: VoiceInputProps) => {
  const [transcript, setTranscript] = useState<string>('')
  const [recognition, setRecognition] = useState<
    typeof SpeechRecognition | null
  >(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI()

        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        recognitionInstance.lang = 'en-US'

        recognitionInstance.onresult = event => {
          const currentTranscript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('')

          setTranscript(currentTranscript)
          onTranscript(currentTranscript)
        }

        recognitionInstance.onerror = event => {
          console.error('Speech recognition error', event.error)
          if (isListening) {
            toggleListening()
          }
        }

        recognitionInstance.onend = () => {
          if (isListening) {
            recognitionInstance.start()
          }
        }

        setRecognition(recognitionInstance)
      } else {
        console.error('Speech Recognition API is not supported in this browser')
      }
    }

    return () => {
      if (recognition) {
        recognition.onresult = null
        recognition.onend = null
        recognition.onerror = null
        if (isListening) {
          recognition.stop()
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!recognition) return

    if (isListening) {
      try {
        recognition.start()
      } catch (error) {
        console.error('Error starting speech recognition:', error)
      }
    } else {
      try {
        recognition.stop()
        setTranscript('')
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
      }
    }
  }, [isListening, recognition])

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      onClick={toggleListening}
      className="shrink-0"
    >
      {isListening ? (
        <MicOff className="w-5 h-5 text-red-500" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </Button>
  )
}
