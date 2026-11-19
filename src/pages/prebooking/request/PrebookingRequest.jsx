import { useEffect, useMemo, useState } from 'react';
import { createPrebookingRequest, listPrebookingRequests } from '../../../services/prebookingService.js';
import { getDepartments } from '../../../services/departmentService.js';
import { getEmployees } from '../../../services/employeeService.js';

const emptyForm = {
  visitorName: '',
  visitorEmail: '',
  departmentId: '',
  hostEmployeeId: '',
  visitDate: '',
};

const getDepartmentId = (item) => item?.DepartmentId ?? item?.departmentId ?? item?.department_id;
const getDepartmentName = (item) => item?.Name ?? item?.DepartmentName ?? item?.departmentName;
const getEmployeeId = (item) =>
  item?.EmployeeId ?? item?.employeeId ?? item?.employee_id ?? item?.Id ?? item?.ID;
const getEmployeeName = (item) =>
  item?.Name ??
  item?.EmployeeName ??
  item?.employeeName ??
  item?.name ??
  `${item?.FirstName || item?.firstName || ''} ${item?.LastName || item?.lastName || ''}`.trim();

const normalizeList = (payload) => {
  const data = payload?.data;
  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.Items)) return data.Items;
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

const PrebookingRequest = () => {
  const [form, setForm] = useState(emptyForm);
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '' });

  const departmentMap = useMemo(() => {
    const map = new Map();
    departments.forEach((dept) => {
      const id = getDepartmentId(dept);
      const name = getDepartmentName(dept);
      if (id != null && name) map.set(String(id), name);
    });
    return map;
  }, [departments]);

  const employeeMap = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      const id = getEmployeeId(emp);
      const name = getEmployeeName(emp);
      if (id != null && name) map.set(String(id), name);
    });
    return map;
  }, [employees]);

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      const list = normalizeList(response);
      const visibleItems = list.filter((item) => item?.IsActive !== false);
      setDepartments(visibleItems);
    } catch (err) {
      setError(err?.message || 'Unable to load departments.');
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await getEmployees();
      const list = normalizeList(response);
      const visibleItems = list.filter((item) => item?.IsActive !== false);
      setEmployees(visibleItems);
    } catch (err) {
      setError(err?.message || 'Unable to load employees.');
    }
  };

  const loadRequests = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await listPrebookingRequests({
        status: filters.status || null,
        fromDate: filters.fromDate || null,
        toDate: filters.toDate || null,
      });
      const list = normalizeList(response);
      setRequests(list);
    } catch (err) {
      setError(err?.message || 'Unable to load prebooking requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadEmployees();
    loadRequests();
  }, []);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await createPrebookingRequest({
        visitorName: form.visitorName,
        visitorEmail: form.visitorEmail,
        departmentId: Number(form.departmentId),
        hostEmployeeId: form.hostEmployeeId ? Number(form.hostEmployeeId) : null,
        visitDate: form.visitDate,
      });

      const token = response?.data?.Token || response?.data?.token;
      const expiresAt = response?.data?.ExpiresAt || response?.data?.expiresAt;
      setSuccess(
        token
          ? `Request created. Token: ${token}${expiresAt ? ` (expires ${expiresAt})` : ''}`
          : 'Request created.'
      );
      setForm(emptyForm);
      await loadRequests();
    } catch (err) {
      setError(err?.message || 'Unable to create prebooking request.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <h1 className="text-3xl font-semibold text-slate-900">Prebooking Request</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a prebooking request and send the form link to the visitor.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr]"
        >
          <div>
            <label className="text-sm font-medium text-slate-700">Visitor name</label>
            <input
              value={form.visitorName}
              onChange={handleChange('visitorName')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter visitor name"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Visitor email</label>
            <input
              type="email"
              value={form.visitorEmail}
              onChange={handleChange('visitorEmail')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter visitor email"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Department</label>
            <select
              value={form.departmentId}
              onChange={handleChange('departmentId')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              required
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option
                  key={getDepartmentId(dept) || getDepartmentName(dept)}
                  value={getDepartmentId(dept) || ''}
                >
                  {getDepartmentName(dept)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Host employee (optional)</label>
            <select
              value={form.hostEmployeeId}
              onChange={handleChange('hostEmployeeId')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select host (optional)</option>
              {employees.map((emp) => (
                <option key={getEmployeeId(emp) || emp?.Email} value={getEmployeeId(emp) || ''}>
                  {getEmployeeName(emp) || '-'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Visit date</label>
            <input
              type="date"
              value={form.visitDate}
              onChange={handleChange('visitDate')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Sending...' : 'Create request'}
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Prebooking history</h2>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <select
              value={filters.status}
              onChange={handleFilterChange('status')}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:max-w-[180px]"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              type="date"
              value={filters.fromDate}
              onChange={handleFilterChange('fromDate')}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:max-w-[180px]"
            />
            <input
              type="date"
              value={filters.toDate}
              onChange={handleFilterChange('toDate')}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:max-w-[180px]"
            />
            <button
              type="button"
              onClick={loadRequests}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 text-sm text-slate-500">Loading prebooking requests...</div>
        ) : requests.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No prebooking requests found.
          </div>
        ) : (
          <div className="mt-6 max-h-[70vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Visitor</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Host</th>
                  <th className="px-4 py-3">Visit date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((item) => (
                  <tr key={item?.PrebookingId || item?.Token} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item?.VisitorName || '-'}
                    </td>
                    <td className="px-4 py-3">{item?.VisitorEmail || '-'}</td>
                    <td className="px-4 py-3">
                      {departmentMap.get(String(item?.DepartmentId ?? item?.departmentId)) || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {employeeMap.get(String(item?.HostEmployeeId ?? item?.hostEmployeeId ?? item?.host_employee_id)) ||
                        item?.HostEmployeeName ||
                        item?.hostEmployeeName ||
                        item?.host_employee_name ||
                        (item?.HostEmployeeId != null ? `#${item?.HostEmployeeId}` : '-')}
                    </td>
                    <td className="px-4 py-3">{item?.VisitDate || '-'}</td>
                    <td className="px-4 py-3">{item?.Status || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {item?.Token || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrebookingRequest;
