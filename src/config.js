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
  const baseUrl = config.API_BASE_URL || config.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || fallback;
  return String(baseUrl).replace(/\/$/, '');
};
