import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getCeatInterplantPendingApprovals = async () => {
  const token = getToken();
  return request('/prebooking/approval/ceat-interplant/pending', {
    method: 'GET',
    token,
  });
};

export const submitCeatInterplantDecision = async ({ requestId, action, remarks }) => {
  const token = getToken();
  return request('/prebooking/approval/ceat-interplant/decision', {
    method: 'POST',
    token,
    body: {
      RequestId: requestId,
      Action: action,
      Remarks: remarks || '',
    },
  });
};
