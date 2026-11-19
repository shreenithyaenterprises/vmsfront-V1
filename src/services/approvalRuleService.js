import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getApprovalRules = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/approval-rule/get', {
    method: 'POST',
    token,
    body: id ? { RuleId: id } : {},
  });
};

export const createApprovalRule = async ({ visitorTypeCode, approvalStatus }) => {
  const token = getToken();
  return request('/master/approval-rule/create', {
    method: 'POST',
    token,
    body: { VisitorTypeCode: visitorTypeCode, ApprovalStatus: approvalStatus },
  });
};

export const updateApprovalRule = async ({ id, visitorTypeCode, approvalStatus }) => {
  const token = getToken();
  return request('/master/approval-rule/update', {
    method: 'PUT',
    token,
    body: { RuleId: id, VisitorTypeCode: visitorTypeCode, ApprovalStatus: approvalStatus },
  });
};

export const deleteApprovalRule = async ({ id }) => {
  const token = getToken();
  return request('/master/approval-rule/delete', {
    method: 'DELETE',
    token,
    body: { RuleId: id },
  });
};
