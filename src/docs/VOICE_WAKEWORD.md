## Hands-Free Wake Word ("Hey Jacq")

### Overview

The hands-free wake word feature lets users activate the microphone and focus the AI query input by saying the phrase "Hey Jacq" while viewing a project. This improves accessibility and reduces friction in multi-task or on‑site scenarios (e.g., referencing drawings while verbally querying the system).

### Current Scope

| Aspect           | Behavior                                                                               |
| ---------------- | -------------------------------------------------------------------------------------- |
| Availability     | Active only on Project Details pages (where `AIActions` is present)                    |
| Wake Phrase      | "Hey Jacq" (fuzzy: tolerates minor variations like "hey jack")                         |
| After Trigger    | Focuses AI textarea (desktop) OR scrolls chat into view (mobile), then auto-starts mic |
| Cooldown         | ~4 seconds to avoid echo / re-trigger loops                                            |
| Auto Suspension  | Pauses during active dictation, tab visibility loss, or permission errors              |
| Storage          | Preference & consent stored locally (per-browser) via `localStorage`                   |
| UI Configuration | Settings > Voice tab                                                                   |

### Architecture

1. `useWakeWord` – Core hook wrapping the Web SpeechRecognition API (continuous, interim results). Includes:
   - Jittered restarts on normal `onend` events
   - Fuzzy Levenshtein matching across trailing token window
   - Cooldown and minimum interval guards
   - Suspend / resume logic (visibility, dictation state, manual disable)
2. `useWakeWordPreference` – Centralized preference + consent manager (keys: `wakeword.enabled`, `wakeword.consent.v1`) emitting `wakeword:preference-changed` events.
3. `ProjectDetails` – Owns the invisible wake listener (no floating badge). Supplies `onWake` handler that focuses input / scrolls and dispatches `wakeword:activate-mic` custom event.
4. `AIActions` – Listens for `wakeword:activate-mic` and invokes existing mic toggle. Displays a subtle non-interactive status pill when enabled.

### Consent & Privacy

The feature requires explicit user consent (accepted in Settings > Voice). Until accepted:

- No passive microphone access is initiated.
- All processing is local; interim audio is NOT transmitted until dictation starts.
- Disabling the feature stops recognition immediately and prevents restarts.

### Key LocalStorage Keys

| Key                   | Values                                   | Purpose                                                |
| --------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `wakeword.consent.v1` | `true` / `declined` / (absent = pending) | Tracks user decision                                   |
| `wakeword.enabled`    | `true` / `false`                         | Operational toggle (only meaningful if consent = true) |

### Events

| Event                         | Emitter              | Description                                                |
| ----------------------------- | -------------------- | ---------------------------------------------------------- |
| `wakeword:activate-mic`       | Project wake handler | Requests `AIActions` to start dictation after focus/scroll |
| `wakeword:preference-changed` | Preference hook      | Broadcasts toggle/consent changes to passive UI consumers  |

### Fuzzy Matching Logic (Simplified)

1. Stream interim transcript tokens.
2. Maintain a sliding tail window (last ~6 tokens).
3. Normalize to lowercase alphanumerics.
4. Compare each contiguous token slice to allowed phrase variants using Levenshtein distance (≤ 2 threshold).
5. On match → trigger handler → enter cooldown.

### Edge Cases & Mitigations

| Scenario                      | Mitigation                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Rapid repeated echoes         | Cooldown + minimum interval enforcement                                            |
| Tab hidden / background       | Auto suspend; restarts when visible                                                |
| Dictation active              | Wake listener paused to avoid double engines                                       |
| Permission denied mid-session | Transition to `error` state; requires user to re-enable after granting permissions |
| Mobile aggressive throttling  | Jittered restarts (600–1000ms) after benign `onend` events                         |

### Extensibility Roadmap

- Custom user-defined wake phrase (with validation + phonetic mapping)
- Multi-language phrase model / phoneme mapping
- On-device keyword spotting (WebAssembly model) fallback for lower latency
- Unified analytics for activation success vs. false positives (privacy-preserving counting only)

### Dev Notes

- Keep only one recognition instance active at a time (wake vs. dictation) to avoid edge browser CPU spikes.
- If integrating additional passive listeners, centralize arbitration logic in a higher-order controller to avoid race conditions.
- Avoid exposing internal wake state directly; rely on events / derived UI states to keep encapsulation.

### Testing Checklist

| Test                       | Expectation                                         |
| -------------------------- | --------------------------------------------------- |
| Consent not given          | No recognition attempts; no mic prompt              |
| Enable then say phrase     | Input focuses; mic starts within ~300ms after focus |
| Speak phrase twice quickly | Second attempt ignored (cooldown)                   |
| Switch browser tab         | Listener suspends; resumes on return (if enabled)   |
| Start dictation manually   | Wake listener suspends until dictation ends         |
| Disable in settings        | Listener stops; status pill reflects disabled state |

---

Maintained by: Voice / AI Integration layer. Update this document when expanding scope or altering event contracts.
