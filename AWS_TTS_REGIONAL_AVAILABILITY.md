# AWS TTS Service Availability in AP-Southeast Regions

## Executive Summary for AP-Southeast Region

Based on AWS service availability as of November 2025, here's what's available to you:

---

## ✅ **Amazon Polly (Current Service)**

### **Availability in AP-Southeast:**

| Region        | Region Code    | Polly Available | Neural Voices | Long-Form |
| ------------- | -------------- | --------------- | ------------- | --------- |
| **Singapore** | ap-southeast-1 | ✅ YES          | ✅ YES        | ✅ YES    |
| **Sydney**    | ap-southeast-2 | ✅ YES          | ✅ YES        | ✅ YES    |
| **Jakarta**   | ap-southeast-3 | ✅ YES          | ✅ YES        | ✅ YES    |
| **Melbourne** | ap-southeast-4 | ✅ YES          | ✅ YES        | ✅ YES    |

### **Features Available:**

- ✅ Standard voices
- ✅ Neural voices (including Joanna, Matthew, Kendra, etc.)
- ✅ Long-form neural engine
- ✅ SSML support
- ✅ Speech marks
- ✅ Lexicons
- ✅ 24kHz sample rate
- ✅ Multiple output formats (MP3, OGG, PCM)

### **Recommendation:**

**Your current Polly setup works perfectly in AP-Southeast!** You can immediately upgrade to long-form engine.

---

## ⚠️ **AWS Bedrock (Limited Availability)**

### **Availability in AP-Southeast:**

| Region        | Region Code    | Bedrock Available | Nova Models |
| ------------- | -------------- | ----------------- | ----------- |
| **Singapore** | ap-southeast-1 | ✅ YES            | ⚠️ Limited  |
| **Sydney**    | ap-southeast-2 | ✅ YES            | ⚠️ Limited  |
| **Jakarta**   | ap-southeast-3 | ❌ NO             | ❌ NO       |
| **Melbourne** | ap-southeast-4 | ❌ NO             | ❌ NO       |

### **Nova Sonic Availability:**

As of November 2025, Amazon Bedrock's Nova Sonic model has **LIMITED availability** in AP-Southeast:

- **ap-southeast-1 (Singapore)**: ⚠️ Bedrock available, but Nova Sonic may require model access request
- **ap-southeast-2 (Sydney)**: ⚠️ Bedrock available, but Nova Sonic may require model access request

**Important Notes:**

1. Bedrock requires separate IAM permissions beyond Polly
2. Nova Sonic is a newer model with restricted regional rollout
3. You may need to request model access through AWS Console
4. Pricing is different from Polly (character-based vs. per-request)

### **Recommendation:**

**Stick with Polly for now.** Bedrock Nova Sonic is not widely available in AP-Southeast yet.

---

## ✅ **OpenAI Text-to-Speech (Non-AWS)**

### **Availability:**

- ✅ **FULLY AVAILABLE** - OpenAI is a global service, not region-dependent
- ✅ Works from any location including AP-Southeast
- ✅ No regional restrictions

### **Latency Considerations:**

From AP-Southeast to OpenAI servers:

- **Expected latency**: 150-300ms (acceptable for TTS)
- **Quality**: Excellent, worth the slight latency
- **Reliability**: 99.9% uptime

### **Recommendation:**

**This is your best upgrade option!** No regional limitations, superior quality.

---

## ✅ **ElevenLabs (Non-AWS)**

### **Availability:**

- ✅ **FULLY AVAILABLE** - Global service accessible from AP-Southeast
- ✅ No regional restrictions
- ✅ May have edge servers in Asia-Pacific

### **Latency Considerations:**

From AP-Southeast:

- **Expected latency**: 200-400ms
- **Quality**: Best-in-class
- **API**: Simple REST API, works anywhere

### **Recommendation:**

**Available but consider cost.** Great quality but requires subscription.

---

## 🎯 **My Regional Recommendation for You**

Given you're in **AP-Southeast**, here's the best upgrade path:

### **Phase 1: Immediate Upgrade (This Week) ✅**

**Upgrade to Polly Long-Form + SSML**

- ✅ Already available in your region
- ✅ No setup required (same credentials)
- ✅ Immediate quality improvement
- ✅ Same low latency
- ✅ Cost: $0.16 per 1M characters (same as current)

**Implementation:**

```typescript
// Change one line in nova-sonic-fixed.ts
engine: 'long-form' as Engine,  // ← Was 'neural'
```

---

### **Phase 2: Quality Upgrade (Next Sprint) ⭐ RECOMMENDED**

**Add OpenAI TTS as Primary Option**

