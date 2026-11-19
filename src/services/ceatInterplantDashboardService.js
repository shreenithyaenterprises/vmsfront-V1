import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getCeatInterplantDashboardList = async ({ forDate } = {}) => {
  const token = getToken();
  return request('/prebooking/dashboard/ceat-interplant', {
    method: 'POST',
    token,
    body: {
      ForDate: forDate || null,
    },
  });
};
