const DEFAULT_BASE_URL = '/api';

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
        console.warn('Runtime config could not be loaded:', error);
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

export const getApiBaseUrl = async (fallback = DEFAULT_BASE_URL) => {
  const config = await loadRuntimeConfig();
  const runtimeUrl = config.API_BASE_URL || config.apiBaseUrl;
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // 1. If config.json explicitly specifies a full URL (e.g. https://vmsbd.snithya.com/api), use it
  if (runtimeUrl && /^https?:\/\//i.test(runtimeUrl)) {
    return String(runtimeUrl).replace(/\/$/, '');
  }

  // 2. If VITE_API_BASE_URL is configured in .env, use it
  if (envUrl) {
    return String(envUrl).replace(/\/$/, '');
  }

  // 3. If config.json has any relative path
  if (runtimeUrl) {
    return String(runtimeUrl).replace(/\/$/, '');
  }

  // 4. Fallback to default (/api)
  return String(fallback).replace(/\/$/, '');
};
