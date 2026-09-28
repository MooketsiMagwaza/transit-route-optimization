/** Browser account adapter shared by profile, recovery, and authenticated community screens. */

import { apiBase } from "@/lib/api-client";

export type Account = { id: number; email: string; displayName: string; createdAt: string };
export type AuthResponse = { token: string; account: Account };
export type CommunityPost = { id: number; routeId: number | null; kind: "tip" | "discussion"; title: string; body: string; authorName: string; createdAt: string };

const TOKEN_KEY = "transitos.account-session";

export function getAccountToken(): string | null { return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY); }
export function saveAccountToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearAccountToken() { localStorage.removeItem(TOKEN_KEY); }

async function call<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const token = authenticated ? getAccountToken() : null;
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const detail = typeof payload === "object" && payload && "detail" in payload ? String(payload.detail) : `Request failed (${response.status})`;
    throw Object.assign(new Error(detail), { status: response.status });
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const accountApi = {
  register: (body: { email: string; password: string; displayName: string }) => call<AuthResponse>("/api/developer/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) => call<AuthResponse>("/api/developer/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => call<Account>("/api/developer/me", {}, true),
  requestRecovery: (email: string) => call<{ message: string; debugToken?: string }>("/api/developer/password-recovery", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => call<void>("/api/developer/password-reset", { method: "POST", body: JSON.stringify({ token, password }) }),
  reportContent: (body: { targetType: "post" | "contribution"; targetId: number; reason: string; note?: string }) => call<{ accepted: boolean }>("/api/community/reports", { method: "POST", body: JSON.stringify(body) }, true),
  posts: (query = "", routeId?: number) => call<CommunityPost[]>(`/api/community/posts?query=${encodeURIComponent(query)}${routeId ? `&routeId=${routeId}` : ""}`, {}, true),
  createPost: (body: { routeId?: number; kind: "tip" | "discussion"; title: string; body: string }, idempotencyKey?: string) => call<CommunityPost>("/api/community/posts", { method: "POST", body: JSON.stringify(body), headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {} }, true),
};
