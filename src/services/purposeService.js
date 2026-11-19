import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getPurposes = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/purpose/get', {
    method: 'POST',
    token,
    body: id ? { PurposeId: id } : {},
  });
};

export const createPurpose = async ({ code, name }) => {
  const token = getToken();
  return request('/master/purpose/create', {
    method: 'POST',
    token,
    body: { Code: code, Name: name },
  });
};

export const updatePurpose = async ({ id, code, name }) => {
  const token = getToken();
  return request('/master/purpose/update', {
    method: 'PUT',
    token,
    body: { PurposeId: id, Code: code, Name: name },
  });
};

export const deletePurpose = async ({ id }) => {
  const token = getToken();
  return request('/master/purpose/delete', {
    method: 'DELETE',
    token,
    body: { PurposeId: id },
  });
};
