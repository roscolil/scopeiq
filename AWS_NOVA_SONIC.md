# AWS Nova Sonic Integration

## Overview

This implementation uses AWS Bedrock's Nova Sonic model to provide advanced AI-powered text-to-speech functionality for voice prompts in the AI query interface.

## Key Components

### 1. NovaSonicService (`src/services/nova-sonic.ts`)

- **Core Service**: Handles communication with AWS Bedrock Nova Sonic model
- **Features**:
  - High-quality AI voice synthesis
  - Multiple voice options (Ruth, Kendra, Joy, etc.)
  - Configurable voice parameters (stability, style, etc.)
  - Direct browser audio playback
  - Error handling and fallbacks

### 2. NovaSonicPrompts Component (`src/components/NovaSonicPrompts.tsx`)

- **React Integration**: User interface for Nova Sonic functionality
- **Features**:
  - Context-aware prompts (welcome, guidance, listening)
  - Beautiful UI with gradient styling and AI icons
  - Loading states and tooltips
  - Development test mode
  - Accessibility features

### 3. AIActions Integration

Nova Sonic is integrated into the AI query interface in multiple ways:

- **Welcome Message**: In the pro-tip section with custom contextual text
- **Guidance Examples**: Next to voice input with predefined examples
- **Listening Feedback**: Automatic prompts when voice input starts
- **Completion Notifications**: Voice confirmation when AI analysis completes
- **No Results Guidance**: Helpful suggestions when searches return empty

## Configuration

### AWS Setup Required:

1. **AWS Credentials**: Must be configured in environment variables
2. **Bedrock Access**: Nova Sonic model must be enabled in your AWS region
3. **IAM Permissions**: Bedrock runtime permissions required

### Environment Variables:

```env
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
VITE_AWS_REGION=your_region (must support Nova Sonic)
```

### Model Configuration:

- **Model ID**: `amazon.nova-sonic-v1:0`
- **Default Voice**: Ruth (female, professional)
- **Output Format**: MP3 for web compatibility
- **Sample Rate**: 24kHz for high quality

## Voice Options

Nova Sonic supports multiple voices:

- **Ruth** (default) - Professional female voice
- **Kendra** - Clear female voice
- **Joy** - Expressive female voice
- **Matthew** - Professional male voice
- **Gregory** - Deep male voice
- **Miguel** - Warm male voice
- **Olivia** - Young female voice
- **Burr** - Authoritative male voice

## Features

### Intelligent Voice Prompts:

- **Welcome**: Contextual introduction based on document/project
- **Listening**: Clear instructions when voice input is active
- **Guidance**: Examples of questions users can ask
- **Completion**: Confirmation when AI analysis finishes
- **No Results**: Helpful suggestions when searches fail

### Advanced Configuration:

```typescript
await novaSonic.speak('Hello world', {
  voice: 'Ruth',
  stability: 0.8, // Voice consistency (0.0-1.0)
  similarityBoost: 0.7, // Voice clarity (0.0-1.0)
  style: 0.6, // Expressiveness (0.0-1.0)
  outputFormat: 'mp3',
  sampleRate: '24000',
})
```

### Error Handling:

- Graceful degradation when AWS is unavailable
- Clear error messages for debugging
- Fallback to standard browser notifications

## Usage Examples

### Basic Usage:

```typescript
import { novaSonic } from '@/services/nova-sonic'

// Check availability
if (novaSonic.isAvailable()) {
  // Speak predefined prompt
  await novaSonic.speakPrompt('welcome')

  // Speak custom text
  await novaSonic.speak('Custom message here')
}
```

### Component Usage:

```tsx
<NovaSonicPrompts
  context="guidance"
  voice="Ruth"
  disabled={isLoading}
  onPromptComplete={() => console.log('Done')}
/>
```

## Benefits over Standard TTS

1. **AI-Powered**: More natural and expressive than browser TTS
2. **Consistent**: Same voice experience across all browsers/devices
3. **High Quality**: Professional-grade audio synthesis
4. **Configurable**: Fine-tune voice characteristics
5. **Reliable**: Cloud-based, not dependent on device capabilities

## Technical Architecture

```
User Action → NovaSonicPrompts → NovaSonicService → AWS Bedrock → Audio Playback
```

1. **User Interaction**: Clicks voice prompt button
2. **Component Logic**: Determines context and text
3. **Service Call**: Sends request to Nova Sonic via Bedrock
4. **Audio Generation**: AWS processes text to speech
5. **Browser Playback**: Audio streams directly to user

## Integration Points

- **Pro Tips Section**: Welcome message with context
- **Voice Controls**: Guidance examples alongside voice input
- **State Changes**: Automatic prompts for listening, completion, errors
- **User Feedback**: Voice confirmation of actions and results

This implementation provides a premium AI voice experience that enhances user interaction with the document analysis system through natural, contextual voice guidance.
