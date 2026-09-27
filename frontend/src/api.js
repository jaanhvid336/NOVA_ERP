const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('erp_token');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The request could not be completed');
  return payload;
}
