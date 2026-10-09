import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'ap-south-1',
});

export function getCognitoAccessToken(cookieStore: { get(name: string): { value: string } | undefined }): string | undefined {
  return cookieStore.get('vaani_access_token')?.value;
}
