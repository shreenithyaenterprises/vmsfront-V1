import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getDepartments = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/department/get', {
    method: 'GET',
    token,
    query: id ? { DepartmentId: id } : undefined,
  });
};

export const createDepartment = async ({ name }) => {
  const token = getToken();
  return request('/master/department/create', {
    method: 'POST',
    token,
    body: { Name: name },
  });
};

export const updateDepartment = async ({ id, name }) => {
  const token = getToken();
  return request('/master/department/update', {
    method: 'PUT',
    token,
    body: { DepartmentId: id, Name: name },
  });
};

export const deleteDepartment = async ({ id }) => {
  const token = getToken();
  return request('/master/department/delete', {
    method: 'DELETE',
    token,
    body: { DepartmentId: id },
  });
};
