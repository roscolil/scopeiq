/**
 * Simplified Biometric Authentication for AWS Cognito Integration
 *
 * This service provides biometric authentication that works with AWS Cognito
 * by securely storing encrypted credentials locally and using biometric unlock
 */

interface StoredCredentials {
  email: string
  encryptedPassword: string
  deviceFingerprint: string
  createdAt: string
  lastUsed: string
  credentialId: string // Add credential ID for lookup
}

interface BiometricSetupResult {
  success: boolean
  error?: string
}

interface BiometricLoginResult {
  success: boolean
  credentials?: { email: string; password: string }
  error?: string
}

/**
 * Check if biometric authentication is supported
 */
export function isBiometricSupported(): boolean {
  // Check for HTTPS requirement
  if (
    typeof window !== 'undefined' &&
    window.location.protocol !== 'https:' &&
    window.location.hostname !== 'localhost'
  ) {
    console.warn('WebAuthn requires HTTPS or localhost')
    return false
  }

  const isSupported = !!(
    window.PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get &&
    window.crypto &&
    window.crypto.subtle
  )

  return isSupported
}

/**
 * Check if platform authenticator is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isBiometricSupported()) return false

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Generate a device-specific encryption key using WebAuthn
 */
async function generateDeviceKey(
  userId: string,
): Promise<{ key: CryptoKey; credentialId: string }> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  // Get the appropriate RP ID for the current environment
  const hostname = window.location.hostname
  const rpId = hostname === 'localhost' ? 'localhost' : hostname

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Jack of All Trades', id: rpId },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: 'Biometric Login',
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required', // Store credential on device
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential

  if (!credential) {
    throw new Error('Failed to create device key')
  }

  const credentialId = btoa(
    String.fromCharCode(...new Uint8Array(credential.rawId)),
  )

  // Generate a key for encryption from the credential
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    credential.rawId,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('scopeiq-biometric'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  return { key, credentialId }
}

/**
 * Encrypt password using device-specific key
 */
async function encryptPassword(
  password: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encodedPassword = new TextEncoder().encode(password)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedPassword,
  )

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt password using device-specific key
 */
