import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getBadges = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/badge/get', {
    method: 'POST',
    token,
    body: id ? { BadgeId: id } : {},
  });
};

export const createBadge = async ({ code, color }) => {
  const token = getToken();
  return request('/master/badge/create', {
    method: 'POST',
    token,
    body: { Code: code, Color: color },
  });
};

export const updateBadge = async ({ id, code, color }) => {
  const token = getToken();
  return request('/master/badge/update', {
    method: 'PUT',
    token,
    body: { BadgeId: id, Code: code, Color: color },
  });
};

export const deleteBadge = async ({ id }) => {
  const token = getToken();
  return request('/master/badge/delete', {
    method: 'DELETE',
    token,
    body: { BadgeId: id },
  });
};
