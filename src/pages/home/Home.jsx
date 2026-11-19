import { useEffect, useMemo, useState } from 'react';
import { getHomeDashboardSummary } from '../../services/homeDashboardService.js';
import {
  listGovernmentOfficialEntriesToday,
  checkInGovernmentOfficial,
  checkOutGovernmentOfficial,
} from '../../services/governmentOfficialService.js';
import { getCeatInterplantDashboardList } from '../../services/ceatInterplantDashboardService.js';

const getTodayISODate = () => new Date().toISOString().slice(0, 10);

const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forDate, setForDate] = useState(getTodayISODate());
  const [dashboard, setDashboard] = useState({
    todayTotalVisitors: 0,
    todayPrebookingVisitors: 0,
    departmentWise: [],
    todayVisitors: [],
    upcomingVisitors: [],
  });
  const [govRows, setGovRows] = useState([]);
  const [govLoading, setGovLoading] = useState(false);
  const [govActionLoadingId, setGovActionLoadingId] = useState(null);
  const [ceatRows, setCeatRows] = useState([]);
  const [ceatLoading, setCeatLoading] = useState(false);

  const [selectedPanel, setSelectedPanel] = useState({
    type: 'prebooking',
    key: null,
    title: "Today's Prebooking Visitors",
  });

  const loadDashboard = async (date = forDate) => {
    try {
      setLoading(true);
      setError('');

      const response = await getHomeDashboardSummary({ forDate: date });
      const data = response?.data || {};

      setDashboard({
        todayTotalVisitors: Number(data?.todayTotalVisitors || 0),
        todayPrebookingVisitors: Number(data?.todayPrebookingVisitors || 0),
        departmentWise: Array.isArray(data?.departmentWise) ? data.departmentWise : [],
        todayVisitors: Array.isArray(data?.todayVisitors) ? data.todayVisitors : [],
        upcomingVisitors: Array.isArray(data?.upcomingVisitors) ? data.upcomingVisitors : [],
      });
    } catch (err) {
      setError(err?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const loadGovernmentOfficialRows = async (date = forDate) => {
    setGovLoading(true);
    try {
      const response = await listGovernmentOfficialEntriesToday({ forDate: date });
      setGovRows(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      setGovRows([]);
      setError((prev) => prev || err?.message || 'Unable to load government official entries.');
    } finally {
      setGovLoading(false);
    }
  };

  const loadCeatRows = async (date = forDate) => {
    setCeatLoading(true);
    try {
      const response = await getCeatInterplantDashboardList({ forDate: date });
      setCeatRows(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (err) {
      setCeatRows([]);
      setError((prev) => prev || err?.message || 'Unable to load CEAT inter-plant entries.');
    } finally {
      setCeatLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(forDate);
    loadGovernmentOfficialRows(forDate);
    loadCeatRows(forDate);
  }, []);

  const handleGovernmentIn = async (visitId) => {
    setGovActionLoadingId(visitId);
    setError('');
    try {
      await checkInGovernmentOfficial({ visitId, entryGate: 'Main Gate' });
      await loadGovernmentOfficialRows(forDate);
      await loadDashboard(forDate);
    } catch (err) {
      setError(err?.message || 'Unable to mark government official IN.');
    } finally {
      setGovActionLoadingId(null);
    }
  };

  const handleGovernmentOut = async (visitId) => {
    setGovActionLoadingId(visitId);
    setError('');
    try {
      await checkOutGovernmentOfficial({ visitId, exitGate: 'Main Gate' });
      await loadGovernmentOfficialRows(forDate);
      await loadDashboard(forDate);
    } catch (err) {
      setError(err?.message || 'Unable to mark government official OUT.');
    } finally {
      setGovActionLoadingId(null);
    }
  };

  const detailRows = useMemo(() => {
    if (selectedPanel.type === 'today') return dashboard.todayVisitors;
    if (selectedPanel.type === 'prebooking') return dashboard.upcomingVisitors;
    if (selectedPanel.type === 'department') {
      return dashboard.todayVisitors.filter(
        (row) =>
          (row?.DepartmentName || row?.departmentName || 'Unassigned') ===
          selectedPanel.key
      );
    }
    return [];
  }, [selectedPanel, dashboard]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-900 to-emerald-900 p-4 sm:p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Operations Dashboard</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-cyan-100">
              Track today&apos;s visitors, prebookings, and department flow.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={forDate}
              onChange={(e) => setForDate(e.target.value)}
              className="rounded-lg border border-white/30 bg-white/10 px-2 sm:px-3 py-2 text-xs sm:text-sm text-white outline-none placeholder:text-white/60"
            />
            <button
              type="button"
              onClick={() => {
                loadDashboard(forDate);
                loadGovernmentOfficialRows(forDate);
                loadCeatRows(forDate);
              }}
              className="rounded-lg bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <button
          type="button"
          onClick={() =>
            setSelectedPanel({ type: 'today', key: null, title: "Today's Checked Visitors" })
          }
          className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left shadow-sm hover:shadow-md transition-all hover:border-slate-300"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Total Visitors</p>
              <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{dashboard.todayTotalVisitors}</p>
            </div>
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="mt-2 text-[10px] sm:text-xs text-slate-500">All checked-in today</p>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedPanel({
              type: 'prebooking',
              key: null,
              title: "Today's Prebooking Visitors",
            })
          }
          className="rounded-xl sm:rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 sm:p-5 text-left shadow-sm hover:shadow-md transition-all hover:border-blue-300"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700">Pre-Booked</p>
              <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-blue-900">{dashboard.todayPrebookingVisitors}</p>
            </div>
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="mt-2 text-[10px] sm:text-xs text-blue-600">Scheduled appointments</p>
        </button>
      </div>

      <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Government Official Notification</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Security can mark IN/OUT directly for today.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadGovernmentOfficialRows(forDate)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {govLoading ? (
          <div className="mt-4 text-sm text-slate-500">Loading government official entries...</div>
        ) : govRows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No government official entries for {fmtDate(forDate)}.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Official</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {govRows.map((row) => {
                  const visitId = row?.VisitID;
                  const status = row?.VisitStatus || 'PENDING_ENTRY';
                  const loadingAction = govActionLoadingId === visitId;

                  return (
                    <tr key={row?.EntryId || visitId || row?.ReferenceCode}>
                      <td className="px-3 py-2">{row?.UserDepartment || '-'}</td>
                      <td className="px-3 py-2">{row?.OfficialType || '-'}</td>
                      <td className="px-3 py-2">{row?.PurposeOfVisit || '-'}</td>
                      <td className="px-3 py-2">{status}</td>
                      <td className="px-3 py-2">
                        {status === 'PENDING_ENTRY' ? (
                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={() => handleGovernmentIn(visitId)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {loadingAction ? '...' : 'IN'}
                          </button>
                        ) : null}
                        {status === 'CHECKED_IN' ? (
                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={() => handleGovernmentOut(visitId)}
                            className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {loadingAction ? '...' : 'OUT'}
                          </button>
                        ) : null}
                        {status !== 'PENDING_ENTRY' && status !== 'CHECKED_IN' ? (
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

      <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Inter-Plant Requests</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Approval and pass lifecycle tracking for {fmtDate(forDate)}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadCeatRows(forDate)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {ceatLoading ? (
          <div className="mt-4 text-sm text-slate-500">Loading inter-plant entries...</div>
        ) : ceatRows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No inter-plant requests for {fmtDate(forDate)}.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Visitor</th>
                  <th className="px-3 py-2">Employee ID</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ceatRows.map((row) => (
                  <tr key={row?.RequestId || row?.ReferenceCode}>
                    <td className="px-3 py-2">{row?.VisitorName || '-'}</td>
                    <td className="px-3 py-2">{row?.EmployeeId || '-'}</td>
                    <td className="px-3 py-2">{row?.PurposeOfVisit || '-'}</td>
                    <td className="px-3 py-2">{row?.VisitStatus || row?.RequestStatus || '-'}</td>
                    <td className="px-3 py-2">{row?.ReferenceCode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">Department-Wise</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Click to view visitors by department.</p>

          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1">
            {dashboard.departmentWise.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-8 sm:px-4 sm:py-10 text-center text-xs sm:text-sm text-slate-500">
                No department data for {fmtDate(forDate)}.
              </div>
            ) : (
              dashboard.departmentWise.map((dept) => {
                const deptName = dept?.DepartmentName || dept?.departmentName || 'Unassigned';
                const count = Number(dept?.VisitorCount || dept?.visitorCount || 0);
                const checkedIn = Number(dept?.CheckedInCount || dept?.checkedInCount || 0);
                const checkedOut = Number(dept?.CheckedOutCount || dept?.checkedOutCount || 0);
                const active = selectedPanel.type === 'department' && selectedPanel.key === deptName;

                return (
                  <button
                    key={deptName}
                    type="button"
                    onClick={() =>
                      setSelectedPanel({
                        type: 'department',
                        key: deptName,
                        title: `Department: ${deptName}`,
                      })
                    }
                    className={`rounded-lg sm:rounded-xl border p-3 sm:p-4 text-left transition-all w-full ${
                      active
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate pr-2">{deptName}</p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-800 shrink-0">{count}</p>
                    </div>
                    <div className="mt-1 sm:mt-2 flex gap-3 sm:gap-4 text-[10px] sm:text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        In: {checkedIn}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        Out: {checkedOut}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{selectedPanel.title}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-slate-600 w-fit">
              {detailRows.length} {detailRows.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 sm:mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-6 sm:px-4 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-2"></div>
              <p>Loading dashboard...</p>
            </div>
          ) : error ? (
            <div className="mt-4 sm:mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-3 sm:px-4 sm:py-4 text-xs sm:text-sm text-red-700">
              {error}
            </div>
          ) : detailRows.length === 0 ? (
            <div className="mt-4 sm:mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 sm:px-4 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
              No records found for {fmtDate(forDate)}.
            </div>
          ) : (
            <div className="mt-3 sm:mt-4">
              {/* Desktop/Tablet Table View */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Visitor</th>
                      <th className="px-3 py-3 font-semibold">Department</th>
                      <th className="px-3 py-3 font-semibold">Host</th>
                      <th className="px-3 py-3 font-semibold">Purpose/Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {detailRows.map((row, index) => {
                      const visitorName = row?.VisitorName || row?.visitorName || '-';
                      const visitorEmail = row?.VisitorEmail || row?.visitorEmail || '';
                      const deptName = row?.DepartmentName || row?.departmentName || '-';
                      const hostName = row?.HostEmployeeName || row?.hostEmployeeName || '-';
                      const purpose = row?.Purpose || row?.PurposeName || row?.purposeName || '-';
                      const status = row?.VisitStatus || row?.RequestStatus || row?.visitStatus || '-';
                      const key = row?.VisitID || row?.PreBookingId || row?.PreBookingID || `${visitorName}-${index}`;

                      return (
                        <tr key={key} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-3">
                            <p className="font-semibold text-slate-900">{visitorName}</p>
                            {visitorEmail ? (
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{visitorEmail}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">{deptName}</td>
                          <td className="px-3 py-3">{hostName}</td>
                          <td className="px-3 py-3">
                            <p className="text-sm">{purpose}</p>
                            <p className="text-xs text-slate-500">{status}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {detailRows.map((row, index) => {
                  const visitorName = row?.VisitorName || row?.visitorName || '-';
                  const visitorEmail = row?.VisitorEmail || row?.visitorEmail || '';
                  const deptName = row?.DepartmentName || row?.departmentName || '-';
                  const hostName = row?.HostEmployeeName || row?.hostEmployeeName || '-';
                  const purpose = row?.Purpose || row?.PurposeName || row?.purposeName || '-';
                  const status = row?.VisitStatus || row?.RequestStatus || row?.visitStatus || '-';
                  const key = row?.VisitID || row?.PreBookingId || row?.PreBookingID || `${visitorName}-${index}`;

                  return (
                    <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{visitorName}</p>
                        {visitorEmail ? <p className="text-xs text-slate-500 truncate">{visitorEmail}</p> : null}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Department</p>
                          <p className="font-medium text-slate-700 truncate">{deptName}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Host</p>
                          <p className="font-medium text-slate-700 truncate">{hostName}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 text-xs">
                        <p className="text-slate-700">{purpose}</p>
                        <p className="text-slate-500 mt-0.5">{status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
