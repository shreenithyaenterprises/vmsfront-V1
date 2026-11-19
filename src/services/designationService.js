import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getDesignations = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/designation/get', {
    method: 'GET',
    token,
    query: id ? { DesignationId: id } : undefined,
  });
};

export const createDesignation = async ({ name }) => {
  const token = getToken();
  return request('/master/designation/create', {
    method: 'POST',
    token,
    body: { Name: name },
  });
};

export const updateDesignation = async ({ id, name }) => {
  const token = getToken();
  return request('/master/designation/update', {
    method: 'PUT',
    token,
    body: { DesignationId: id, Name: name },
  });
};

export const deleteDesignation = async ({ id }) => {
  const token = getToken();
  return request('/master/designation/delete', {
    method: 'DELETE',
    token,
    body: { DesignationId: id },
  });
};
