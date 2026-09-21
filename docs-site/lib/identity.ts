/**
 * Browser client for self-hosted Supabase Auth (GoTrue).
 * Active only when NEXT_PUBLIC_AUTH_URL is set; otherwise the apps keep the local
 * development sign-in. Identical copies live in each app because the apps share no code.
 */

export const AUTH_URL = (process.env.NEXT_PUBLIC_AUTH_URL ?? "").replace(/\/$/, "");
export const EXTERNAL_AUTH = AUTH_URL.length > 0;
export const GOOGLE_AUTH = EXTERNAL_AUTH && process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

export type IdentitySession = { accessToken: string; refreshToken: string; expiresIn: number };
export type MfaFactor = { id: string; factorType: string; status: string };
export type TotpEnrollment = { factorId: string; qrCode: string; secret: string };

type GoTrueSession = { access_token: string; refresh_token: string; expires_in: number };
type GoTrueError = { msg?: string; message?: string; error_description?: string; error_code?: string };

const FRIENDLY: Record<string, string> = {
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed: "Confirm your email first. We sent you a link when you signed up.",
  user_already_exists: "An account already exists for this email.",
  weak_password: "That password is too weak. Use at least 10 characters.",
  over_email_send_rate_limit: "Too many emails were requested. Try again in a few minutes.",
  over_request_rate_limit: "Too many attempts. Try again in a few minutes.",
  mfa_verification_failed: "That code was not accepted. Check your authenticator and try again.",
};

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...options } = init;
  const response = await fetch(`${AUTH_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as GoTrueError;
    throw new Error((payload.error_code && FRIENDLY[payload.error_code]) || payload.msg || payload.message || payload.error_description || `Sign-in service error (${response.status})`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

const toSession = (raw: GoTrueSession): IdentitySession => ({ accessToken: raw.access_token, refreshToken: raw.refresh_token, expiresIn: raw.expires_in });

export const identity = {
  /** Returns null when the provider requires email confirmation before issuing a session. */
  async signUp(email: string, password: string, displayName: string, redirectTo: string): Promise<IdentitySession | null> {
    const result = await request<Partial<GoTrueSession>>(`/signup?redirect_to=${encodeURIComponent(redirectTo)}`, { method: "POST", body: JSON.stringify({ email, password, data: { full_name: displayName } }) });
    return result.access_token ? toSession(result as GoTrueSession) : null;
  },
  async signIn(email: string, password: string): Promise<IdentitySession> {
    return toSession(await request<GoTrueSession>("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }));
  },
  /** The provider answers the same way for known and unknown emails. */
  async recover(email: string, redirectTo: string): Promise<void> {
    await request(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, { method: "POST", body: JSON.stringify({ email }) });
  },
  async updatePassword(accessToken: string, password: string): Promise<void> {
    await request("/user", { method: "PUT", token: accessToken, body: JSON.stringify({ password }) });
  },
  googleUrl(redirectTo: string): string {
    return `${AUTH_URL}/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  },
  async signOut(accessToken: string): Promise<void> {
    await request("/logout", { method: "POST", token: accessToken }).catch(() => undefined);
  },
  async factors(accessToken: string): Promise<MfaFactor[]> {
    const user = await request<{ factors?: { id: string; factor_type: string; status: string }[] }>("/user", { token: accessToken });
    return (user.factors ?? []).map((factor) => ({ id: factor.id, factorType: factor.factor_type, status: factor.status }));
  },
  async enrollTotp(accessToken: string, name: string): Promise<TotpEnrollment> {
    const result = await request<{ id: string; totp: { qr_code: string; secret: string } }>("/factors", { method: "POST", token: accessToken, body: JSON.stringify({ factor_type: "totp", friendly_name: name }) });
    return { factorId: result.id, qrCode: result.totp.qr_code, secret: result.totp.secret };
  },
  /** Challenge and verify a TOTP code; the returned session carries the aal2 level. */
  async verifyTotp(accessToken: string, factorId: string, code: string): Promise<IdentitySession> {
    const challenge = await request<{ id: string }>(`/factors/${encodeURIComponent(factorId)}/challenge`, { method: "POST", token: accessToken, body: "{}" });
    return toSession(await request<GoTrueSession>(`/factors/${encodeURIComponent(factorId)}/verify`, { method: "POST", token: accessToken, body: JSON.stringify({ challenge_id: challenge.id, code }) }));
  },
};

/** Read the session the provider places in the URL fragment after Google or email links. */
export function sessionFromHash(hash: string): { accessToken: string; type: string | null; error: string | null } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const error = params.get("error_description") ?? params.get("error");
  const accessToken = params.get("access_token");
  if (!accessToken && !error) return null;
  return { accessToken: accessToken ?? "", type: params.get("type"), error };
}
