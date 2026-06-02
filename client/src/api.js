const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('cafehub_token');
}

let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) { _onUnauthorized = fn; }

export async function authFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && _onUnauthorized) _onUnauthorized();
  return res;
}