async function decryptPassword(
  encryptedData: string,
  key: CryptoKey,
): Promise<string> {
  const combined = new Uint8Array(
    [...atob(encryptedData)].map(c => c.charCodeAt(0)),
  )
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted,
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Setup biometric authentication for a user
 */
export async function setupBiometricAuth(
  email: string,
  password: string,
): Promise<BiometricSetupResult> {
  try {
    if (!(await isPlatformAuthenticatorAvailable())) {
      return {
        success: false,
        error: 'Biometric authentication not available on this device',
      }
    }

    // Generate device-specific encryption key using biometric authentication
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const { key: deviceKey, credentialId } = await generateDeviceKey(userId)

    // Encrypt the password
    const encryptedPassword = await encryptPassword(password, deviceKey)

    // Store encrypted credentials with credential ID for lookup
    const credentials: StoredCredentials = {
      email,
      encryptedPassword,
      deviceFingerprint: await getDeviceFingerprint(),
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      credentialId,
    }

    // Store by credential ID for lookup without email
    localStorage.setItem(
      `biometric_creds_${credentialId}`,
      JSON.stringify(credentials),
    )

    // Also store a list of all credential IDs for enumeration
    const existingIds = JSON.parse(
      localStorage.getItem('biometric_credential_ids') || '[]',
    )
    existingIds.push(credentialId)
    localStorage.setItem(
      'biometric_credential_ids',
      JSON.stringify(existingIds),
    )

    return { success: true }
  } catch (error) {
    console.error('Biometric setup failed:', error)

    let errorMessage = 'Failed to setup biometric authentication'
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric setup was cancelled or not allowed'
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error - ensure you are on HTTPS'
      } else if (error.name === 'NotSupportedError') {
        errorMessage =
          'Biometric authentication is not supported on this device'
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'Device is in an invalid state for biometric setup'
      } else if (error.name === 'ConstraintError') {
        errorMessage = 'Biometric constraints not satisfied'
      } else {
        errorMessage = `Setup failed: ${error.message}`
      }
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Authenticate using biometric and get decrypted credentials
 */
export async function authenticateWithBiometric(): Promise<BiometricLoginResult> {
  try {
    // Get list of stored credential IDs
    const credentialIds = JSON.parse(
      localStorage.getItem('biometric_credential_ids') || '[]',
    )
    if (credentialIds.length === 0) {
      return {
        success: false,
        error: 'No biometric credentials found on this device',
      }
    }

    // Create authentication challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32))

    // Convert credential IDs to the format needed for WebAuthn
    const allowCredentials = credentialIds.map((id: string) => ({
      id: Uint8Array.from(atob(id), c => c.charCodeAt(0)),
      type: 'public-key' as const,
    }))

    // Request biometric authentication
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        timeout: 60000,
        userVerification: 'required',
      },
    })) as PublicKeyCredential

    if (!assertion) {
      return {
        success: false,
        error: 'Biometric authentication failed',
      }
    }

    // Get the credential ID that was used
    const usedCredentialId = btoa(
      String.fromCharCode(...new Uint8Array(assertion.rawId)),
    )

    // Load the stored credentials for this credential ID
    const storedData = localStorage.getItem(
      `biometric_creds_${usedCredentialId}`,
    )
    if (!storedData) {
      return {
        success: false,
        error: 'Credential data not found',
      }
    }

    const credentials: StoredCredentials = JSON.parse(storedData)

    // Recreate the device key for decryption
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      assertion.rawId,
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    )

    const deviceKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('scopeiq-biometric'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )

    // Decrypt the password
    const password = await decryptPassword(
      credentials.encryptedPassword,
      deviceKey,
    )

    // Update last used timestamp
    credentials.lastUsed = new Date().toISOString()
    localStorage.setItem(
      `biometric_creds_${usedCredentialId}`,
      JSON.stringify(credentials),
    )

    return {
      success: true,
      credentials: { email: credentials.email, password },
    }
  } catch (error) {
    console.error('Biometric authentication failed:', error)

    let errorMessage = 'Biometric authentication failed'
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric authentication was cancelled'
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error - ensure you are on HTTPS'
      }
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Check if any biometric credentials exist on this device
 */
export function hasBiometricCredentials(): boolean {
  const credentialIds = JSON.parse(
    localStorage.getItem('biometric_credential_ids') || '[]',
  )
  return credentialIds.length > 0
}

/**
 * Remove all biometric credentials from this device
 */
export function removeAllBiometricCredentials(): boolean {
  try {
    const credentialIds = JSON.parse(
      localStorage.getItem('biometric_credential_ids') || '[]',
    )

    // Remove each credential
    credentialIds.forEach((id: string) => {
      localStorage.removeItem(`biometric_creds_${id}`)
    })

    // Remove the credential IDs list
    localStorage.removeItem('biometric_credential_ids')

    return true
  } catch {
    return false
  }
}

/**
 * Get device fingerprint for additional security
 */
async function getDeviceFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('Device fingerprint', 2, 2)

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|')

  const encoder = new TextEncoder()
  const data = encoder.encode(fingerprint)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

/**
 * Clear all biometric credentials from device
 */
export async function clearBiometricCredentials(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Get list of stored credential IDs
    const credentialIds = JSON.parse(
      localStorage.getItem('biometric_credential_ids') || '[]',
    )

    // Remove all stored credentials
    for (const credentialId of credentialIds) {
      localStorage.removeItem(`biometric_creds_${credentialId}`)
    }

    // Clear the credential IDs list
    localStorage.removeItem('biometric_credential_ids')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to clear biometric credentials',
    }
  }
}
