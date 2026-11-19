import { request } from './apiClient.js';

export const getPrebookingForm = async ({ token }) =>
  request('/prebooking/public/form/get', {
    method: 'POST',
    body: { Token: token },
  });

export const getPrebookingLookups = async () =>
  request('/prebooking/public/form/lookups', {
    method: 'GET',
  });

export const submitPrebookingForm = async (payload) =>
  request('/prebooking/public/form/submit', {
    method: 'POST',
    body: payload,
  });
