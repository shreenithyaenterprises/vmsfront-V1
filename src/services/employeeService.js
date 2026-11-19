import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

export const getEmployees = async ({ id } = {}) => {
  const token = getToken();
  return request('/master/employee/get', {
    method: 'GET',
    token,
    query: id ? { EmployeeId: id } : undefined,
  });
};

export const createEmployee = async ({
  name,
  department,
  departmentId,
  designation,
  mobile,
  email,
  isDepartmentHead,
  approvalRequired,
}) => {
  const token = getToken();
  return request('/master/employee/create', {
    method: 'POST',
    token,
    body: {
      Name: name,
      Department: department,
      DepartmentId: departmentId,
      Designation: designation,
      Mobile: mobile,
      Email: email,
      IsDepartmentHead: isDepartmentHead,
      ApprovalRequired: approvalRequired,
    },
  });
};

export const updateEmployee = async ({
  id,
  name,
  department,
  departmentId,
  designation,
  mobile,
  email,
  isDepartmentHead,
  approvalRequired,
}) => {
  const token = getToken();
  return request('/master/employee/update', {
    method: 'PUT',
    token,
    body: {
      EmployeeId: id,
      Name: name,
      Department: department,
      DepartmentId: departmentId,
      Designation: designation,
      Mobile: mobile,
      Email: email,
      IsDepartmentHead: isDepartmentHead,
      ApprovalRequired: approvalRequired,
    },
  });
};

export const deleteEmployee = async ({ id }) => {
  const token = getToken();
  return request('/master/employee/delete', {
    method: 'DELETE',
    token,
    body: { EmployeeId: id },
  });
};
