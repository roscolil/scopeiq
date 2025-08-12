# Biometric Authentication Feature Guide

## Overview

The biometric authentication feature allows users on mobile devices to sign in using their device's built-in security (fingerprint, Face ID, etc.) instead of typing their password every time. This leverages the WebAuthn API for secure, device-native authentication.

## How It Works

### 1. **Device-Native Security**

- Uses WebAuthn API with platform authenticators
- Leverages Touch ID, Face ID, fingerprint sensors, or other built-in biometric hardware
- No custom biometric data storage - relies entirely on device security

### 2. **Secure Credential Storage**

- User credentials are encrypted using device-generated keys
- Encryption keys are created during biometric setup using WebAuthn
- Credentials can only be decrypted when biometric authentication succeeds
- Each device has its own unique encryption key

### 3. **Seamless User Experience**

- **First Time**: User signs in normally, then optionally enables biometric login
- **Subsequent Visits**: One-tap biometric authentication
- **Fallback**: Traditional email/password always available

## Feature Appearance

### Mobile Sign-In Flow

#### For Users Without Biometric Setup:

```
┌─────────────────────────────┐
│     Sign in to your account │
├─────────────────────────────┤
│                             │
│ Email: [________________]   │
│                             │
│ Password: [_____________]🔍  │
│                             │
│ ┌─────────────────────────┐ │
│ │      Sign in           │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ ➕ Enable Biometric Login│ │
│ └─────────────────────────┘ │
│ Set up fingerprint or face  │
│ recognition for faster      │
│ sign-in                     │
└─────────────────────────────┘
```

#### For Users With Biometric Setup:

```
┌─────────────────────────────┐
│     Sign in to your account │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ 👆 Sign in with Biometric│ │
│ │                         │ │
│ └─────────────────────────┘ │
│ Use your fingerprint or face│
│ recognition to sign in      │
│ securely                    │
│                             │
│ ─── Or continue with email ──│
│                             │
│ Email: [________________]   │
│                             │
│ Password: [_____________]🔍  │
│                             │
│ ┌─────────────────────────┐ │
│ │      Sign in           │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## Technical Implementation

### Key Components

1. **SignIn.tsx** - Enhanced with biometric UI
2. **MobileBiometricLogin.tsx** - Biometric authentication component
3. **biometric-cognito.ts** - Core biometric service
4. **use-mobile.tsx** - Mobile device detection

### Security Features

- **Device Binding**: Credentials are bound to the specific device
- **Encrypted Storage**: All stored data is encrypted with device-specific keys
- **No Server Storage**: Biometric data never leaves the device
- **WebAuthn Standard**: Uses industry-standard authentication protocol
- **Fallback Security**: Traditional login always available

### Browser/Device Support

✅ **Supported Platforms:**

- iOS Safari (Touch ID, Face ID)
- Android Chrome (Fingerprint, Face Unlock)
- Android Firefox (Fingerprint)
- Desktop with Windows Hello, macOS Touch ID

❌ **Not Supported:**

- Desktop browsers without platform authenticators
- Older mobile browsers
- Devices without biometric hardware

## User Journey

### Initial Setup

1. User signs in with email/password normally
2. If on mobile device with biometric support, sees "Enable Biometric Login" button
3. Clicks button → Device prompts for biometric authentication
4. WebAuthn creates device-specific encryption key
5. User credentials are encrypted and stored locally
6. Setup complete - biometric login now available

### Daily Usage

1. User opens app on mobile device
2. Sees prominent "Sign in with Biometric" button
3. Taps button → Device prompts for fingerprint/face scan
4. Biometric authentication succeeds → Credentials decrypted
5. Automatic sign-in to AWS Cognito
6. Redirected to dashboard

### Error Handling

- **Biometric Fails**: Falls back to traditional email/password
- **Device Changed**: User needs to set up biometric login again
- **Browser Unsupported**: Biometric options hidden, normal login works

## Privacy & Security

### What's Stored Locally:

- Encrypted email and password
- Device fingerprint for validation
- Credential metadata (creation date, last used)
- WebAuthn credential IDs

### What's NOT Stored:

- Raw biometric data (stays on device)
- Unencrypted passwords
- Cross-device credentials

### Security Measures:

- AES-256-GCM encryption
- PBKDF2 key derivation (100,000 iterations)
- Device-specific salt
- Credential rotation support
- Secure deletion on logout

## Developer Notes

### Configuration Required:

1. HTTPS required for WebAuthn
2. Proper domain configuration in `rp.id`
3. AWS Cognito integration for sign-in

### Testing:

- Test on actual mobile devices (simulators may not support biometrics)
- Verify HTTPS in production
- Test fallback scenarios

### Future Enhancements:

- Multiple credential support per device
- Credential sync across devices (with user consent)
- Admin controls for biometric requirements
- Audit logging for biometric usage

## Code Examples

### Basic Integration:

```tsx
import { MobileBiometricLogin } from '@/components/MobileBiometricLogin'
import { useIsMobile } from '@/hooks/use-mobile'

const MySignInPage = () => {
  const isMobile = useIsMobile()

  return (
    <div>
      {isMobile && (
        <MobileBiometricLogin
          onLoginSuccess={() => navigate('/dashboard')}
          onSetupSuccess={() => setShowSuccess(true)}
        />
      )}
      {/* Traditional login form */}
    </div>
  )
}
```

### Check Biometric Support:

```tsx
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  hasBiometricCredentials,
} from '@/services/biometric-cognito'

const checkBiometricStatus = async () => {
  const supported = isBiometricSupported()
  const available = await isPlatformAuthenticatorAvailable()
  const hasSetup = hasBiometricCredentials()

  console.log({ supported, available, hasSetup })
}
```

## Browser Console Testing

For testing biometric functionality in development:

```javascript
// Check if WebAuthn is supported
console.log('WebAuthn supported:', !!window.PublicKeyCredential)

// Check platform authenticator availability
PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
  available => console.log('Platform authenticator available:', available),
)

// Check stored credentials
console.log(
  'Stored credential IDs:',
  JSON.parse(localStorage.getItem('biometric_credential_ids') || '[]'),
)
```

This feature provides a modern, secure, and user-friendly authentication experience that leverages the full power of mobile device security while maintaining compatibility with traditional login methods.
