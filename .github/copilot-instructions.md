# GitH## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: AWS Amplify Gen 2, DynamoDB, Lambda Functions, S3
- **Package Manager**: pnpm (use `pnpm install`, `pnpm dev`, etc.)
- **AI/ML**: OpenAI GPT models, AWS Bedrock, Pinecone vector search
- **Voice**: Web Speech API, AWS Polly (nova-sonic voice)
- **UI**: shadcn/ui components, Lucide React iconslot Instructions

## Project Overview

Jacq of All Trades is a React + TypeScript application with AWS Amplify backend for document analysis and AI-powered insights. The app features voice recognition, document processing, and intelligent search capabilities.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: AWS Amplify Gen 2, DynamoDB, Lambda Functions, S3
- **AI/ML**: OpenAI GPT models, Pinecone vector search
- **Voice**: Web Speech API, AWS Polly (nova-sonic voice)
- **UI**: shadcn/ui components, Lucide React icons

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ai/             # AI-related components (AIActions, chat)
│   ├── auth/           # Authentication components
│   ├── documents/      # Document processing components
│   ├── layout/         # Layout and navigation
│   ├── projects/       # Project management
│   ├── shared/         # Shared utilities
│   ├── ui/             # shadcn/ui base components
│   ├── upload/         # File upload functionality
│   └── voice/          # Voice recognition components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and configurations
├── pages/              # Page components
├── services/           # API and external service integrations
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Code Conventions

### TypeScript

- Use strict TypeScript with proper typing
- Define interfaces for all props and data structures
- Use generic types where appropriate
- Prefer `interface` over `type` for object shapes

### React Components

- Use functional components with hooks
- Use React.memo() for performance optimization when needed
- Prefer named exports over default exports for components
- Use TypeScript interface for component props

### Styling

- Use Tailwind CSS classes for styling
- Follow mobile-first responsive design
- Use CSS variables for consistent theming
- Prefer Tailwind utilities over custom CSS

### Voice Recognition

- Platform-specific optimizations for Safari mobile and Android Chrome
- Use continuous: true and interimResults: true for Safari mobile
- Implement duplicate prevention for Android Chrome
- Include 2-second silence detection for auto-submission
- Handle permissions properly for mobile browsers

### State Management

- Use React hooks (useState, useEffect, useCallback, useMemo)
- Use refs for values that don't trigger re-renders
- Implement proper cleanup in useEffect hooks
- Use context for global state when needed

### Error Handling

- Use try-catch blocks for async operations
- Provide user-friendly error messages
- Log errors to console for debugging
- Implement graceful fallbacks

### AWS Integration

- Use Amplify Gen 2 patterns
- Implement proper authentication flows
- Use DynamoDB for data persistence
- Leverage Lambda functions for backend logic

## File Naming

- Components: PascalCase (e.g., `VoiceShazamButton.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useVoiceRecognition.ts`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types: PascalCase (e.g., `DocumentTypes.ts`)

## Import Organization

```typescript
// 1. React and external libraries
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

// 2. Internal components and hooks
import { VoiceShazamButton } from '@/components/voice/VoiceShazamButton'
import { useAuth } from '@/hooks/useAuth'

// 3. Types and utilities
import type { Document } from '@/types/DocumentTypes'
import { formatDate } from '@/utils/formatDate'
```

## Voice Recognition Best Practices

- Always check for browser support before initializing
- Implement platform-specific configurations
- Use refs to prevent duplicate submissions
- Handle permissions gracefully on mobile
- Provide clear user feedback during recognition
- Clean up event listeners and timers properly

## Performance Considerations

- Use React.memo() for expensive components
- Implement proper dependency arrays in useEffect
- Use useCallback and useMemo to prevent unnecessary re-renders
- Lazy load components when appropriate
- Optimize bundle size with proper tree shaking

## Security

- Sanitize user inputs
- Use proper authentication flows
- Implement role-based access control (RBAC)
- Validate data on both client and server side
- Follow AWS security best practices

## Testing

- Write unit tests for utility functions
- Test component behavior with React Testing Library
- Mock external dependencies in tests
- Test error scenarios and edge cases

## Documentation

- Use JSDoc comments for complex functions
- Document component props with TypeScript interfaces
- Include usage examples in component files
- Keep README files up to date
