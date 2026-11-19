import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getTimePolicies = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/time-policy/get', {
    method: 'POST',
    token,
    body: id ? { PolicyId: id } : {},
  });
};

export const createTimePolicy = async ({ visitorTypeCode, policyLabel }) => {
  const token = getToken();
  return request('/master/time-policy/create', {
    method: 'POST',
    token,
    body: { VisitorTypeCode: visitorTypeCode, PolicyLabel: policyLabel },
  });
};

export const updateTimePolicy = async ({ id, visitorTypeCode, policyLabel }) => {
  const token = getToken();
  return request('/master/time-policy/update', {
    method: 'PUT',
    token,
    body: { PolicyId: id, VisitorTypeCode: visitorTypeCode, PolicyLabel: policyLabel },
  });
};

export const deleteTimePolicy = async ({ id }) => {
  const token = getToken();
  return request('/master/time-policy/delete', {
    method: 'DELETE',
    token,
    body: { PolicyId: id },
  });
};
