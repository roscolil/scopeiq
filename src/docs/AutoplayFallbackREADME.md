# Autoplay Fallback Button

Adds a UI control to manually start TTS playback when iOS/Safari blocks autoplay.

## How It Works

1. `novaSonic` attempts Web Audio playback first (Option 2). If blocked (NotAllowedError) or user interaction missing, it records a pending element and emits an internal autoplay-blocked signal.
2. `AutoplayFallbackButton` subscribes to `novaSonic.onAutoplayBlocked` and appears only if there is pending playback.
3. User taps the button -> calls `resumePendingAudio()`, clearing the blocked flag and hiding the button if successful.

## Usage

```tsx
import { AutoplayFallbackButton } from '@/components/voice'

function VoicePanel() {
  return (
    <div className="flex items-center gap-2">
      {/* existing voice controls */}
      <AutoplayFallbackButton className="ml-auto" />
    </div>
  )
}
```

## Service API Additions

- `onAutoplayBlocked(cb)` -> unsubscribe fn
- `hasPendingPlayback()`
- `resumePendingAudio()` (existing)
- `clearAutoplayBlockedFlag()`

## Styling

The button uses `variant="secondary" size="sm"` (shadcn/ui). Override via wrapper class.

## Testing Steps (iOS Safari)

1. Load page fresh; do NOT interact except starting a voice query that triggers TTS.
2. Observe button appears after ~400ms labelled _Play response_.
3. Tap button -> audio should play and button disappears.
4. Subsequent queries after first gesture should auto-play (unless another block occurs).

## Troubleshooting

- If button never appears: ensure `NotAllowedError` occurs (check console). Confirm `onAutoplayBlocked` triggers.
- If tap does nothing: verify `pendingAudio` exists in `novaSonic` (check `window._novaDebug = novaSonic`).
- If frequent blocks persist, consider combining Options 1 & 2 (already implemented) with a small user education tooltip.
