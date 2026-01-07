const API_BASE_URL = (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_SERVER || '').replace(/\/$/, '');
const API_KEY = process.env.REACT_APP_BACKEND_API_KEY || '';
const ACCESS_TOKEN_KEY = 'snowcast.accessToken';
const REFRESH_TOKEN_KEY = 'snowcast.refreshToken';
const ACCESS_TOKEN_EXPIRES_KEY = 'snowcast.accessTokenExpiresAt';

function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

function setTokens({ accessToken, refreshToken, expiresInMinutes }) {
  if (accessToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (expiresInMinutes) {
    const expiresAt = Date.now() + Number(expiresInMinutes) * 60 * 1000;
    sessionStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, String(expiresAt));
  }
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
}

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

async function apiFetch(path, { method = 'GET', params, body, auth = true, retryOnUnauthorized = true } = {}) {
  const url = buildUrl(path, params);
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }
  if (auth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && retryOnUnauthorized) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch(path, { method, params, body, auth, retryOnUnauthorized: false });
      }
    }
    const message = typeof payload === 'string' ? payload : payload?.error || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export function requestMagicLink(email, redirectPath = '/', mode = 'token') {
  return apiFetch('/auth/request-link', {
    method: 'POST',
    body: { email, redirectPath, mode },
    auth: false,
    retryOnUnauthorized: false,
  });
}

export function verifyMagicToken(token) {
  return apiFetch('/auth/verify', {
    method: 'POST',
    body: { token },
    auth: false,
    retryOnUnauthorized: false,
  }).then((payload) => {
    setTokens(payload || {});
    return payload;
  });
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const payload = await apiFetch('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
      retryOnUnauthorized: false,
    });
    setTokens(payload || {});
    return payload?.accessToken || null;
  } catch (error) {
    clearTokens();
    return null;
  }
}

export function getSession() {
  return apiFetch('/auth/session', { auth: true });
}

export function logout() {
  const refreshToken = getRefreshToken();
  clearTokens();
  return apiFetch('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
    auth: false,
    retryOnUnauthorized: false,
  });
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
