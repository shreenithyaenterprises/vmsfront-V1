import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const listVisitorReport = async ({
  fromDate,
  toDate,
  search,
  purposeId,
  visitorType,
  visitStatus,
  approvalStatus,
  pageNumber = 1,
  pageSize = 10,
} = {}) => {
  const token = getToken();
  return request('/prebooking/report/list', {
    method: 'POST',
    token,
    body: {
      FromDate: fromDate || null,
      ToDate: toDate || null,
      Search: search || null,
      PurposeId: purposeId ? Number(purposeId) : null,
      VisitorType: visitorType || null,
      VisitStatus: visitStatus || null,
      ApprovalStatus: approvalStatus || null,
      PageNumber: Number(pageNumber) || 1,
      PageSize: Number(pageSize) || 10,
    },
  });
};
