# Mobile TTS Troubleshooting Guide

## 📱 Testing on Mobile

### Step 1: Check Browser Console Logs

**On iOS Safari:**

1. Connect iPhone to Mac
2. Mac: Safari > Develop > [Your iPhone] > [Your Tab]
3. Trigger TTS and watch for these logs:

```
📱 Mobile Audio Diagnostic
🔧 Initializing AWS Polly with Amplify credentials
🎵 Mobile Audio Debug: {
  isSafari: true,
  isIOS: true,
  isUnlocked: false/true,  ← KEY: Should be true
  userInteraction: false/true,
  contextUnlocked: false/true
}
```

**On Android Chrome:**

1. Enable USB debugging on phone
2. Chrome: `chrome://inspect`
3. Find your device and click "inspect"

### Step 2: Check for Audio Unlock Banner

When TTS is triggered on mobile, you should see:

- **Orange/gradient banner at TOP of screen** saying "Tap to enable audio"
- If you DON'T see this banner, audio might not be triggering at all

### Step 3: Common Issues & Fixes

#### Issue 1: Banner Shows But No Audio After Tapping

**Symptoms:** Banner appears, you tap it, but still no sound

**Debug:**

```javascript
// In browser console:
novaSonic.isAudioUnlocked() // Should return true after tapping
novaSonic.audioContextUnlocked // Should be true
novaSonic.userInteractionReceived // Should be true
```

**Fixes:**

- Check phone is not on silent/vibrate mode
- Check volume is up
- Try tapping banner TWICE
- Hard refresh: Hold power button, "Reload"

#### Issue 2: No Banner Appears

**Symptoms:** TTS triggers but banner never shows

**Cause:** Audio might already be "unlocked" but not playing

**Check:**

```javascript
// Console logs should show:
🎧 Trying Web Audio API path...
// OR
🎵 Using HTML5 Audio element path...
```

**Fixes:**

- Check phone volume (might be at 0)
- Check if audio is playing but muted:
  ```javascript
  // In console:
  document.querySelector('audio')?.muted // Should be false
  document.querySelector('audio')?.volume // Should be > 0
  ```

#### Issue 3: Audio Plays on Laptop But Silent on Mobile

**Symptoms:** Works perfectly on laptop, mobile is silent

**Most Common Causes:**

1. **Phone on Silent Mode** - Check physical silent switch (iPhone) or DND
2. **Browser Tab Muted** - Long-press tab in iOS Safari to check
3. **Volume at 0** - Use volume buttons to increase
4. **Bluetooth Connected** - Audio might be going to car/headphones

**Test with this:**

```javascript
// In mobile console:
const audio = new Audio()
audio.src =
  'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSGBzPHZizMIFG' +
  'U37+aZXR8MM6zh7bZtHwc0j9TzxnkoDSF2x/DajkALFWO17+idUxYLRZ/e8r10JQohes7v2Y43CBZitO7nln0jDDSk4e+uYhsFNI/S89+cLg4Xa7/y5ZI9BRBYlN75pG0eBC9+yPDYjzoJFWS76uaYUBkPQJ/l87FxIAciesjv1Y4wCBVjtOrmlVUZDT+f4vK8cSAG'
audio
  .play()
  .then(() => console.log('✅ Audio test played'))
  .catch(e => console.error('❌ Audio test failed:', e))
```

If this test fails, it's a device/browser issue, not your app.

### Step 4: iOS-Specific Checks

**Check Silent Mode:**

- Look for orange indicator on side switch
- Silent mode blocks ALL media audio (even with volume up!)

**Check Restrictions:**

- Settings > Screen Time > Content & Privacy > Allowed Apps
- Ensure Safari/Web Browser is not restricted

**Check Low Power Mode:**

- Low Power Mode can affect audio performance
- Settings > Battery > Turn off Low Power Mode

### Step 5: Force Unlock Audio Manually

If automatic unlock isn't working, try forcing it:

```javascript
// In mobile console:
await novaSonic.enableAudioForSafari()
await novaSonic.forceUnlockAudio()

// Then test:
await novaSonic.speak('Hello, testing audio on mobile')
```

### Expected Console Output (Working)

```
📱 Mobile Audio Diagnostic
  Device Info: { isMobile: true, isSafari: true, isIOS: true }
  AudioContext State: { state: "running", sampleRate: 48000 }
  HTML5 Audio Support: { canPlayMP3: "probably" }

🔧 Initializing AWS Polly with Amplify credentials:
  { region: "ap-southeast-2", credentialsSource: "Cognito Identity Pool" }
✅ AWS Polly client initialized with Amplify credentials

🎵 Requesting speech synthesis from AWS Polly...

🎵 Mobile Audio Debug: {
  isSafari: true,
  isIOS: true,
  isUnlocked: true,  ← MUST BE TRUE
  userInteraction: true,
  contextUnlocked: true
}

🎧 Trying Web Audio API path...
✅ Web Audio playback succeeded
```

### Emergency Fallback: Static Volume Test

If NOTHING works, test if mobile can play ANY audio:

1. Open: https://www.soundjay.com/button/beep-01a.wav
2. Tap play
3. If you hear it → Device audio works, app issue
4. If you don't hear it → Device audio problem

---

## 🆘 Quick Checklist

Before asking for help, verify:

- [ ] Volume is UP (not 0)
- [ ] Phone NOT on silent/vibrate mode
- [ ] No Bluetooth devices connected
- [ ] Browser tab NOT muted
- [ ] Console shows `isUnlocked: true` after tapping banner
- [ ] Console shows Polly client initialized successfully
- [ ] Test audio URL plays in new tab
- [ ] Other websites with audio work fine

## 💡 Most Likely Issue

**90% of mobile "TTS not working" is actually:**

1. Phone on silent mode (30%)
2. Volume at 0 (25%)
3. Banner not tapped / tapped before audio loaded (20%)
4. Bluetooth audio routing (15%)
5. Actual app bug (10%)
