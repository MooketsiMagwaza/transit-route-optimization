/** Same-origin gateway for developer APIs; forwards sessions from an HttpOnly cookie only. */

import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "../../../../lib/urls";

const COOKIE_NAME = "tsela.developer-session";
const ALLOWED_METHODS: Record<string, readonly string[]> = {
  register: ["POST"],
  login: ["POST"],
  "password-recovery": ["POST"],
  "password-reset": ["POST"],
  logout: ["POST"],
  me: ["GET"],
  keys: ["GET", "POST"],
  usage: ["GET"],
  export: ["GET"],
  account: ["DELETE"],
};

function isAllowed(path: string[], method: string) {
  if (path.length === 1) return ALLOWED_METHODS[path[0]]?.includes(method) ?? false;
  if (path[0] !== "keys" || !/^\d+$/.test(path[1] ?? "")) return false;
  if (path.length === 2) return method === "DELETE";
  return path.length === 3 && path[2] === "rotate" && method === "POST";
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const method = request.method.toUpperCase();
  if (!isAllowed(path, method)) {
    return NextResponse.json({ detail: "Developer endpoint not found" }, { status: 404 });
  }

  const upstreamBase = process.env.API_INTERNAL_URL ?? API_URL;
  const upstreamUrl = `${upstreamBase}/api/developer/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token && path[0] !== "login" && path[0] !== "register") {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const upstream = await fetch(upstreamUrl, { method, headers, body, cache: "no-store" }).catch(() => null);
  if (!upstream) {
    return NextResponse.json({ detail: "Developer API is temporarily unavailable" }, { status: 503 });
  }

  const payload = await upstream.arrayBuffer();
  const response = new NextResponse(payload.byteLength ? payload : null, { status: upstream.status });
  const responseType = upstream.headers.get("content-type");
  if (responseType) response.headers.set("Content-Type", responseType);
  return response;
}

export const GET = forward;
export const POST = forward;
export const DELETE = forward;
