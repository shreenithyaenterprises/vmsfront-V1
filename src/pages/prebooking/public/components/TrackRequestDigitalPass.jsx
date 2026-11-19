import { useEffect, useState } from 'react';
import { getPrebookingForm } from '../../../../services/prebookingPublicService.js';
import { getVisitByReferenceCode } from '../../../../services/gateEntryService.js';

const getFirstItem = (payload) => {
  const data = payload?.data;
  if (!data) return null;

  if (Array.isArray(data?.Items) && data.Items.length) return data.Items[0];
  if (data?.Items && typeof data.Items === 'object') return data.Items;
  if (Array.isArray(data?.Data) && data.Data.length) return data.Data[0];
  if (data?.Data && typeof data.Data === 'object') return data.Data;
  if (Array.isArray(data) && data.length) return data[0];

  return data;
};

const getReferenceCode = (value) =>
  value?.ReferenceCode ||
  value?.referenceCode ||
  value?.reference_code ||
  value?.RefNo ||
  value?.ReferenceNo ||
  '';

const isApprovedStatus = (status) => {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'APPROVED' || normalized === 'APPROVE' || normalized === 'A';
};

const hexToBase64 = (hexValue) => {
  const cleanHex = String(hexValue || '')
    .replace(/^0x/i, '')
    .replace(/\s+/g, '');

  if (!cleanHex || cleanHex.length % 2 !== 0 || /[^0-9a-f]/i.test(cleanHex)) {
    return '';
  }

  let binary = '';
  for (let i = 0; i < cleanHex.length; i += 2) {
    binary += String.fromCharCode(parseInt(cleanHex.slice(i, i + 2), 16));
  }

  return btoa(binary);
};

const detectMimeType = (base64Value) => {
  const value = String(base64Value || '').trim();
  if (value.startsWith('/9j/')) return 'image/jpeg';
  if (value.startsWith('iVBOR')) return 'image/png';
  if (value.startsWith('R0lGOD')) return 'image/gif';
  if (value.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
};

const decodeHtmlEntities = (value) => {
  let decoded = String(value || '');
  if (!decoded.includes('&')) return decoded;

  // Decode multiple rounds because payload can be double-encoded (&amp;#x2F; -> &#x2F; -> /).
  for (let i = 0; i < 4; i += 1) {
    const before = decoded;

    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = decoded;
      decoded = textarea.value;
    }

    // Fallback/manual pass for numeric entities and common named entities.
    decoded = decoded
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');

    if (decoded === before) break;
  }

  return decoded;
};

const formatPhotoSrc = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    const trimmed = decodeHtmlEntities(value).trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:image')) return trimmed;
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;

    // Some DB responses may contain hex string (e.g., 0xFFD8...) instead of base64.
    const possibleHex = trimmed.startsWith('0x') ? trimmed : '';
    const converted = possibleHex ? hexToBase64(possibleHex) : '';
    const normalizedBase64 = (converted || trimmed).replace(/\s+/g, '');
    const mimeType = detectMimeType(normalizedBase64);
    return `data:${mimeType};base64,${normalizedBase64}`;
  }

  return '';
};

const mapTrackStatus = (formData, gateData) => {
  const referenceCode = getReferenceCode(gateData) || getReferenceCode(formData);
  const resolvedRequestStatus =
    formData?.ApprovalStatus ||
    formData?.RequestStatus ||
    formData?.Status ||
    gateData?.approvalStatus ||
    gateData?.ApprovalStatus ||
    'PENDING';
  const approved = isApprovedStatus(resolvedRequestStatus);

  return {
    referenceCode,
    requestStatus: resolvedRequestStatus,
    visitorName: formData?.VisitorName || gateData?.visitorName || '',
    hostEmployeeName:
      formData?.HostEmployeeName ||
      formData?.EmployeeName ||
      gateData?.hostEmployeeName ||
      '',
    departmentName: gateData?.departmentName || formData?.DepartmentName || '',
    purpose: formData?.PurposeName || formData?.Purpose || gateData?.purpose || '',
    visitDate: formData?.VisitDate || formData?.RequestedVisitDate || '',
    visitTimeSlot: formData?.VisitTimeSlot || formData?.TimeSlot || '',
    visitStatus:
      gateData?.visitStatus ||
      gateData?.VisitStatus ||
      formData?.VisitStatus ||
      (approved ? 'APPROVED' : 'PENDING_ENTRY'),
    validTill: gateData?.validTill || formData?.GatePassValidTill || '',
    visitorPhoto: formatPhotoSrc(
      formData?.VisitorPhotoBase64 ||
      formData?.visitorPhotoBase64 ||
      formData?.VisitorPhoto ||
      gateData?.visitorPhoto ||
      gateData?.VisitorPhotoBase64
    ),
    showGatePass:
      Number(formData?.ShowGatePass || 0) === 1 ||
      approved ||
      Boolean(referenceCode),
  };
};

