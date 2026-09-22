// Access token lives only in memory (a module-level variable), never in localStorage --
// an XSS bug can't exfiltrate a token from a variable that's gone on page reload, the
// way it could from localStorage. The refresh token is an httpOnly cookie the browser
// manages automatically (credentials: "include" below); this client never touches it.
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function tryRefresh(): Promise<boolean> {
  const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
  if (!res.ok) return false;
  const data = await res.json();
  setAccessToken(data.accessToken);
  return true;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (!options.isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method: options.method || "GET",
    headers,
    credentials: "include",
    body: options.body ? (options.isFormData ? (options.body as FormData) : JSON.stringify(options.body)) : undefined,
  });

  // The refresh-and-retry dance only makes sense for a 401 on some OTHER protected
  // route, where it means "the access token expired." A 401 from /auth/login or
  // /auth/refresh themselves means something else entirely (wrong password; no/expired
  // refresh cookie) -- retrying via refresh would just fail again and, worse, paper
  // over the real "Invalid email or password" with a misleading "session expired".
  const isAuthEndpoint = path === "/auth/login" || path === "/auth/refresh";
  if (res.status === 401 && !isRetry && !isAuthEndpoint) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch<T>(path, options, true);
    onUnauthorized?.();
    throw new ApiRequestError(401, "Your session has expired. Please log in again.");
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiRequestError(res.status, data.error || "Something went wrong.");
  }
  return data as T;
}
