import { useEffect, useMemo, useState } from 'react';
import {
  createGovernmentOfficialEntry,
  listGovernmentOfficialEntriesToday,
  checkInGovernmentOfficial,
  checkOutGovernmentOfficial,
} from '../../../services/governmentOfficialService.js';

const DEPARTMENTS = ['EHS', 'Engineering', 'Quality', 'HR & Admin', 'Finance'];

const OFFICIAL_TYPES = [
  'Client',
  'Auditor',
  'Visitor',
  'Trainer',
  'Banker',
  'MPCB Official',
  'Dish Official',
  'MIDC Official',
  'MSEB Official',
  'Police Official',
  'Boiler Official',
  'Other',
];

const fmtDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const GovernmentOfficialEntry = () => {
  const [form, setForm] = useState({
    userDepartment: '',
    officialType: '',
    purposeOfVisit: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rows, setRows] = useState([]);

  const departmentOptions = useMemo(
    () => [...DEPARTMENTS].sort((a, b) => a.localeCompare(b)),
    []
  );

  const officialTypeOptions = useMemo(
    () => [...OFFICIAL_TYPES].sort((a, b) => a.localeCompare(b)),
    []
  );

  const loadToday = async () => {
    setLoadingToday(true);
    setError('');

    try {
      const response = await listGovernmentOfficialEntriesToday();
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      setRows(items);
    } catch (err) {
      setRows([]);
      setError(err?.message || 'Unable to load today entries.');
    } finally {
      setLoadingToday(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await createGovernmentOfficialEntry({
        userDepartment: form.userDepartment,
        officialType: form.officialType,
        purposeOfVisit: form.purposeOfVisit,
      });

      const ref = response?.data?.ReferenceCode || response?.data?.referenceCode || '-';
      setSuccess(`Sent to Security dashboard. Reference: ${ref}`);
      setForm({ userDepartment: '', officialType: '', purposeOfVisit: '' });
      await loadToday();
    } catch (err) {
      setError(err?.message || 'Unable to submit Government Official entry.');
    } finally {
      setSaving(false);
    }
  };

  const markIn = async (visitId) => {
    setActionLoadingId(visitId);
    setError('');
    setSuccess('');

    try {
      await checkInGovernmentOfficial({ visitId, entryGate: 'Main Gate' });
      setSuccess('Government official marked as IN.');
      await loadToday();
    } catch (err) {
      setError(err?.message || 'Unable to mark IN.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const markOut = async (visitId) => {
    setActionLoadingId(visitId);
    setError('');
    setSuccess('');

    try {
      await checkOutGovernmentOfficial({ visitId, exitGate: 'Main Gate' });
      setSuccess('Government official marked as OUT.');
      await loadToday();
    } catch (err) {
      setError(err?.message || 'Unable to mark OUT.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'CHECKED_IN') return 'bg-emerald-100 text-emerald-700';
    if (status === 'CHECKED_OUT' || status === 'COMPLETED') return 'bg-slate-200 text-slate-700';
    return 'bg-amber-100 text-amber-700';
  };

  useEffect(() => {
    loadToday();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <h1 className="text-3xl font-semibold text-slate-900">Government Official Entry</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create Government Official entry and send notification to Security dashboard.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">User Department</label>
            <select
              value={form.userDepartment}
              onChange={handleChange('userDepartment')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              required
            >
              <option value="">Select Department</option>
              {departmentOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Type of Government Official</label>
            <select
              value={form.officialType}
              onChange={handleChange('officialType')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              required
            >
              <option value="">Select Type</option>
              {officialTypeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Purpose of Visit</label>
            <textarea
              value={form.purposeOfVisit}
              onChange={handleChange('purposeOfVisit')}
              className="mt-2 min-h-[108px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter purpose of visit"
              required
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Sending...' : 'Send to Security'}
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Today Government Official Movement</h2>
          <button
            type="button"
            onClick={loadToday}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loadingToday ? (
          <div className="mt-6 text-sm text-slate-500">Loading entries...</div>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No Government Official entries for today.
          </div>
        ) : (
          <div className="mt-6 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Official Type</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">In Time</th>
                  <th className="px-4 py-3">Out Time</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((item) => {
                  const status = item?.VisitStatus || 'PENDING_ENTRY';
                  const visitId = item?.VisitID;
                  const canIn = status === 'PENDING_ENTRY';
                  const canOut = status === 'CHECKED_IN';
                  const loadingAction = actionLoadingId === visitId;

                  return (
                    <tr key={item?.EntryId || visitId || item?.ReferenceCode} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{item?.UserDepartment || '-'}</td>
                      <td className="px-4 py-3">{item?.OfficialType || '-'}</td>
                      <td className="px-4 py-3">{item?.PurposeOfVisit || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{fmtDateTime(item?.CreatedAt)}</td>
                      <td className="px-4 py-3">{fmtDateTime(item?.EntryTime)}</td>
                      <td className="px-4 py-3">{fmtDateTime(item?.ExitTime)}</td>
                      <td className="px-4 py-3">
                        {canIn ? (
                          <button
                            type="button"
                            onClick={() => markIn(visitId)}
                            disabled={loadingAction}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingAction ? '...' : 'Mark IN'}
                          </button>
                        ) : null}

                        {canOut ? (
                          <button
                            type="button"
                            onClick={() => markOut(visitId)}
                            disabled={loadingAction}
                            className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingAction ? '...' : 'Mark OUT'}
                          </button>
                        ) : null}

                        {!canIn && !canOut ? (
                          <span className="text-xs font-semibold text-slate-500">Completed</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GovernmentOfficialEntry;
