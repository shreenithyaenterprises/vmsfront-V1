import { getApiBaseUrl } from '../config';

const DEFAULT_BASE_URL = '/api';

let cachedBaseUrl = null;

const resolveApiBaseUrl = async () => {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  cachedBaseUrl = await getApiBaseUrl(DEFAULT_BASE_URL);
  return cachedBaseUrl;
};

export const request = async (path, { method = 'GET', body, token, headers, query } = {}) => {
  const API_BASE_URL = await resolveApiBaseUrl();
  const normalizedMethod = method.toUpperCase();
  const hasBody = body !== undefined && normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD';
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders = {
    ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(headers || {}),
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const searchParams = new URLSearchParams();
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
  }

  const url = searchParams.toString()
    ? `${API_BASE_URL}${path}?${searchParams.toString()}`
    : `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: normalizedMethod,
    headers: requestHeaders,
    body: hasBody ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = payload?.message || payload?.error || response.statusText;
    throw new Error(message || 'Request failed');
  }


  return payload;
};

const get = (path, options = {}) => request(path, { ...options, method: 'GET' });
const post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body });

export default {
  get,
  post,
  request,
};
