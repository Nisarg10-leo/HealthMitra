const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// The prototype session is the signed-in user's id, attached as a header.
// Kept here so that swapping to a bearer token touches one module.
let sessionToken = null;
export const setSessionToken = (token) => { sessionToken = token; };

export async function request(path, { method = 'GET', body, headers } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'x-user-id': sessionToken } : {}),
      ...(headers || {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = response.status === 204 ? '' : await response.text();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = { error: raw }; }
  if (!response.ok) throw new Error(payload?.error || 'Something went wrong.');
  return payload;
}

export const get = (path) => request(path);
export const post = (path, body) => request(path, { method: 'POST', body });
export const put = (path, body) => request(path, { method: 'PUT', body });
export const del = (path) => request(path, { method: 'DELETE' });
