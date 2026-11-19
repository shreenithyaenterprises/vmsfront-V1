import { request } from './apiClient.js';

export const getCeatInterplantLookups = async () =>
  request('/prebooking/public/ceat-employee/lookups', {
    method: 'GET',
  });

export const createCeatInterplantRequest = async (payload) =>
  request('/prebooking/public/ceat-employee/create', {
    method: 'POST',
    body: payload,
  });

export const getCeatInterplantStatus = async (token) =>
  request('/prebooking/public/ceat-employee/status', {
    method: 'POST',
    body: { Token: token },
  });
