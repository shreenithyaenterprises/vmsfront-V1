import { useEffect, useMemo, useState } from 'react';
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from '../../../services/employeeService.js';
import { getDepartments } from '../../../services/departmentService.js';
import { getDesignations } from '../../../services/designationService.js';

const emptyForm = {
  id: null,
  name: '',
  department: '',
  departmentId: '',
  designation: '',
  mobile: '',
  email: '',
  isDepartmentHead: false,
  approvalRequired: true,
};

const extractArray = (response) => {
  if (Array.isArray(response)) return response;

  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(response?.Items)) return response.Items;
  if (Array.isArray(response?.Data)) return response.Data;

  return [];
};

const normalizeEmployee = (item) => ({
  employee_id: item?.employee_id ?? item?.EmployeeId ?? item?.employeeId ?? null,
  name: item?.name ?? item?.Name ?? '',
  department: item?.department ?? item?.Department ?? '',
  department_id: item?.department_id ?? item?.DepartmentId ?? item?.departmentId ?? '',
  designation: item?.designation ?? item?.Designation ?? '',
  mobile: item?.mobile ?? item?.Mobile ?? '',
  email: item?.email ?? item?.Email ?? '',
  is_department_head:
    item?.is_department_head ?? item?.IsDepartmentHead ?? item?.isDepartmentHead ?? false,
  approval_required:
    item?.approval_required ?? item?.ApprovalRequired ?? item?.approvalRequired ?? false,
  is_active: item?.is_active ?? item?.IsActive ?? item?.isActive ?? true,
});

const normalizeEmployeeList = (response) =>
  extractArray(response)
    .filter((item) => item && typeof item === 'object')
    .map(normalizeEmployee)
    .filter((item) => item.is_active !== false);

const normalizeOptionList = (response) =>
  extractArray(response).filter((item) => item?.IsActive !== false && item?.is_active !== false);

const getDepartmentId = (department) =>
  department?.DepartmentId ?? department?.department_id ?? '';

const getDepartmentName = (department) =>
  department?.Name ?? department?.name ?? department?.Department ?? department?.department ?? '';

const getDesignationName = (designation) =>
  designation?.Name ?? designation?.name ?? designation?.Designation ?? designation?.designation ?? '';

const createEmployeeRowKey = (employee, index) =>
  `${employee?.employee_id ?? 'employee'}-${employee?.email ?? 'no-email'}-${index}`;

const createDepartmentOptionKey = (department, index) =>
  `${getDepartmentId(department) || 'department'}-${getDepartmentName(department) || 'no-name'}-${index}`;

const createDesignationOptionKey = (designation, index) =>
  `${getDesignationName(designation) || 'designation'}-${index}`;

const createFormFromEmployee = (employee, departments) => {
  const matchedDepartment = departments.find(
    (department) =>
      String(getDepartmentId(department)) === String(employee.department_id) ||
      getDepartmentName(department) === employee.department
  );

  return {
    id: employee.employee_id,
    name: employee.name || '',
    department: employee.department || '',
    departmentId: employee.department_id ?? getDepartmentId(matchedDepartment) ?? '',
    designation: employee.designation || '',
    mobile: employee.mobile || '',
    email: employee.email || '',
    isDepartmentHead: Boolean(employee.is_department_head),
    approvalRequired: Boolean(employee.approval_required),
  };
};

