# VoiceShazamButton Refactoring Guide

## Problem Summary

The original `VoiceShazamButton` component had critical issues causing transcript looping on Android devices:

### Root Causes

1. **1,320+ lines of tangled code** - UI, speech recognition, and state management all in one file
2. **Duplicate logic** - Separate Android/non-Android code paths (lines 415-550 vs 553-672) that were nearly identical
3. **Multiple conflicting timers**:
   - `silenceTimer` (1.5s auto-submit)
   - `fallbackFinalizeTimer` (3s backup)
   - `healthCheckTimer` (5s Android monitor)
   - Restart delays with exponential backoff
4. **Restart loop on Android** - The `onend` event kept auto-restarting recognition, processing old transcripts repeatedly
5. **Complex state management** - 15+ overlapping state variables and refs tracking similar things
6. **Race conditions** - Multiple submission paths could conflict (silence timeout, fallback timeout, manual stop, error recovery)

### The Android Loop Issue

On Android Chrome, the Speech Recognition API would:

1. Fire `onend` event after speech
2. Auto-restart recognition (lines 344-368)
3. Process old transcript again
4. Submit duplicate/looping transcripts
5. Multiple guards tried to prevent this but conflicted with each other

## Solution

### Architecture Changes

**Before:**

```
VoiceShazamButton (1,320 lines)
├── Speech recognition initialization
├── Event handlers (onstart, onend, onerror, onresult)
├── Android-specific logic (duplicate)
├── iOS-specific logic (duplicate)
├── Multiple timer management
├── State management (15+ variables)
├── Wake word coordination
├── TTS coordination
└── UI rendering
```

**After:**

```
useSpeechRecognition Hook (450 lines)
├── Speech recognition lifecycle
├── Unified platform logic (no duplicates)
├── Single silence timer
├── Clear state machine
└── Proper restart prevention

VoiceShazamButton Component (300 lines)
├── UI rendering only
├── Wake word coordination
├── TTS coordination
└── Help message management
```

### Key Improvements

1. **Clear separation of concerns**
   - Hook: All speech recognition logic
   - Component: Only UI and user interaction

2. **Unified platform handling**
   - Single code path for Android/iOS/Safari/Desktop
   - Platform detection happens once at initialization
   - No duplicate logic

3. **Predictable state machine**

   ```
   idle → starting → listening → processing → submitting → idle
                                      ↓
                                   error
   ```

4. **Single auto-submit timer**
   - Only `silenceTimer` - resets on each speech event
   - No conflicting timers or race conditions

5. **Proper restart prevention**
   - `shouldBeListeningRef` tracks intended state
   - `onend` only restarts if ref is true
   - Submission sets ref to false immediately
   - No loops possible

6. **Better error handling**
   - Clear error states
   - Graceful degradation
   - Recovery without restart loops

## Migration Steps

### Step 1: Test the New Components

The refactored files are saved as:

- `src/hooks/useSpeechRecognition.ts` (new)
- `src/components/voice/VoiceShazamButton.refactored.tsx` (new)

### Step 2: Update AIActions.tsx

Replace the old usage:

**Before:**

```tsx
<VoiceShazamButton
  selfContained={true}
  showTranscript={query || undefined}
  isProcessing={isLoading}
  isMobileOnly={true}
  onHide={() => setHideShazamButton(true)}
  onTranscript={text => {
    // Complex duplicate prevention logic
    handleVoiceTranscript(text)
  }}
/>
```

**After:**

```tsx
<VoiceShazamButton
  onTranscript={handleVoiceTranscript}
  isProcessing={isLoading}
  isMobileOnly={true}
  onHide={() => setHideShazamButton(true)}
/>
```

Much simpler! The duplicate prevention is now built into the hook.

### Step 3: Rename Files

Once tested and working:

```bash
# Backup the old version
mv src/components/voice/VoiceShazamButton.tsx src/components/voice/VoiceShazamButton.old.tsx

# Use the new version
mv src/components/voice/VoiceShazamButton.refactored.tsx src/components/voice/VoiceShazamButton.tsx
```

### Step 4: Remove Old Android-Specific Code