const TrackRequestDigitalPass = ({ initialToken = '', onTokenResolved }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [trackMessage, setTrackMessage] = useState('');
  const [trackingToken, setTrackingToken] = useState(initialToken);
  const [trackStatus, setTrackStatus] = useState(null);

  useEffect(() => {
    setTrackingToken(initialToken || '');
  }, [initialToken]);

  const handleTrackRequest = async (event) => {
    event.preventDefault();
    setTrackMessage('');
    setTrackStatus(null);

    const lookupToken = trackingToken.trim();
    if (!lookupToken) {
      setTrackMessage('Please enter request token to track status.');
      return;
    }

    try {
      setIsTracking(true);
      const response = await getPrebookingForm({ token: lookupToken });
      const statusItem = getFirstItem(response);

      if (!statusItem) {
        setTrackMessage('Request not found for this token.');
        return;
      }

      const referenceCode = getReferenceCode(statusItem);
      let gateDetails = null;

      if (referenceCode) {
        try {
          const gateResponse = await getVisitByReferenceCode(referenceCode);
          gateDetails = gateResponse?.data || null;
        } catch (_err) {
          gateDetails = null;
        }
      }

      const statusData = mapTrackStatus(statusItem, gateDetails);
      setTrackStatus(statusData);

      if (typeof onTokenResolved === 'function') {
        onTokenResolved(lookupToken);
      }

      if (statusData.showGatePass && statusData.referenceCode) {
        setTrackMessage('Request approved. Digital gate pass is now active.');
      } else {
        setTrackMessage('Request status fetched successfully.');
      }
    } catch (err) {
      setTrackMessage(err?.message || 'Unable to track request right now.');
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <div className="mb-5 sm:mb-7 rounded-lg border border-cyan-200 bg-cyan-50/70 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Track Request / Digital Pass</h2>
          <p className="text-xs sm:text-sm text-slate-600">Check approval status and gate pass without login.</p>
        </div>
        {trackStatus?.requestStatus ? (
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 border border-slate-200">
            {trackStatus.requestStatus}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleTrackRequest} className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={trackingToken}
          onChange={(e) => setTrackingToken(e.target.value)}
          placeholder="Enter token (example: PUBLIC_...)"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
        <button
          type="submit"
          disabled={isTracking}
          className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isTracking ? 'Checking...' : 'Track Request'}
        </button>
      </form>

      {trackMessage ? <p className="mt-2 text-xs sm:text-sm text-slate-700">{trackMessage}</p> : null}

      {trackStatus ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="bg-gradient-to-r from-slate-900 via-cyan-900 to-emerald-900 px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-100/80">Visitor Pass</p>
                <h3 className="mt-1 text-lg font-semibold">Digital Gate Pass</h3>
                <p className="text-xs text-cyan-50/75">valid after approval</p>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                {trackStatus.showGatePass ? 'ACTIVE' : 'PENDING'}
              </span>
            </div>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-[130px_1fr]">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {trackStatus.visitorPhoto ? (
                  <img
                    src={trackStatus.visitorPhoto}
                    alt="Visitor"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center text-xs text-slate-500">No photo</div>
                )}
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                Ref: {trackStatus.referenceCode || '-'}
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Visitor</p>
                  <p className="font-semibold text-slate-900">{trackStatus.visitorName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Host Employee</p>
                  <p className="font-semibold text-slate-900">{trackStatus.hostEmployeeName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Visit Date</p>
                  <p className="font-semibold text-slate-900">{trackStatus.visitDate || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Time Slot</p>
                  <p className="font-semibold text-slate-900">{trackStatus.visitTimeSlot || '-'}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Purpose</p>
                  <p className="font-medium text-slate-900">{trackStatus.purpose || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Department</p>
                  <p className="font-medium text-slate-900">{trackStatus.departmentName || '-'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {trackStatus.showGatePass ? 'Gate Pass Active' : 'Waiting For Approval'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Visit Status: {trackStatus.visitStatus || 'PENDING_ENTRY'}
                </span>
                {trackStatus.validTill ? (
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                    Valid Till: {trackStatus.validTill}
                  </span>
                ) : null}
              </div>

              {!trackStatus.showGatePass ? (
                <p className="text-xs text-amber-700">Gate pass will appear automatically after approval.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TrackRequestDigitalPass;
