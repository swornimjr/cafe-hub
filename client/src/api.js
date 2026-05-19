const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('cafehub_token');
}

export function authFetch(url, options = {}) {
  const token = getToken();
  return fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
