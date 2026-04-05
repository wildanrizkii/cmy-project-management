/**
 * Wrapper around fetch that redirects to /login on 401 (session expired).
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login?expired=1";
  }
  return res;
}
