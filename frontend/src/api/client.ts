/**
 * Shared API URL and fetch resolver for AI SignBridge.
 * Supports relative path proxies (/api/v1/...) via Vite dev or Vercel edge rewrites,
 * or direct absolute URLs if VITE_API_BASE_URL is provided in deployment settings.
 */
export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
).replace(/\/$/, '');

export function apiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
