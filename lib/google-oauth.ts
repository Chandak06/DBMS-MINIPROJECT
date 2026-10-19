const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_OAUTH_STATE_COOKIE = "clf_google_oauth_state";

export type GoogleUserProfile = {
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  name?: string;
};

function requiredEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("your_") || value.startsWith("replace_")) throw new Error(`${name} is not configured`);
  return value;
}

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

export function googleRedirectUri(): string {
  return `${appBaseUrl()}/api/auth/google/callback`;
}

export function createGoogleAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requiredEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code"
    }),
    cache: "no-store"
  });

  const body = (await response.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || "Google token exchange failed");
  }
  return body.access_token;
}

export async function fetchGoogleUser(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  const body = (await response.json().catch(() => ({}))) as {
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    name?: string;
  };

  if (!response.ok || !body.email) throw new Error("Unable to read Google user profile");

  return {
    email: body.email.trim().toLowerCase(),
    emailVerified: body.email_verified === true,
    firstName: body.given_name,
    lastName: body.family_name,
    name: body.name
  };
}

