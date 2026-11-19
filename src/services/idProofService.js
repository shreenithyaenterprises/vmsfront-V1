import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getIdProofs = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/id-proof/get', {
    method: 'POST',
    token,
    body: id ? { IdProofId: id } : {},
  });
};

export const createIdProof = async ({ name }) => {
  const token = getToken();
  return request('/master/id-proof/create', {
    method: 'POST',
    token,
    body: { Name: name },
  });
};

export const updateIdProof = async ({ id, name }) => {
  const token = getToken();
  return request('/master/id-proof/update', {
    method: 'PUT',
    token,
    body: { IdProofId: id, Name: name },
  });
};

export const deleteIdProof = async ({ id }) => {
  const token = getToken();
  return request('/master/id-proof/delete', {
    method: 'DELETE',
    token,
    body: { IdProofId: id },
  });
};
