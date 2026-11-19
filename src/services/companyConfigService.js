import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

const BASE_PATH = '/master/company-config';

export const getCompanyConfigs = async () => {
  const token = getToken();
  return request(BASE_PATH, {
    method: 'GET',
    token,
  });
};

export const createCompanyConfig = async (data) => {
  const token = getToken();
  return request(BASE_PATH, {
    method: 'POST',
    token,
    body: data,
  });
};

export const updateCompanyConfig = async (id, data) => {
  const token = getToken();
  return request(`${BASE_PATH}/${id}`, {
    method: 'PUT',
    token,
    body: data,
  });
};

export const deleteCompanyConfig = async (id) => {
  const token = getToken();
  return request(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
    token,
  });
};
