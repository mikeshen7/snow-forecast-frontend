const API_BASE_URL = (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_SERVER || '').replace(/\/$/, '');
const API_KEY = process.env.REACT_APP_BACKEND_API_KEY || '';

function buildUrl(path, params) {
  const url = `${API_BASE_URL}${path}`;
  if (!params) return url;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `${url}?${query}` : url;
}

async function apiFetch(path, { method = 'GET', params, body } = {}) {
  const url = buildUrl(path, params);
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.error || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export function requestMagicLink(email, redirectPath = '/') {
  return apiFetch('/auth/request-link', {
    method: 'POST',
    body: { email, redirectPath },
  });
}

export function getSession() {
  return apiFetch('/auth/session');
}

export function logout() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

export function getLocations({ query = '', isSkiResort = true, limit = 50 } = {}) {
  return apiFetch('/locations', {
    params: { q: query, isSkiResort, limit },
  });
}

export function getDailyOverview({ locationId, startDateEpoch, endDateEpoch }) {
  return apiFetch('/weather/daily/overview', {
    params: { locationId, startDateEpoch, endDateEpoch },
  });
}

export function getDailySegments({ locationId, startDateEpoch, endDateEpoch }) {
  return apiFetch('/weather/daily/segments', {
    params: { locationId, startDateEpoch, endDateEpoch },
  });
}

export function getHourly({ locationId, startDateEpoch, endDateEpoch }) {
  return apiFetch('/weather/hourly', {
    params: { locationId, startDateEpoch, endDateEpoch },
  });
}
