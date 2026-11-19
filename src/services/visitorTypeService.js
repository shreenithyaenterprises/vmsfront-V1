import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getVisitorTypes = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/visitor-type/get', {
    method: 'POST',
    token,
    body: id ? { VisitorTypeId: id } : {},
  });
};

export const createVisitorType = async ({ code, name }) => {
  const token = getToken();
  return request('/master/visitor-type/create', {
    method: 'POST',
    token,
    body: { Code: code, Name: name },
  });
};

export const updateVisitorType = async ({ id, code, name }) => {
  const token = getToken();
  return request('/master/visitor-type/update', {
    method: 'PUT',
    token,
    body: { VisitorTypeId: id, Code: code, Name: name },
  });
};

export const deleteVisitorType = async ({ id }) => {
  const token = getToken();
  return request('/master/visitor-type/delete', {
    method: 'DELETE',
    token,
    body: { VisitorTypeId: id },
  });
};
