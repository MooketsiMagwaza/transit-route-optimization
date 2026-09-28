/** Typed browser client for account, recovery, credentials, and usage APIs. */

export type Account = { id: number; email: string; displayName: string; createdAt: string };
export type ApiKey = { id: number; name: string; prefix: string; monthlyQuota: number; hourlyLimit: number; createdAt: string; revokedAt: string | null };
export type CreatedApiKey = ApiKey & { key: string };
export type Usage = { used: number; quota: number; remaining: number; periodStart: string; recentPaths: Record<string, number>; estimatedCostUsd: number | null };

export async function createBrowserSession(token: string) {
  const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  if (!response.ok) throw new Error("Your account was verified, but the protected session could not be started.");
}
export async function destroyBrowserSession() { await fetch("/api/session", { method: "DELETE" }).catch(() => undefined); }

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/developer${path}`, { ...options, credentials: "same-origin", headers: { "Content-Type": "application/json", ...options.headers } });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const detail = typeof payload === "object" && payload && "detail" in payload ? String(payload.detail) : `Request failed (${response.status})`;
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Download everything held about the signed-in account as a JSON file. */
export async function exportMyData(): Promise<void> {
  const response = await fetch("/api/developer/export", { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Could not prepare your export (${response.status})`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "tsela-my-data.json";
  link.click();
  URL.revokeObjectURL(url);
}

export async function deleteMyAccount(confirmEmail: string): Promise<void> {
  const response = await fetch("/api/developer/account", { method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmEmail }) });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(typeof payload === "object" && payload && "detail" in payload ? String(payload.detail) : `Could not delete the account (${response.status})`);
  }
}

export const developerApi = {
  register: (body: { email: string; password: string; displayName: string }) => call<{ token: string; account: Account }>("/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) => call<{ token: string; account: Account }>("/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => call<Account>("/me"),
  logout: () => call<void>("/logout", { method: "POST" }),
  keys: () => call<ApiKey[]>("/keys"),
  createKey: (name: string) => call<CreatedApiKey>("/keys", { method: "POST", body: JSON.stringify({ name }) }),
  rotateKey: (keyId: number) => call<CreatedApiKey>(`/keys/${keyId}/rotate`, { method: "POST" }),
  revokeKey: (keyId: number) => call<void>(`/keys/${keyId}`, { method: "DELETE" }),
  usage: () => call<Usage>("/usage"),
  requestRecovery: (email: string) => call<{ message: string; debugToken?: string }>("/password-recovery", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => call<void>("/password-reset", { method: "POST", body: JSON.stringify({ token, password }) }),
};
