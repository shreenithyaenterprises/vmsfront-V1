import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

const API_PATH = '/master/approval-authority';

/**
 * Create a new approval authority
 * Maps an employee to their approver
 */
export const createApprovalAuthority = async ({
  employeeId,
  approverId,
  approvalLevel = 1,
}) => {
  const token = getToken();
  return request(API_PATH, {
    method: 'POST',
    token,
    body: {
      EmployeeId: employeeId,
      ApproverId: approverId,
      ApprovalLevel: approvalLevel,
    },
  });
};

/**
 * Get approval authorities
 * Can fetch for a specific employee or all
 */
export const getApprovalAuthorities = async (employeeId = null) => {
  const token = getToken();
  const query = employeeId ? `?employeeId=${employeeId}` : '';
  return request(`${API_PATH}${query}`, {
    method: 'GET',
    token,
  });
};

/**
 * Delete an approval authority
 */
export const deleteApprovalAuthority = async (authorityId) => {
  const token = getToken();
  return request(API_PATH, {
    method: 'DELETE',
    token,
    body: {
      AuthorityId: authorityId,
    },
  });
};
