import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const createGovernmentOfficialEntry = async ({ userDepartment, officialType, purposeOfVisit }) => {
  const token = getToken();
  return request('/prebooking/security-check/government/create', {
    method: 'POST',
    token,
    body: {
      UserDepartment: userDepartment,
      OfficialType: officialType,
      PurposeOfVisit: purposeOfVisit,
    },
  });
};

export const listGovernmentOfficialEntriesToday = async ({ forDate } = {}) => {
  const token = getToken();
  return request('/prebooking/security-check/government/today', {
    method: 'POST',
    token,
    body: {
      ForDate: forDate || null,
    },
  });
};

export const checkInGovernmentOfficial = async ({ visitId, entryGate } = {}) => {
  const token = getToken();
  return request('/prebooking/security-check/government/check-in', {
    method: 'POST',
    token,
    body: {
      VisitID: Number(visitId),
      EntryGate: entryGate || 'Main Gate',
    },
  });
};

export const checkOutGovernmentOfficial = async ({ visitId, exitGate } = {}) => {
  const token = getToken();
  return request('/prebooking/security-check/government/check-out', {
    method: 'POST',
    token,
    body: {
      VisitID: Number(visitId),
      ExitGate: exitGate || 'Main Gate',
    },
  });
};
