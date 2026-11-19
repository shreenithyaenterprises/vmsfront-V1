import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const listPrebookingRequests = async ({ status, fromDate, toDate } = {}) => {
  const token = getToken();
  return request('/prebooking/request/list', {
    method: 'POST',
    token,
    body: {
      Status: status || null,
      FromDate: fromDate || null,
      ToDate: toDate || null,
    },
  });
};

export const createPrebookingRequest = async ({
  visitorName,
  visitorEmail,
  hostEmployeeId,
  departmentId,
  visitDate,
}) => {
  const token = getToken();
  return request('/prebooking/request/create', {
    method: 'POST',
    token,
    body: {
      VisitorName: visitorName,
      VisitorEmail: visitorEmail,
      HostEmployeeId: hostEmployeeId || null,
      DepartmentId: departmentId,
      VisitDate: visitDate,
    },
  });
};

export const createPrebookingWhatsAppRequest = async ({
  companyName,
  visitorName,
  visitorMobile,
}) => {
  const token = getToken();
  return request('/prebooking/request/create-whatsapp', {
    method: 'POST',
    token,
    body: {
      CompanyName: companyName,
      VisitorName: visitorName,
      VisitorMobile: visitorMobile,
    },
  });
};

export const listPrebookingTemplates = async ({ onlyActive } = {}) => {
  const token = getToken();
  return request('/prebooking/template/list', {
    method: 'POST',
    token,
    body: {
      OnlyActive: typeof onlyActive === 'boolean' ? onlyActive : null,
    },
  });
};

export const createPrebookingTemplate = async ({ templateCode, subject, bodyHtml }) => {
  const token = getToken();
  return request('/prebooking/template/create', {
    method: 'POST',
    token,
    body: {
      TemplateCode: templateCode,
      Subject: subject,
      BodyHtml: bodyHtml,
    },
  });
};

export const updatePrebookingTemplate = async ({ templateId, subject, bodyHtml }) => {
  const token = getToken();
  return request('/prebooking/template/update', {
    method: 'PUT',
    token,
    body: {
      TemplateId: templateId,
      Subject: subject,
      BodyHtml: bodyHtml,
    },
  });
};

export const togglePrebookingTemplate = async ({ templateId, isActive }) => {
  const token = getToken();
  return request('/prebooking/template/toggle', {
    method: 'PUT',
    token,
    body: {
      TemplateId: templateId,
      IsActive: isActive,
    },
  });
};
