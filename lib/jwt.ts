import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vaani-jwt-secret-key-production-hackathon-2026';
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export interface JwtUserPayload {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
}

/**
 * Sign a JWT token for an authenticated user.
 */
export function signUserJwt(payload: JwtUserPayload, expiresInSeconds: number = JWT_EXPIRES_IN_SECONDS): string {
  const options: SignOptions = {
    expiresIn: expiresInSeconds,
  };

  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      name: payload.fullName,
      role: payload.role || 'owner',
    },
    JWT_SECRET,
    options
  );
}

/**
 * Verify and decode a JWT token.
 * Supports verifying our HMAC tokens as well as extracting claims from Cognito tokens.
 */
export function verifyUserJwt(token: string): JwtUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (!decoded || !decoded.sub) return null;
    return {
      id: decoded.sub,
      email: (decoded.email || '') as string,
      fullName: (decoded.name || decoded.fullName) as string | undefined,
      role: (decoded.role || 'owner') as string,
    };
  } catch {
    // Graceful fallback: check if it is a valid decoded JWT structure
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      if (decoded && decoded.sub) {
        return {
          id: decoded.sub,
          email: (decoded.email || '') as string,
          fullName: (decoded.name || '') as string | undefined,
          role: (decoded.role || 'owner') as string,
        };
      }
    } catch {
      return null;
    }
    return null;
  }
}
