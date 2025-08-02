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
    // Initialize the speech recognition only once
    if (typeof window !== 'undefined' && !recognition) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI()

        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        recognitionInstance.lang = 'en-US'

        // Set longer speech segments for better transcription
        // This helps detect natural pauses better
        recognitionInstance.maxAlternatives = 1

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
          try {
            recognition.stop()
          } catch (error) {
            console.error('Error stopping recognition during cleanup:', error)
          }
        }
      }
    }
  }, [recognition, isListening])

  // Set up event handlers when recognition changes
  useEffect(() => {
    if (!recognition) return

    // Set up the result handler
    recognition.onresult = event => {
      console.log('Speech recognition result received')
      const currentTranscript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('')

      setTranscript(currentTranscript)
      onTranscript(currentTranscript)
    }

    // Set up the error handler
    recognition.onerror = event => {
      console.error('Speech recognition error', event.error)

      // Only toggle if we're supposed to be listening but got an error
      if (isListening) {
        console.log('Error occurred while listening, stopping recognition')
        toggleListening()
      }
    }

    // Set up the end handler
    recognition.onend = () => {
      // If we're still supposed to be listening but recognition ended,
      // restart it (this handles browser automatic timeout)
      if (isListening) {
        console.log('Recognition ended but still listening, restarting...')
        try {
          recognition.start()
        } catch (error) {
          console.error('Error restarting speech recognition:', error)
        }
      }
    }

    // Cleanup handlers when component unmounts or recognition changes
    return () => {
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null
    }
  }, [recognition, isListening, onTranscript, toggleListening])

  useEffect(() => {
    if (!recognition) return

    if (isListening) {
      try {
        console.log('Starting speech recognition')
        recognition.start()
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          console.error('Speech recognition permission denied:', error)
        } else if (
          error instanceof DOMException &&
          error.message.includes('already started')
        ) {
          console.log('Recognition already started, continuing...')
        } else {
          console.error('Error starting speech recognition:', error)
        }
      }
    } else {
      try {
        recognition.stop()
        setTranscript('')
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.message.includes('not started')
        ) {
          console.log('Recognition was not running, nothing to stop')
        } else {
          console.error('Error stopping speech recognition:', error)
        }
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
