import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  AuthFlowType,
  GetUserCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '@/lib/server-auth';
import { query } from '@/lib/server-db';

const clientId = process.env.COGNITO_CLIENT_ID;

function requireClientId(): string {
  if (!clientId) throw new Error('COGNITO_CLIENT_ID is not configured');
  return clientId;
}

function userFromAttributes(attributes: { Name?: string; Value?: string }[] | undefined) {
  const get = (name: string) => attributes?.find((attribute) => attribute.Name === name)?.Value;
  const id = get('sub');
  if (!id) throw new Error('Cognito user has no subject');
  return { id, email: get('email'), user_metadata: { full_name: get('name') } };
}

async function currentUser() {
  const token = cookies().get('vaani_access_token')?.value;
  if (!token) return null;
  const result = await cognitoClient.send(new GetUserCommand({ AccessToken: token }));
  return userFromAttributes(result.UserAttributes);
}

async function ensureProfile(user: { id: string; email?: string; user_metadata?: { full_name?: string } }) {
  await query(
    `INSERT INTO profiles (id, email, full_name) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = COALESCE(EXCLUDED.full_name, profiles.full_name)`,
    [user.id, user.email ?? '', user.user_metadata?.full_name ?? null],
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: 'session' | 'sign-in' | 'sign-up' | 'sign-out';
      email?: string;
      password?: string;
      fullName?: string;
    };
    if (body.action === 'session') {
      const user = await currentUser();
      return NextResponse.json({ data: { session: user ? {
        access_token: cookies().get('vaani_access_token')?.value,
        user,
      } : null } });
    }
    if (body.action === 'sign-out') {
      cookies().delete('vaani_access_token');
      cookies().delete('vaani_id_token');
      return NextResponse.json({ data: null });
    }
    if (!body.email || !body.password) throw new Error('Email and password are required');
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) throw new Error('COGNITO_USER_POOL_ID is not configured');
    if (body.action === 'sign-up') {
      const result = await cognitoClient.send(new SignUpCommand({
        ClientId: requireClientId(),
        Username: body.email,
        Password: body.password,
        UserAttributes: [
          { Name: 'email', Value: body.email },
          ...(body.fullName ? [{ Name: 'name', Value: body.fullName }] : []),
        ],
      }));
      if (!result.UserSub) throw new Error('Cognito did not return a user ID');
      if (!result.UserConfirmed) {
        throw new Error('Account created. Confirm your email in Cognito before signing in.');
      }
      return NextResponse.json({ data: null });
    }
    const result = await cognitoClient.send(new InitiateAuthCommand({
      ClientId: requireClientId(),
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: { USERNAME: body.email, PASSWORD: body.password },
    }));
    if (!result.AuthenticationResult?.AccessToken) {
      throw new Error('Additional Cognito authentication challenge is required');
    }
    const accessToken = result.AuthenticationResult.AccessToken;
    const userResult = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
    const user = userFromAttributes(userResult.UserAttributes);
    await ensureProfile(user);
    cookies().set('vaani_access_token', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/', maxAge: 60 * 60,
    });
    if (result.AuthenticationResult.IdToken) {
      cookies().set('vaani_id_token', result.AuthenticationResult.IdToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
        path: '/', maxAge: 60 * 60,
      });
    }
    return NextResponse.json({ data: {
      access_token: accessToken,
      user,
    } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
