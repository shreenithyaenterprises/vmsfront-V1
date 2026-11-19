import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createCeatInterplantRequest,
  getCeatInterplantLookups,
  getCeatInterplantStatus,
} from '../../../services/ceatInterplantPublicService';

const todayValue = () => new Date().toISOString().split('T')[0];

const toPhotoSrc = (value) => {
  if (!value) return '';
  if (value.startsWith('data:image')) return value;
  return `data:image/jpeg;base64,${value}`;
};

const emptyForm = {
  CheckInDate: todayValue(),
  EmployeeId: '',
  PurposeOfVisit: '',
  VisitorName: '',
  CompanyLocation: '',
  VisitorMobile: '',
  VisitorEmail: '',
  VisitorPhotoBase64: '',
  VisitorPhotoPreview: '',
  ApproverEmployeeId: '',
};

const CeatInterplantPublicForm = () => {
  const [form, setForm] = useState(emptyForm);
  const [approvers, setApprovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [token, setToken] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [photoMode, setPhotoMode] = useState('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const selectedApprover = useMemo(
    () => approvers.find((item) => String(item.EmployeeId) === String(form.ApproverEmployeeId)),
    [approvers, form.ApproverEmployeeId]
  );

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await getCeatInterplantLookups();
        setApprovers(response?.data?.approvers || []);
      } catch (error) {
        setMessage(error?.message || 'Failed to load lookups');
      }
    };

    loadLookups();
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, VisitorPhotoBase64: '', VisitorPhotoPreview: '' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setForm((prev) => ({
        ...prev,
        VisitorPhotoBase64: base64,
        VisitorPhotoPreview: result,
      }));
    };
    reader.onerror = () => {
      setMessage('Unable to read the selected photo.');
      setForm((prev) => ({ ...prev, VisitorPhotoBase64: '', VisitorPhotoPreview: '' }));
    };
    reader.readAsDataURL(file);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Webcam is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 0);
    } catch (error) {
      setCameraActive(false);
      setCameraError(
        error?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : 'Unable to access webcam. Please try again.'
      );
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    setForm((prev) => ({
      ...prev,
      VisitorPhotoBase64: base64,
      VisitorPhotoPreview: dataUrl,
    }));
    stopCamera();
    setPhotoMode('upload');
  };

  useEffect(() => () => stopCamera(), []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await createCeatInterplantRequest({
        ...form,
        ApproverEmployeeId: Number(form.ApproverEmployeeId),
      });
      const requestToken = response?.data?.Token || '';
      setToken(requestToken);
      setMessage(response?.message || 'Request submitted successfully');
      setStatusMessage('Use your token to check status and digital gate pass.');
      setForm(emptyForm);
    } catch (error) {
      setMessage(error?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusCheck = async (event) => {
    event.preventDefault();
    setStatusMessage('');
    setStatusData(null);

    if (!token.trim()) {
      setStatusMessage('Enter request token to check status');
      return;
    }

    try {
      const response = await getCeatInterplantStatus(token.trim());
      setStatusData(response?.data || null);
      setStatusMessage(response?.message || 'Status fetched');
    } catch (error) {
      setStatusMessage(error?.message || 'Failed to fetch status');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Inter-Plant Visitor Request</h1>
        <p className="text-sm text-slate-600">Public request form with optional photo capture, employee approval, and digital gate pass tracking.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Check In Date</label>
            <input
              type="date"
              name="CheckInDate"
              value={form.CheckInDate}
              onChange={onChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">CEAT Employee ID</label>
            <input
              type="text"
              name="EmployeeId"
              value={form.EmployeeId}
              onChange={onChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ex: CEAT12345"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Purpose of Visit</label>
            <input
              type="text"
              name="PurposeOfVisit"
              value={form.PurposeOfVisit}
              onChange={onChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Visitor Name</label>
            <input
              type="text"
              name="VisitorName"
              value={form.VisitorName}
              onChange={onChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Company Location</label>
            <input
              type="text"
              name="CompanyLocation"
              value={form.CompanyLocation}
              onChange={onChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Visitor Mobile No</label>
              <input
                type="tel"
                name="VisitorMobile"
                value={form.VisitorMobile}
                onChange={onChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Visitor Email ID</label>
              <input
                type="email"
                name="VisitorEmail"
                value={form.VisitorEmail}
                onChange={onChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Visitor Photo</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setPhotoMode('upload');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  photoMode === 'upload'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotoMode('camera');
                  startCamera();
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  photoMode === 'camera'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Use Webcam
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500">Optional. Upload a photo or capture one from the webcam for the gate pass.</p>

            {photoMode === 'upload' ? (
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              />
            ) : (
              <div className="mt-2 space-y-3">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900 p-2">
                  <video
                    ref={videoRef}
                    className="h-72 w-full rounded-md bg-black object-contain"
                    autoPlay
                    muted
                    playsInline
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!cameraActive}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Stop Camera
                  </button>
                </div>
                {cameraError ? <p className="text-xs text-rose-600">{cameraError}</p> : null}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {form.VisitorPhotoPreview ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
                <img
                  src={form.VisitorPhotoPreview}
                  alt="Visitor preview"
                  className="h-40 w-full rounded-md object-contain"
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Approver</label>
            <select
              name="ApproverEmployeeId"
              value={form.ApproverEmployeeId}
              onChange={onChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select approver</option>
              {approvers.map((item) => (
                <option key={item.EmployeeId} value={item.EmployeeId}>
                  {item.EmployeeName}
                  {item.DepartmentName ? ` - ${item.DepartmentName}` : ''}
                </option>
              ))}
            </select>
            {selectedApprover ? (
              <p className="mt-1 text-xs text-slate-500">Selected: {selectedApprover.EmployeeName}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {token ? (
            <p className="text-sm text-slate-700">
              Request Token: <span className="font-semibold">{token}</span>
            </p>
          ) : null}
        </form>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Track Request / Digital Pass</h2>
          <form onSubmit={handleStatusCheck} className="space-y-3">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Enter token"
            />
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Check Status
            </button>
          </form>

          {statusMessage ? <p className="text-sm text-slate-700">{statusMessage}</p> : null}

          {statusData ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 via-cyan-900 to-emerald-900 px-4 py-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-100/80">CEAT Inter-Plant</p>
                    <h3 className="mt-1 text-lg font-semibold">Gate Pass</h3>
                    <p className="text-xs text-cyan-50/75"> digital pass for approved visitors</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {statusData.RequestStatus || 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-[140px_1fr]">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {statusData.VisitorPhotoBase64 ? (
                      <img
                        src={toPhotoSrc(statusData.VisitorPhotoBase64)}
                        alt="Visitor"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-xs text-slate-500">No photo uploaded</div>
                    )}
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Ref: {statusData.ReferenceCode || '-'}
                  </div>
                </div>

                <div className="space-y-3 text-sm text-slate-700">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Visitor Name</p>
                      <p className="font-semibold text-slate-900">{statusData.VisitorName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Employee ID</p>
                      <p className="font-semibold text-slate-900">{statusData.EmployeeId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Visit Date</p>
                      <p className="font-semibold text-slate-900">{statusData.CheckInDate || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Approver</p>
                      <p className="font-semibold text-slate-900">{statusData.ApproverName || '-'}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Purpose</p>
                      <p className="font-medium text-slate-900">{statusData.PurposeOfVisit || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Company Location</p>
                      <p className="font-medium text-slate-900">{statusData.CompanyLocation || '-'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {statusData.ShowGatePass ? 'Gate Pass Active' : 'Gate Pass Hidden'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Visit Status: {statusData.VisitStatus || 'PENDING_ENTRY'}
                    </span>
                    {statusData.EntryTime ? (
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                        Entry: {statusData.EntryTime}
                      </span>
                    ) : null}
                    {statusData.ExitTime ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                        Exit: {statusData.ExitTime}
                      </span>
                    ) : null}
                  </div>

                  {!statusData.ShowGatePass ? (
                    <p className="text-xs text-amber-700">Gate pass is hidden after checkout or before approval.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CeatInterplantPublicForm;