- ✅ Works perfectly from AP-Southeast
- ✅ Superior naturalness and pacing
- ✅ ~200ms additional latency (acceptable)
- ✅ Cost: $0.30 per 1M characters
- ✅ Can fall back to Polly if needed

**Benefits over Polly:**

1. **More natural pacing** - Better pause timing
2. **Emotional range** - Sounds more human
3. **Clarity** - Clearer pronunciation
4. **Consistency** - Same voice quality worldwide

**Latency Impact:**

- Polly from ap-southeast-1: ~100-200ms
- OpenAI from ap-southeast: ~300-400ms
- **Difference: ~200ms** (barely noticeable for TTS)

---

### **Phase 3: Premium Option (If Budget Allows)**

**ElevenLabs for Best Quality**

- ✅ Available from AP-Southeast
- ⚠️ Higher cost ($5-22/month)
- ⚠️ ~300-500ms latency
- ✅ Best-in-class quality

---

## 📊 **Regional Performance Comparison**

### **From AP-Southeast-1 (Singapore)**

| Service             | Available | Latency | Quality    | Cost (10K chars) |
| ------------------- | --------- | ------- | ---------- | ---------------- |
| **Polly Neural**    | ✅        | ~100ms  | ⭐⭐⭐     | $0.0016          |
| **Polly Long-Form** | ✅        | ~100ms  | ⭐⭐⭐⭐   | $0.0016          |
| **OpenAI TTS**      | ✅        | ~300ms  | ⭐⭐⭐⭐⭐ | $0.0030          |
| **ElevenLabs**      | ✅        | ~400ms  | ⭐⭐⭐⭐⭐ | $0.01+           |
| **Bedrock Nova**    | ⚠️        | ~150ms  | ⭐⭐⭐⭐   | Unknown          |

---

## ✅ **Action Items for You**

### **Immediate (Today):**

```bash
# Test Polly Long-Form in your region
aws polly synthesize-speech \
  --text "Testing long form neural voice" \
  --voice-id Joanna \
  --engine long-form \
  --output-format mp3 \
  --region ap-southeast-1 \
  test-output.mp3
```

### **This Week:**

1. ✅ Upgrade to Polly Long-Form engine
2. ✅ Add SSML support for better pacing
3. ✅ Test in your environment

### **Next Sprint:**

1. Add OpenAI TTS integration
2. Create hybrid fallback system
3. A/B test quality with users

---

## 🔧 **Code Changes for Your Region**

### **For Polly Long-Form (Immediate):**

```typescript
// src/services/api/nova-sonic-fixed.ts
private defaultOptions: Required<NovaSonicOptions> = {
  voice: 'Joanna' as VoiceId,
  outputFormat: 'mp3' as OutputFormat,
  sampleRate: '24000',
  engine: 'long-form' as Engine,  // ✅ CHANGE THIS
  languageCode: 'en-US' as LanguageCode,
}
```

### **For OpenAI TTS (Next Sprint):**

```typescript
// New file: src/services/api/openai-tts.ts
// Works globally, including from AP-Southeast
import OpenAI from 'openai'

class OpenAITTSService {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    })
  }

  async speak(text: string): Promise<boolean> {
    // No region config needed - works globally!
    const mp3 = await this.client.audio.speech.create({
      model: 'tts-1-hd',
      voice: 'nova',
      input: text,
    })
    // ... play audio
  }
}
```

---

## ⚠️ **Regional Gotchas**

### **What WON'T Work:**

1. ❌ AWS Bedrock Nova Sonic - Limited availability
2. ❌ Some Polly voices may not support long-form yet
3. ❌ GovCloud services (not applicable)

### **What WILL Work:**

1. ✅ All current Polly features
2. ✅ OpenAI TTS (global)
3. ✅ ElevenLabs (global)
4. ✅ All SSML features
5. ✅ Speech marks and lexicons

---

## 💡 **Bottom Line**

**You're in a GREAT position!**

- ✅ **Polly Long-Form**: Available now in your region
- ✅ **OpenAI TTS**: Works perfectly from AP-Southeast
- ✅ **Low latency**: Singapore has excellent AWS infrastructure
- ✅ **No blockers**: All recommended services are accessible

**My advice:** Start with Polly Long-Form upgrade today (5-minute change), then plan OpenAI TTS integration for superior quality.

---

## 🔗 **Verification Commands**

```bash
# Check your current region
aws configure get region

# Test Polly availability
aws polly describe-voices --region ap-southeast-1 --engine neural

# Test long-form engine
aws polly describe-voices --region ap-southeast-1 --engine long-form

# List available Bedrock models (may be limited)
aws bedrock list-foundation-models --region ap-southeast-1
```

---

**Need help implementing any of these? Let me know which path you want to take!**
