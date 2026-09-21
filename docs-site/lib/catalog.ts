/** Typed view of the public API catalog; the JSON is checked against the API by CI. */

import catalogJson from "../content/api-catalog.json";
import { API_URL } from "./urls";

export type EndpointParameter = {
  name: string;
  in: "path" | "query" | "header";
  type: string;
  required: boolean;
  constraints: string;
  default: string | number | boolean | null;
  description: string;
  example: string | number | boolean;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
};

export type EndpointError = { status: number; meaning: string; retry: string };
export type ResponseField = { name: string; type: string; description: string };

export type Endpoint = {
  slug: string;
  operationId: string;
  group: string;
  method: "GET";
  path: string;
  title: string;
  summary: string;
  stability: "preview" | "stable" | "deprecated";
  since: string;
  auth: { header: string; scope: string };
  quotaCost: number;
  idempotency: string;
  parameters: EndpointParameter[];
  response: { status: number; schema: string; description: string; example: unknown; fields: ResponseField[] };
  errors: EndpointError[];
  pagination: string;
  caching: string;
  timeout: string;
  freshness: string;
  examples: { curl: string; javascript: string };
  sandbox: { enabled: boolean; sample: Record<string, string | number> };
};

export type SharedHeader = { name: string; description: string };

const catalog = catalogJson as unknown as { version: string; sharedResponseHeaders: SharedHeader[]; endpoints: Endpoint[] };

export const API_VERSION = catalog.version;
export const SHARED_RESPONSE_HEADERS = catalog.sharedResponseHeaders;
export const ENDPOINTS: Endpoint[] = catalog.endpoints;
export const ENDPOINT_GROUPS = [...new Set(ENDPOINTS.map((endpoint) => endpoint.group))];

export function findEndpoint(slug: string[]): Endpoint | undefined {
  const key = slug.join("/");
  return ENDPOINTS.find((endpoint) => endpoint.slug === key);
}

/** Replace the {{BASE_URL}} placeholder so examples work against the configured API origin. */
export function withBaseUrl(example: string): string {
  return example.replaceAll("{{BASE_URL}}", API_URL);
}

/** Fill path parameters from the catalog examples: /v1/routes/{route_id} becomes /v1/routes/3. */
export function samplePath(endpoint: Endpoint): string {
  return endpoint.parameters
    .filter((parameter) => parameter.in === "path")
    .reduce((path, parameter) => path.replace(`{${parameter.name}}`, String(parameter.example)), endpoint.path);
}
