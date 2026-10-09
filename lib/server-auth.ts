import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { verifyUserJwt, JwtUserPayload } from '@/lib/jwt';

export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

export function getAuthToken(cookieStore: { get(name: string): { value: string } | undefined }): string | undefined {
  return cookieStore.get('vaani_access_token')?.value ?? cookieStore.get('vaani_token')?.value;
}

export function getCognitoAccessToken(cookieStore: { get(name: string): { value: string } | undefined }): string | undefined {
  return getAuthToken(cookieStore);
}

export function getAuthenticatedUser(cookieStore: { get(name: string): { value: string } | undefined }): JwtUserPayload | null {
  const token = getAuthToken(cookieStore);
  if (!token) return null;
  return verifyUserJwt(token);
}
