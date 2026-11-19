import { request } from './apiClient.js';
import { setAuth, clearAuth } from '../utils/authStorage.js';

export const login = async ({ userId, password }) => {
  const response = await request('/auth/login', {
    method: 'POST',
    body: {
      UserId: userId,
      Password: password,
    },
  });

  const token = response?.token;
  const role = response?.data?.Role ?? null;

  if (token) {
    setAuth({ token, role });
  }

  return response;
};

export const changePassword = async ({ userId, oldPassword, newPassword }) => {
  return request('/auth/change-password', {
    method: 'POST',
    body: {
      UserId: userId,
      OldPassword: oldPassword,
      NewPassword: newPassword,
    },
  });
};

export const logout = () => {
  clearAuth();
};
