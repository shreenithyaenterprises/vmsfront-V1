const STORAGE_KEY = 'premium_vms_auth';
const COOKIE_KEY = 'premium_vms_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const writeCookie = (value) => {
  if (typeof document === 'undefined') return;

  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; expires=${expires}; SameSite=Lax`;
};

const readCookie = () => {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const matchedCookie = cookies.find((cookie) => cookie.startsWith(`${COOKIE_KEY}=`));

  if (!matchedCookie) return null;

  try {
    return decodeURIComponent(matchedCookie.slice(COOKIE_KEY.length + 1));
  } catch {
    return null;
  }
};

const clearCookie = () => {
  if (typeof document === 'undefined') return;

  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
};

export const setAuth = ({ token, role }) => {
  const value = JSON.stringify({ token, role });
  localStorage.setItem(STORAGE_KEY, value);
  writeCookie(value);
};

export const getAuth = () => {
  let raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    raw = readCookie();
  }

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getToken = () => getAuth()?.token || null;

export const clearAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
  clearCookie();
};
