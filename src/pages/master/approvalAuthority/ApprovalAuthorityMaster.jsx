import { useState, useEffect } from 'react';
import { getEmployees } from '../../../services/employeeService.js';
import {
  getApprovalAuthorities,
  createApprovalAuthority,
  deleteApprovalAuthority,
} from '../../../services/approvalAuthorityService.js';

const normalizeList = (payload) => {
  const data = payload?.data;
  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Table)) return data.Table;
  if (Array.isArray(data?.Recordset)) return data.Recordset;

  const seen = new Set();
  const findFirstArray = (value) => {
    if (!value || typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    if (Array.isArray(value)) {
      return value.length === 0 || typeof value[0] === 'object' ? value : null;
    }

    for (const nested of Object.values(value)) {
      const found = findFirstArray(nested);
      if (found) return found;
    }

    return null;
  };

  return findFirstArray(data) || [];
};

const ApprovalAuthorityMaster = () => {
  const [authorities, setAuthorities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    employeeId: '',
    approverId: '',
    approvalLevel: 1,
  });

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Normalize API response (handles both PascalCase and camelCase)
  const normalizeEmployee = (emp) => ({
    employeeId: emp.employeeId ?? emp.EmployeeId ?? emp.employee_id ?? emp.Id ?? emp.ID,
    name: emp.name || emp.Name,
    department: emp.department || emp.Department,
    departmentId: emp.departmentId || emp.DepartmentId,
    designation: emp.designation || emp.Designation,
    mobile: emp.mobile || emp.Mobile,
    email: emp.email || emp.Email,
    isDepartmentHead: emp.isDepartmentHead ?? emp.IsDepartmentHead ?? false,
    approvalRequired: emp.approvalRequired ?? emp.ApprovalRequired ?? false,
    isActive: emp.isActive ?? emp.IsActive ?? true,
  });

  const normalizeAuthority = (auth) => ({
    authorityId: auth.authorityId ?? auth.AuthorityId ?? auth.id ?? auth.Id,
    employeeId: auth.employeeId ?? auth.EmployeeId ?? auth.employee_id,
    approverId: auth.approverId ?? auth.ApproverId ?? auth.approver_id,
    approvalLevel: auth.approvalLevel || auth.ApprovalLevel || 1,
    isActive: auth.isActive ?? auth.IsActive ?? true,
  });

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [authoritiesRes, employeesRes] = await Promise.all([
        getApprovalAuthorities(),
        getEmployees(),
      ]);

      const authoritiesData = normalizeList(authoritiesRes);
      const employeesData = normalizeList(employeesRes);

      setAuthorities(authoritiesData.map(normalizeAuthority));
      setEmployees(employeesData.map(normalizeEmployee));
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!form.employeeId || !form.approverId) {
      setError('Please select both employee and approver');
      return;
    }
    // Self-approval is now allowed

    try {
      setError(null);
      setSuccess(null);
      setSubmitting(true);
      await createApprovalAuthority({
        employeeId: parseInt(form.employeeId),
        approverId: parseInt(form.approverId),
        approvalLevel: parseInt(form.approvalLevel),
      });
      setSuccess('Approval authority created successfully!');
      setForm({ employeeId: '', approverId: '', approvalLevel: 1 });
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error creating authority: ' + err.message);
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (authorityId) => {
    if (!window.confirm('Are you sure you want to delete this authority?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await deleteApprovalAuthority(authorityId);
      setSuccess('Authority deleted successfully!');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error deleting authority: ' + err.message);
      console.error('Error:', err);
    }
  };

  const employeeNameById = employees.reduce((map, e) => {
    if (e?.employeeId != null && e?.name) {
      map.set(String(e.employeeId), e.name);
    }
    return map;
  }, new Map());

  const getApproverName = (approverId) => employeeNameById.get(String(approverId)) || 'Unknown';

  const getEmployeeName = (employeeId) => employeeNameById.get(String(employeeId)) || 'Unknown';

  const filteredAuthorities = authorities
    .filter((auth) => {
      const employeeName = getEmployeeName(auth.employeeId).toLowerCase();
      const approverName = getApproverName(auth.approverId).toLowerCase();
      const search = searchTerm.toLowerCase();
      return employeeName.includes(search) || approverName.includes(search);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-white via-white to-slate-50 px-8 py-8 rounded-lg shadow mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Approval Authorities</h1>
          <p className="text-gray-600 mt-1">Manage who approves visits for each employee</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-3">
            <span className="text-xl">✓</span>
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Create Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Authority</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Employee Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee (needs approval)
                  </label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.name} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Approver Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approver
                  </label>
                  <select
                    value={form.approverId}
                    onChange={(e) => setForm({ ...form, approverId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Approver --</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Approval Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.approvalLevel}
                    onChange={(e) =>
                      setForm({ ...form, approvalLevel: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    L1 = First level, L2 = Second level, etc.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                  {submitting ? 'Creating...' : '➕ Create'}
                </button>
              </form>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {/* Total Authorities */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">Total Authorities</p>
                  <p className="text-3xl font-bold text-blue-600">{authorities.length}</p>
                </div>
                <div className="text-4xl">📋</div>
              </div>
            </div>

            {/* Active Employees */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">Active Employees</p>
                  <p className="text-3xl font-bold text-green-600">
                    {new Set(authorities.map((a) => a.employeeId)).size}
                  </p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            {/* Approvers */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">Approvers</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {new Set(authorities.map((a) => a.approverId)).size}
                  </p>
                </div>
                <div className="text-4xl">✔️</div>
              </div>
            </div>

            {/* Multi-Level */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">Max Levels</p>
                  <p className="text-3xl font-bold text-orange-600">
                    L{Math.max(...authorities.map((a) => a.approvalLevel), 1)}
                  </p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Authorities</h2>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredAuthorities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-600 mb-2">
                {authorities.length === 0
                  ? 'No approval authorities created yet.'
                  : 'No matching authorities found.'}
              </p>
              {authorities.length === 0 && (
                <p className="text-gray-500 text-sm">
                  Create the first one using the form on the left.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">
                      Employee
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">
                      Approver
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">
                      Level
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAuthorities.map((auth) => (
                    <tr key={auth.authorityId} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {getEmployeeName(auth.employeeId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {getApproverName(auth.approverId)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          L{auth.approvalLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {auth.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleDelete(auth.authorityId)}
                          className="text-red-600 hover:text-red-900 font-medium text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalAuthorityMaster;
