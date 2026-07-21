import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import crypto from 'crypto';

export class AppleAuthService {
  private teamId: string;
  private keyId: string;
  private privateKey: string;
  private encryptionKey: Buffer | null = null;
  private jwks: jwksClient.JwksClient;

  constructor() {
    this.teamId = process.env.APPLE_TEAM_ID || '';
    this.keyId = process.env.APPLE_KEY_ID || '';
    
    let pKey = process.env.APPLE_PRIVATE_KEY || '';
    if (pKey && !pKey.includes('\n') && pKey.split('\\n').length > 1) {
      pKey = pKey.replace(/\\n/g, '\n');
    }
    this.privateKey = pKey;

    const encKey = process.env.APPLE_TOKEN_ENCRYPTION_KEY;
    if (encKey) {
      const buf = Buffer.from(encKey, 'hex'); // Assuming hex encoding
      if (buf.length === 32) {
        this.encryptionKey = buf;
      } else {
        console.error('APPLE_TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters).');
      }
    }

    this.jwks = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      rateLimit: true
    });
  }

  isConfigured(): boolean {
    return !!(this.teamId && this.keyId && this.privateKey && this.encryptionKey);
  }

  private generateClientSecret(clientId: string): string {
    if (!this.isConfigured()) throw new Error('Apple server credentials are not fully configured.');
    
    const timeNow = Math.floor(Date.now() / 1000);
    const claims = {
      iss: this.teamId,
      iat: timeNow,
      exp: timeNow + 86400 * 180,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    };

    return jwt.sign(claims, this.privateKey, {
      algorithm: 'ES256',
      keyid: this.keyId,
    });
  }

  private async getApplePublicKey(kid: string): Promise<string> {
    const key = await this.jwks.getSigningKey(kid);
    return key.getPublicKey();
  }

  async validateIdentityToken(idToken: string, clientId: string, expectedSubject: string, nonce?: string): Promise<boolean> {
    try {
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || !decoded.header || !decoded.header.kid) return false;

      const publicKey = await this.getApplePublicKey(decoded.header.kid);

      const verified = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: clientId,
        subject: expectedSubject
      }) as jwt.JwtPayload;

      // Ensure exp is valid (handled by jsonwebtoken internally)
      if (nonce && verified.nonce !== nonce) {
        return false;
      }
      return true;
    } catch (e) {
      // Don't log specific token values or errors to avoid leak
      return false;
    }
  }

  encryptToken(token: string): string {
    if (!this.encryptionKey) throw new Error('Encryption key not configured.');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let ciphertext = cipher.update(token, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    
    return `v1:${iv.toString('base64')}:${authTag}:${ciphertext}`;
  }

  decryptToken(envelope: string): string {
    if (!this.encryptionKey) throw new Error('Encryption key not configured.');
    
    const parts = envelope.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('Unsupported or malformed token envelope');
    }

    const [, ivB64, authTagB64, ciphertextB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(ciphertextB64, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }

  async exchangeAuthorizationCode(code: string, clientId: string): Promise<string | null> {
    if (!this.isConfigured()) return null;

    const clientSecret = this.generateClientSecret(clientId);
    
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');

    try {
      const response = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.refresh_token) return null;

      return this.encryptToken(data.refresh_token);
    } catch (e) {
      return null;
    }
  }

  async revokeToken(envelope: string, clientId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;

    let token: string;
    try {
      token = this.decryptToken(envelope);
    } catch {
      return false; // Malformed token fails safely
    }

    const clientSecret = this.generateClientSecret(clientId);

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('token', token);
    params.append('token_type_hint', 'refresh_token');

    try {
      const response = await fetch('https://appleid.apple.com/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const appleAuthService = new AppleAuthService();
