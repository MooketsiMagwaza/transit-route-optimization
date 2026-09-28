/** Public developer guides. Only material meant for external developers belongs in this file. */

export type GuideSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  code?: { label: string; value: string };
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  sections: GuideSection[];
};

export const GUIDES: Guide[] = [
  {
    slug: "guides/getting-started",
    title: "Getting started",
    description: "Create an account, issue an API key, and make your first request in a few minutes.",
    sections: [
      {
        title: "Create a key",
        paragraphs: ["Sign in to the developer console and choose Create key. The full key is shown once, so copy it into your server's secret store straight away. Tsela stores only a one-way digest and cannot show it again."],
        bullets: ["Keys expire after 90 days, so plan to rotate them.", "Rotate a key at any time; the old key stops working immediately.", "Each key has its own hourly and monthly limits."],
      },
      {
        title: "Make a request",
        paragraphs: ["Send the key in the X-API-Key header. Keys are credentials: use them only from a server, never from a browser or mobile app, and never in a query string."],
        code: { label: "cURL", value: "curl \"$TSELA_API_URL/v1/routes?limit=3\" \\\n  -H \"X-API-Key: $TSELA_API_KEY\"" },
      },
      {
        title: "Next steps",
        bullets: ["Read the List routes and Get route geometry pages for every field and error.", "Handle 429 responses using Retry-After; see Errors and retries.", "Watch usage in the console; the same counts drive the rate-limit headers."],
      },
    ],
  },
  {
    slug: "guides/authentication",
    title: "Authentication",
    description: "How API keys work, what scopes they carry, and how to keep them safe.",
    sections: [
      {
        title: "The X-API-Key header",
        paragraphs: ["Every public endpoint requires an API key in the X-API-Key header. Requests with a missing, unknown, expired, or revoked key return 401. Tsela never accepts credentials in the URL because URLs are logged by proxies and browsers."],
      },
      {
        title: "Scopes",
        paragraphs: ["A key carries a list of scopes. Each endpoint page names the scope it needs. Today the only scope is routes:read, which every new key receives. A key without the required scope receives 403."],
      },
      {
        title: "Keeping keys safe",
        bullets: ["Store keys in environment variables or a secret manager, never in source control.", "Call the API from your server. If a key reaches a browser, rotate it.", "Use one key per application so you can revoke one without disturbing the others.", "Repeated invalid keys from one address or credential are blocked for an hour."],
      },
    ],
  },
  {
    slug: "guides/errors-and-retries",
    title: "Errors and retries",
    description: "Which status codes mean what, and exactly when a retry is safe.",
    sections: [
      {
        title: "Error shape",
        paragraphs: ["Errors are JSON objects with a detail field: a string for authentication and quota errors, or an array describing each invalid parameter for 422. Every response, including errors, carries an X-Request-ID header. Quote it when you report a problem."],
        code: { label: "401 response", value: "{\n  \"detail\": \"API key is invalid, expired, or revoked\"\n}" },
      },
      {
        title: "Status codes",
        bullets: ["401: the key is missing or not valid. Do not retry unchanged.", "403: the key lacks the endpoint's scope. Do not retry.", "404: the resource does not exist. Do not retry.", "422: a parameter failed validation. Fix the request; do not retry unchanged.", "429: a limit was reached. Wait for Retry-After seconds, then retry.", "500 and 503: a server problem. Retry with backoff."],
      },
      {
        title: "Retry policy",
        paragraphs: ["All current endpoints are GET requests and are safe to repeat. Retry only 429, 500, and 503. Use exponential backoff with jitter, honour Retry-After when present, and stop after three attempts."],
        code: { label: "JavaScript", value: "async function getWithRetry(url, options, attempts = 3) {\n  for (let attempt = 1; ; attempt += 1) {\n    const response = await fetch(url, options);\n    const retryable = [429, 500, 503].includes(response.status);\n    if (!retryable || attempt === attempts) return response;\n    const wait = Number(response.headers.get(\"retry-after\")) * 1000\n      || Math.min(8000, 2 ** attempt * 250) * (0.5 + Math.random());\n    await new Promise((resolve) => setTimeout(resolve, wait));\n  }\n}" },
      },
    ],
  },
  {
    slug: "guides/rate-limits",
    title: "Rate limits and quotas",
    description: "The hourly and monthly limits, the headers that report them, and how to stay inside them.",
    sections: [
      {
        title: "Two limits per key",
        bullets: ["A rolling hourly limit, 100 requests by default.", "A calendar-month quota (UTC), 10,000 requests by default.", "Each request costs 1 unit unless its endpoint page says otherwise.", "Requests rejected with 401, 403, or 429 are not counted."],
      },
      {
        title: "Response headers",
        paragraphs: ["Every successful response reports your position so you can slow down before you are limited."],
        bullets: ["X-RateLimit-Limit and X-RateLimit-Remaining: the hourly allowance and what is left.", "X-RateLimit-Reset: Unix time when hourly capacity next returns.", "X-Quota-Limit and X-Quota-Remaining: the monthly allowance and what is left.", "Retry-After on 429: whole seconds to wait."],
      },
      {
        title: "Staying inside the limits",
        bullets: ["Cache route lists for a few minutes and geometry for up to a day.", "Page with limit and offset instead of fetching everything repeatedly.", "Spread bulk jobs over time and back off when X-RateLimit-Remaining is low."],
      },
    ],
  },
  {
    slug: "guides/versioning",
    title: "Versioning and changelog",
    description: "How the API evolves, how long you have to migrate, and what changed.",
    sections: [
      {
        title: "Version policy",
        bullets: [
          "The major version is in the path (/v1). Responses carry X-API-Version.",
          "Within a major version we only add: new endpoints, optional parameters, and new response fields. Ignore fields you do not recognise.",
          "Removing or changing a field, or tightening validation, ships as a new major version.",
          "Endpoints marked preview may change with 30 days' notice on this page.",
          "A deprecated endpoint stays available for at least 180 days and returns Deprecation and Sunset headers.",
        ],
      },
      {
        title: "Changelog",
        bullets: [
          "2026-09: Route objects gain publicId, updatedAt, source, verificationStatus, and verifiedAt so you can tell how fresh and how trusted a route is. These are additive fields.",
          "2026-09: API keys carry scopes; the routes:read scope is required on every /v1 endpoint.",
          "2026-09: Responses report X-RateLimit-* and X-Quota-* headers and X-API-Version. Retry-After now reflects the real reset time.",
          "2026-09: /v1/routes orders by newest first with a stable tiebreaker so offset pagination never repeats or skips a route.",
          "2026-09: Initial preview of GET /v1/routes and GET /v1/routes/{route_id}/geometry.",
        ],
      },
    ],
  },
];

export function findGuide(slug: string[]): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug.join("/"));
}

export function sectionId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
