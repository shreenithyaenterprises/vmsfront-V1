const DEFAULT_LOCAL_BASE_URL = '/api';
const DEFAULT_PROD_BASE_URL = 'https://vmsbd.snithya.com/api';

let runtimeConfig = null;
let runtimeConfigPromise = null;

const getConfigUrl = () => {
  if (typeof window === 'undefined') {
    return '/config.json';
  }

  try {
    return new URL('config.json', window.location.href).toString();
  } catch (error) {
    return '/config.json';
  }
};

const getGlobalConfig = () => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__;
  }

  return {};
};

export const loadRuntimeConfig = async () => {
  if (runtimeConfig) {
    return runtimeConfig;
  }

  if (!runtimeConfigPromise) {
    runtimeConfigPromise = (async () => {
      try {
        const response = await fetch(getConfigUrl(), { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Config request failed: ${response.status}`);
        }

        const config = await response.json();
        runtimeConfig = { ...getGlobalConfig(), ...config };
        if (typeof window !== 'undefined') {
          window.__APP_CONFIG__ = runtimeConfig;
        }
        return runtimeConfig;
      } catch (error) {
        runtimeConfig = { ...getGlobalConfig() };
        if (typeof window !== 'undefined') {
          window.__APP_CONFIG__ = runtimeConfig;
        }
        return runtimeConfig;
      }
    })();
  }

  return runtimeConfigPromise;
};

const isLocalHostname = (hostname) => {
  if (!hostname) return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)) return true;
  return false;
};

export const getApiBaseUrl = async () => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = isLocalHostname(currentHost);

  // If running locally, route through local proxy /api
  if (isLocal) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !/^https:\/\/vmsbd\.snithya\.com/i.test(envUrl)) {
      return String(envUrl).replace(/\/$/, '');
    }
    return DEFAULT_LOCAL_BASE_URL;
  }

  // When running on server domain (vms.snithya.com or any production domain):
  const config = await loadRuntimeConfig();
  const runtimeUrl = config.API_BASE_URL || config.apiBaseUrl;
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (runtimeUrl && /^https?:\/\//i.test(runtimeUrl)) {
    return String(runtimeUrl).replace(/\/$/, '');
  }

  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return String(envUrl).replace(/\/$/, '');
  }

  // Default server backend API
  return DEFAULT_PROD_BASE_URL;
};