const EmployeeMaster = () => {
  const [form, setForm] = useState(emptyForm);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMountBanner, setShowMountBanner] = useState(false);

  const isEditing = Boolean(form.id);

  const filteredEmployees = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return employees;

    return employees.filter((employee) =>
      [
        employee.name,
        employee.department,
        employee.designation,
        employee.mobile,
        employee.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
    );
  }, [employees, query]);

  const loadEmployees = async () => {
    console.log('Loading employees with query:', query);
    setIsLoading(true);
    setError('');
    try {
      const response = await getEmployees();
      setEmployees(normalizeEmployeeList(response));
    } catch (err) {
      setError(err?.message || 'Unable to load employees.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(normalizeOptionList(response));
    } catch (err) {
      setError(err?.message || 'Unable to load departments.');
    }
  };

  const loadDesignations = async () => {
    try {
      const response = await getDesignations();
      setDesignations(normalizeOptionList(response));
    } catch (err) {
      setError(err?.message || 'Unable to load designations.');
    }
  };

  useEffect(() => {
    setShowMountBanner(true);
    loadEmployees();
    loadDepartments();
    loadDesignations();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setError('');
    setSuccess('');
  };

  const handleChange = (field) => (event) => {
    if (field === 'departmentId') {
      const rawValue = event.target.value;
      const selectedDepartment = departments.find(
        (department) => String(getDepartmentId(department)) === String(rawValue)
      );

      setForm((current) => ({
        ...current,
        departmentId: rawValue ? Number(rawValue) : '',
        department: selectedDepartment ? getDepartmentName(selectedDepartment) : '',
      }));
      return;
    }

    if (field === 'approvalRequired' || field === 'isDepartmentHead') {
      setForm((current) => ({
        ...current,
        [field]: event.target.value === 'yes',
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleEdit = (employee) => {
    setError('');
    setSuccess('');
    setForm(createFormFromEmployee(employee, departments));
  };

  const handleDelete = async (employee) => {
    if (!employee.employee_id) return;
    if (!window.confirm('Delete this employee?')) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await deleteEmployee({ id: employee.employee_id });
      setSuccess('Employee deleted.');
      await loadEmployees();
      if (form.id === employee.employee_id) {
        resetForm();
      }
    } catch (err) {
      setError(err?.message || 'Unable to delete employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      name: form.name,
      department: form.department,
      departmentId: form.departmentId,
      designation: form.designation,
      mobile: form.mobile,
      email: form.email,
      isDepartmentHead: form.isDepartmentHead,
      approvalRequired: form.approvalRequired,
    };

    try {
      if (isEditing) {
        await updateEmployee({ id: form.id, ...payload });
        setSuccess('Employee updated.');
      } else {
        await createEmployee(payload);
        setSuccess('Employee created.');
      }

      resetForm();
      await loadEmployees();
    } catch (err) {
      setError(err?.message || 'Unable to save employee.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {showMountBanner && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          EmployeeMaster mounted successfully.
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="bg-linear-to-r from-white via-white to-slate-50 px-8 py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Employee Master</h1>
              <p className="mt-1 text-sm text-slate-600">
                Create, update, delete, and view employee records.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              New Employee
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 px-8 pb-8 pt-6 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr]"
        >
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              value={form.name}
              onChange={handleChange('name')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter name"
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
              {departments.map((department, index) => (
                <option
                  key={createDepartmentOptionKey(department, index)}
                  value={getDepartmentId(department)}
                >
                  {getDepartmentName(department)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Designation</label>
            <select
              value={form.designation}
              onChange={handleChange('designation')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              required
            >
              <option value="">Select designation</option>
              {designations.map((designation, index) => (
                <option
                  key={createDesignationOptionKey(designation, index)}
                  value={getDesignationName(designation)}
                >
                  {getDesignationName(designation)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Mobile</label>
            <input
              type="tel"
              value={form.mobile}
              onChange={handleChange('mobile')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter mobile"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Approval required</label>
            <select
              value={form.approvalRequired ? 'yes' : 'no'}
              onChange={handleChange('approvalRequired')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              required
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Department head</label>
            <select
              value={form.isDepartmentHead ? 'yes' : 'no'}
              onChange={handleChange('isDepartmentHead')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              required
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div className="flex items-end gap-3 md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mx-8 mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mx-8 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Employee list</h2>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, department, email"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:max-w-xs"
            />
            <button
              type="button"
              onClick={loadEmployees}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 text-sm text-slate-500">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No employees found.
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No matches found for your search.
          </div>
        ) : (
          <div className="mt-6 max-h-[70vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Dept Head</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((employee, index) => (
                  <tr key={createEmployeeRowKey(employee, index)} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{employee.name || '-'}</td>
                    <td className="px-4 py-3">{employee.department || '-'}</td>
                    <td className="px-4 py-3">{employee.designation || '-'}</td>
                    <td className="px-4 py-3">{employee.mobile || '-'}</td>
                    <td className="px-4 py-3">{employee.email || '-'}</td>
                    <td className="px-4 py-3">{employee.approval_required ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{employee.is_department_head ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(employee)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(employee)}
                          disabled={isSaving}
                          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
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

export default EmployeeMaster;
