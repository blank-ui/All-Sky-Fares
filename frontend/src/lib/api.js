// Client for the AllSkyFares OTA backend. Auth is an httpOnly session cookie,
// so every call sends credentials. The CRM is never called from the browser.
// The website and API are served by one app on the same domain, so production calls /api directly;
// `npm start` talks to the local API on port 8001 (set in frontend/.env).
export const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

export async function apiRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail) && detail[0]?.msg
        ? detail[0].msg.replace(/^Value error, /, "")
        : "Request failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}
