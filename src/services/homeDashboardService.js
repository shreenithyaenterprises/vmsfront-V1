import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getHomeDashboardSummary = async ({ forDate } = {}) => {
  const token = getToken();
  return request('/prebooking/dashboard/home', {
    method: 'POST',
    token,
    body: {
      ForDate: forDate || null,
    },
  });
};
