import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

const API_PATH = '/prebooking/approval';

/**
 * Get approval authority based on employee selection
 * Returns who should approve the visit
 */
export const getApprovalAuthority = async (hostEmployeeId, visitorTypeCode) => {
  const token = getToken();
  return request(`${API_PATH}/authority`, {
    method: 'POST',
    token,
    body: {
      HostEmployeeId: hostEmployeeId,
      VisitorTypeCode: visitorTypeCode,
    },
  });
};

/**
 * Get approval authority (PUBLIC - No auth needed)
 * Used by public prebooking form only
 */
export const getApprovalAuthorityPublic = async (hostEmployeeId, visitorTypeCode) => {
  return request('/prebooking/public/approval/authority', {
    method: 'POST',
    body: {
      HostEmployeeId: hostEmployeeId,
      VisitorTypeCode: visitorTypeCode,
    },
  });
};

/**
 * Create an approval record
 * Call this when visitor submits the form
 */
export const createApprovalRecord = async (prebookingId, approverId, approvalLevel = 1) => {
  const token = getToken();
  return request(`${API_PATH}/record`, {
    method: 'POST',
    token,
    body: {
      prebookingId,
      approverId,
      approvalLevel,
    },
  });
};

/**
 * Get current approval status and history
 */
export const getApprovalStatus = async (prebookingId) => {
  const token = getToken();
  return request(`${API_PATH}/status?prebookingId=${prebookingId}`, {
    method: 'GET',
    token,
  });
};

/**
 * Get all pending approvals for the logged-in user
 */
export const getPendingApprovals = async () => {
  const token = getToken();
  return request(`${API_PATH}/pending`, {
    method: 'GET',
    token,
  });
};

/**
 * Submit approval decision (approve or reject)
 */
export const submitApprovalDecision = async (approvalLogId, action, remarks = '') => {
  const token = getToken();
  return request(`${API_PATH}/decision`, {
    method: 'POST',
    token,
    body: {
      approvalLogId,
      action, // 'APPROVED' or 'REJECTED'
      remarks,
    },
  });
};
