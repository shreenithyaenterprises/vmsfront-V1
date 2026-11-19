import { useEffect, useMemo, useState } from 'react';
import { listVisitorReport } from '../../../services/visitorReportService.js';
import { getPurposes } from '../../../services/purposeService.js';
import { getVisitorTypes } from '../../../services/visitorTypeService.js';

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

const decodeHtmlEntities = (value) => {
  if (!value) return value;

  return String(value)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

const toImageSrc = (value) => {
  if (!value) return null;
  const raw = decodeHtmlEntities(value).trim();
  if (!raw) return null;
  if (raw.startsWith('data:image')) return raw;

  // Absolute URLs are valid image sources as-is.
  if (/^https?:\/\//i.test(raw)) return raw;

  // Treat app-relative paths as URLs, but avoid misclassifying JPEG base64 (/9j...).
  const isLikelyPath = raw.startsWith('/') && !raw.startsWith('/9j/');
  if (isLikelyPath) return raw;

  // Guess image mime for raw base64 payloads to improve rendering reliability.
  const mime = raw.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${raw}`;
};

const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const fmtDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getDisplayStatus = (status) => {
  if (status === 'COMPLETED') return 'CHECK OUT';
  return status || '-';
};

const getPPEComplianceClasses = (status) => {
  if (status === 'MATCHED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'MISMATCH') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
};

const getPurposeId = (item) => item?.PurposeId ?? item?.purposeId ?? item?.purpose_id;
const getPurposeName = (item) => item?.Name ?? item?.PurposeName ?? item?.purposeName ?? item?.name;
const getVisitorTypeName = (item) => item?.Name ?? item?.VisitorTypeName ?? item?.visitorTypeName ?? item?.name;

const getTodayISODate = () => new Date().toISOString().slice(0, 10);

const VisitorReport = () => {
  const today = getTodayISODate();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [visitorTypes, setVisitorTypes] = useState([]);
  const [photoModal, setPhotoModal] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  const [filters, setFilters] = useState({
    fromDate: today,
    toDate: today,
    search: '',
    purposeId: '',
    visitorType: '',
    visitStatus: '',
    pageNumber: 1,
    pageSize: 20,
  });

  const [paging, setPaging] = useState({
    totalRecords: 0,
    totalPages: 0,
    pageNumber: 1,
    pageSize: 20,
  });

  const fetchLookups = async () => {
    try {
      const [purposeRes, visitorTypeRes] = await Promise.all([
        getPurposes(),
        getVisitorTypes(),
      ]);
      setPurposes(normalizeList(purposeRes).filter((x) => x?.IsActive !== false));
      setVisitorTypes(normalizeList(visitorTypeRes).filter((x) => x?.IsActive !== false));
    } catch (err) {
      setError(err?.message || 'Unable to load report filter data.');
    }
  };

  const fetchReport = async (nextPage = filters.pageNumber) => {
    setLoading(true);
    setError('');

    try {
      const response = await listVisitorReport({
        fromDate: filters.fromDate || null,
        toDate: filters.toDate || null,
        search: filters.search || null,
        purposeId: filters.purposeId || null,
        visitorType: filters.visitorType || null,
        visitStatus: filters.visitStatus || null,
        pageNumber: nextPage,
        pageSize: filters.pageSize,
      });

      const payload = response?.data || {};
      setRows(Array.isArray(payload.items) ? payload.items : []);
      setImageErrors({});
      setPaging({
        totalRecords: Number(payload.totalRecords || 0),
        totalPages: Number(payload.totalPages || 0),
        pageNumber: Number(payload.pageNumber || nextPage),
        pageSize: Number(payload.pageSize || filters.pageSize),
      });
    } catch (err) {
      setRows([]);
      setPaging((prev) => ({ ...prev, totalRecords: 0, totalPages: 0 }));
      setError(err?.message || 'Unable to load visitor report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchReport(1);
  }, []);

  const handleFilter = (field) => (event) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setFilters((prev) => ({ ...prev, pageNumber: 1 }));
    fetchReport(1);
  };

  const resetFilters = () => {
    const resetToday = getTodayISODate();
    const next = {
      fromDate: resetToday,
      toDate: resetToday,
      search: '',
      purposeId: '',
      visitorType: '',
      visitStatus: '',
      pageNumber: 1,
      pageSize: filters.pageSize,
    };
    setFilters(next);
    setTimeout(() => {
      fetchReport(1);
    }, 0);
  };

  // --------------------------------------
  // CSV Export functions
  // --------------------------------------
  const escapeCSV = (value) => {
    if (value == null) return '';
    const str = String(value);
    // If the string contains a comma, double quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

 const convertToCSV = (data) => {
  const headers = [
    'Visitor Name',
    'Company Name',
    'Email',
    'Mobile',
    'Category',
    'Purpose',
    'Host',
    'Department',
    'Visit Date',
    'In Time',
    'Out Time',
    'PPE Issued',
    'PPE Returned',
    'PPE Status',
    'Status',
    'Reference Code',
  ];

  const rows = data.map((row) => [
    row?.VisitorName || '',
    row?.VisitorCompanyName || '',
    row?.VisitorEmail || '',
    row?.VisitorMobile || '',
    row?.VisitorCategory || '',
    row?.PurposeName || '',
    row?.HostEmployeeName || '',
    row?.DepartmentName || '',
    fmtDate(row?.VisitDate),
    fmtDateTime(row?.EntryTime),
    fmtDateTime(row?.ExitTime),
    row?.IssuedPPEItems || '',
    row?.ReturnedPPEItems || '',
    row?.PPEComplianceStatus || 'NOT_APPLICABLE',
    getDisplayStatus(row?.VisitStatus),
    row?.ReferenceCode || '',
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map((r) => r.map(escapeCSV).join(',')),
  ];

  return csvLines.join('\n');
};

  const downloadCSV = (csvContent) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `visitor_report_${filters.fromDate}_to_${filters.toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const response = await listVisitorReport({
        fromDate: filters.fromDate || null,
        toDate: filters.toDate || null,
        search: filters.search || null,
        purposeId: filters.purposeId || null,
        visitorType: filters.visitorType || null,
        visitStatus: filters.visitStatus || null,
        pageNumber: 1,
        pageSize: 10000, // Large enough to fetch all records; adjust if needed
      });
      const payload = response?.data || {};
      const allItems = Array.isArray(payload.items) ? payload.items : [];
      const csv = convertToCSV(allItems);
      downloadCSV(csv);
    } catch (err) {
      setError('Failed to export data. ' + (err?.message || ''));
    } finally {
      setExporting(false);
    }
  };

  // --------------------------------------

  const visitorTypeOptions = useMemo(() => {
    const builtIn = ['VENDOR', 'TRIP', 'INTERVIEW', 'OFFICIAL', 'PERSONAL', 'CONTRACTOR', 'GOVERNMENT_OFFICIAL', 'CEAT_INTERPLANT'];
    const dbTypes = visitorTypes.map((item) => getVisitorTypeName(item)).filter(Boolean);
    const reportTypes = rows.map((r) => r?.VisitorCategory).filter(Boolean);
    return Array.from(new Set([...builtIn, ...dbTypes, ...reportTypes]));
  }, [visitorTypes, rows]);

  const goToPage = (page) => {
    const next = Math.max(1, Math.min(page, paging.totalPages || 1));
    setFilters((prev) => ({ ...prev, pageNumber: next }));
    fetchReport(next);
  };

  const statCheckedIn = rows.filter((r) => r?.VisitStatus === 'CHECKED_IN').length;
  const statCheckedOut = rows.filter((r) => ['CHECKED_OUT', 'COMPLETED'].includes(r?.VisitStatus)).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-6 text-white shadow-[0_24px_60px_-35px_rgba(2,132,199,0.9)] sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight">Visitor Movement Report</h1>
        <p className="mt-2 text-sm text-cyan-50 sm:text-base">
          Full report with in-time, out-time, category, purpose, and photo preview.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{paging.totalRecords}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Checked In</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{statCheckedIn}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Checked Out</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{statCheckedOut}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            value={filters.search}
            onChange={handleFilter('search')}
            placeholder="Search visitor, host, ref, purpose..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <input
            type="date"
            value={filters.fromDate}
            onChange={handleFilter('fromDate')}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <input
            type="date"
            value={filters.toDate}
            onChange={handleFilter('toDate')}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <select
            value={filters.purposeId}
            onChange={handleFilter('purposeId')}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">All purposes</option>
            {purposes.map((p) => (
              <option key={getPurposeId(p) || getPurposeName(p)} value={getPurposeId(p) || ''}>
                {getPurposeName(p)}
              </option>
            ))}
          </select>
          <select
            value={filters.visitorType}
            onChange={handleFilter('visitorType')}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">All categories</option>
            {visitorTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filters.visitStatus}
            onChange={handleFilter('visitStatus')}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">All status</option>
            <option value="PENDING_ENTRY">PENDING_ENTRY</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="CHECKED_OUT">CHECKED_OUT</option>
          </select>
          <select
            value={filters.pageSize}
            onChange={handleFilter('pageSize')}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <div className="flex gap-2 xl:col-span-1">
            <button
              type="button"
              onClick={applyFilters}
              className="flex-1 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={exportToExcel}
            disabled={exporting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {exporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exporting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </>
            )}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {/* Table / Mobile Cards – no changes here */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            No visitors found for the selected filters.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.15em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Photo</th>
                    <th className="px-3 py-3">Visitor</th>
                    <th className="px-3 py-3">Company</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Purpose</th>
                    <th className="px-3 py-3">Host</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">In Time</th>
                    <th className="px-3 py-3">Out Time</th>
                    <th className="px-3 py-3">PPE Issued</th>
                    <th className="px-3 py-3">PPE Returned</th>
                    <th className="px-3 py-3">PPE Match</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rows.map((row) => {
                    const imageSrc = toImageSrc(row?.VisitorPhoto);
                    const imageKey = row?.VisitID || row?.ReferenceCode || row?.VisitorEmail || row?.VisitorName;
                    const hasImageError = Boolean(imageErrors[imageKey]);

                    return (
                      <tr key={row?.VisitID || row?.ReferenceCode} className="hover:bg-slate-50">
                        <td className="px-3 py-3">
                          {imageSrc && !hasImageError ? (
                            <button
                              type="button"
                              onClick={() => setPhotoModal({ src: imageSrc, name: row?.VisitorName })}
                              className="rounded-xl border border-slate-200 p-0.5"
                            >
                              <img
                                src={imageSrc}
                                alt={row?.VisitorName || 'Visitor'}
                                className="h-12 w-12 rounded-lg object-cover"
                                onError={() => setImageErrors((prev) => ({ ...prev, [imageKey]: true }))}
                              />
                            </button>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                              NA
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{row?.VisitorName || '-'}</p>
                          {row?.VisitorEmail ? (
                            <p className="text-xs text-slate-500">{row?.VisitorEmail}</p>
                          ) : null}
                          {row?.VisitorMobile ? (
                            <p className="text-xs text-slate-500">{row?.VisitorMobile}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">{row?.VisitorCompanyName || '-'}</td>
                        <td className="px-3 py-3">{row?.VisitorCategory || '-'}</td>
                        <td className="px-3 py-3">{row?.PurposeName || '-'}</td>
                        <td className="px-3 py-3">
                          <p>{row?.HostEmployeeName || '-'}</p>
                          <p className="text-xs text-slate-500">{row?.DepartmentName || '-'}</p>
                        </td>
                        <td className="px-3 py-3">{fmtDate(row?.VisitDate)}</td>
                        <td className="px-3 py-3">{fmtDateTime(row?.EntryTime)}</td>
                        <td className="px-3 py-3">{fmtDateTime(row?.ExitTime)}</td>
                        <td className="px-3 py-3 text-xs">{row?.IssuedPPEItems || '-'}</td>
                        <td className="px-3 py-3 text-xs">{row?.ReturnedPPEItems || '-'}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getPPEComplianceClasses(row?.PPEComplianceStatus)}`}
                          >
                            {row?.PPEComplianceStatus || 'NOT_APPLICABLE'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {getDisplayStatus(row?.VisitStatus)}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{row?.ReferenceCode || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 lg:hidden">
              {rows.map((row) => {
                const imageSrc = toImageSrc(row?.VisitorPhoto);
                const imageKey = row?.VisitID || row?.ReferenceCode || row?.VisitorEmail || row?.VisitorName;
                const hasImageError = Boolean(imageErrors[imageKey]);
                return (
                  <div key={row?.VisitID || row?.ReferenceCode} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      {imageSrc && !hasImageError ? (
                        <button type="button" onClick={() => setPhotoModal({ src: imageSrc, name: row?.VisitorName })}>
                          <img
                            src={imageSrc}
                            alt={row?.VisitorName || 'Visitor'}
                            className="h-16 w-16 rounded-xl object-cover"
                            onError={() => setImageErrors((prev) => ({ ...prev, [imageKey]: true }))}
                          />
                        </button>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">NA</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{row?.VisitorName || '-'}</p>
                        {row?.VisitorEmail ? (
                          <p className="truncate text-xs text-slate-500">{row?.VisitorEmail}</p>
                        ) : null}
                        {row?.VisitorMobile ? (
                          <p className="text-xs text-slate-500">{row?.VisitorMobile}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p><span className="font-semibold">Category:</span> {row?.VisitorCategory || '-'}</p>
                      <p><span className="font-semibold">Company:</span> {row?.VisitorCompanyName || '-'}</p>
                      <p><span className="font-semibold">Purpose:</span> {row?.PurposeName || '-'}</p>
                      <p><span className="font-semibold">In:</span> {fmtDateTime(row?.EntryTime)}</p>
                      <p><span className="font-semibold">Out:</span> {fmtDateTime(row?.ExitTime)}</p>
                      <p className="col-span-2"><span className="font-semibold">PPE Issued:</span> {row?.IssuedPPEItems || '-'}</p>
                      <p className="col-span-2"><span className="font-semibold">PPE Returned:</span> {row?.ReturnedPPEItems || '-'}</p>
                      <p className="col-span-2">
                        <span className="font-semibold">PPE Match:</span>{' '}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPPEComplianceClasses(row?.PPEComplianceStatus)}`}>
                          {row?.PPEComplianceStatus || 'NOT_APPLICABLE'}
                        </span>
                      </p>
                      <p className="col-span-2"><span className="font-semibold">Host:</span> {row?.HostEmployeeName || '-'} ({row?.DepartmentName || '-'})</p>
                      <p className="col-span-2"><span className="font-semibold">Ref:</span> {row?.ReferenceCode || '-'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {paging.pageNumber} of {Math.max(paging.totalPages, 1)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(paging.pageNumber - 1)}
              disabled={paging.pageNumber <= 1 || loading}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => goToPage(paging.pageNumber + 1)}
              disabled={paging.pageNumber >= paging.totalPages || loading || paging.totalPages === 0}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {photoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setPhotoModal(null)}>
          <div className="max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={photoModal.src} alt={photoModal.name || 'Visitor'} className="max-h-[80vh] w-auto rounded-2xl border-4 border-white object-contain shadow-2xl" />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{photoModal.name || 'Visitor'}</p>
              <button
                type="button"
                onClick={() => setPhotoModal(null)}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VisitorReport;