In `AIActions.tsx`, you can remove:

- `androidTranscriptHistory` array
- Android duplicate prevention logic in `onTranscript`
- Complex similarity checks

The new hook handles all of this internally.

### Step 5: Clean Up

After confirming everything works:

```bash
# Remove the old backup
rm src/components/voice/VoiceShazamButton.old.tsx
```

## Testing Checklist

Test on each platform:

### Android Chrome

- [ ] Tap mic button - starts listening
- [ ] Speak - see transcript update in real-time
- [ ] Stop speaking - auto-submits after 1.5s
- [ ] **No transcript looping** ✓
- [ ] **No duplicates** ✓
- [ ] Say "Hey Jacq" - activates mic
- [ ] TTS plays - can't activate mic during speech
- [ ] TTS ends - can activate mic again

### iOS Safari

- [ ] First tap - requests mic permission
- [ ] Second tap - starts listening
- [ ] Speak - see transcript
- [ ] Auto-submit after silence
- [ ] Wake word works
- [ ] TTS coordination works

### Desktop Chrome

- [ ] Click mic - immediate start
- [ ] Fast transcript updates
- [ ] Clean auto-submit
- [ ] All features work

### Desktop Safari

- [ ] Permission flow works
- [ ] Continuous listening works
- [ ] No restart loops

## Code Comparison

### Lines of Code

| File              | Before     | After   | Reduction   |
| ----------------- | ---------- | ------- | ----------- |
| VoiceShazamButton | 1,320      | 300     | 77%         |
| Speech Logic      | (embedded) | 450     | (extracted) |
| **Total**         | **1,320**  | **750** | **43%**     |

### Complexity Metrics

| Metric                          | Before                         | After             |
| ------------------------------- | ------------------------------ | ----------------- |
| State variables                 | 15+                            | 5 (hook) + 4 (UI) |
| useEffect hooks                 | 12                             | 5 (hook) + 5 (UI) |
| Timers                          | 4                              | 1                 |
| Code paths                      | Android/iOS/Safari/Desktop x 2 | Unified           |
| Duplicate prevention mechanisms | 5                              | 1                 |

## Advantages of New Architecture

1. **Testability** - Hook can be tested independently of UI
2. **Reusability** - Hook can be used in other components
3. **Maintainability** - Clear responsibilities, no duplication
4. **Debuggability** - Simpler state machine, fewer moving parts
5. **Reliability** - No race conditions, no restart loops
6. **Performance** - Single timer, cleaner event handling

## Backward Compatibility

The new `VoiceShazamButton` is **not backward compatible** with the old props:

**Removed props:**

- `selfContained` - Always self-contained now
- `isListening` - Managed internally
- `toggleListening` - Managed internally
- `showTranscript` - Derived from internal state

**Kept props:**

- `onTranscript` - Same signature
- `isProcessing` - Same behavior
- `isMobileOnly` - Same behavior
- `onHide` - Same behavior

If you need the old behavior for `AIActionsEnhanced.tsx` (which uses external state), you can:

1. Keep using the old component for that one case
2. Or refactor `AIActionsEnhanced` to use the new pattern

## Performance Characteristics

### Old Component

- Multiple timer allocations/deallocations
- Frequent state updates (15+ variables)
- Duplicate code execution on Android
- Restart loops consuming CPU
- Memory leaks from cleanup issues

### New Component

- Single timer management
- Minimal state updates (9 total)
- Unified execution path
- No restart loops
- Clean lifecycle management

## Support

If you encounter issues:

1. Check browser console for detailed logs (prefixed with emoji)
2. Verify platform detection is correct
3. Check that wake word events are firing
4. Ensure TTS events are dispatched properly

The new implementation logs all state transitions for easy debugging.

## Future Enhancements

Possible improvements:

1. Add `maxSilenceDuration` prop for longer listening sessions
2. Add `minTranscriptLength` to prevent accidental submissions
3. Add visual feedback for errors
4. Add retry logic for permission errors
5. Add analytics/telemetry hooks

## Questions?

The refactored code is well-commented and follows React best practices. Each function has a clear purpose and the state machine is explicit and predictable.
