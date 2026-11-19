import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getPrebookingForm,
  getPrebookingLookups,
  submitPrebookingForm,
} from '../../../services/prebookingPublicService.js';
import { getApprovalAuthorityPublic } from '../../../services/approvalService.js';
import TrackRequestDigitalPass from './components/TrackRequestDigitalPass.jsx';
import {
  emptyForm,
  normalizeList,
  extractTokenFromLocation,
} from './utils/prebookingFormUtils.js';

const dataUrlToFile = async (dataUrl, fileName) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
};

const PrebookingForm = () => {
  const location = useLocation();
  const [form, setForm] = useState(emptyForm);
  const [purposes, setPurposes] = useState([]);
  const [idProofs, setIdProofs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTrackOnly, setShowTrackOnly] = useState(false);
  const [gatePassInfo, setGatePassInfo] = useState(null);
  const [photoMode, setPhotoMode] = useState('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [approvalInfo, setApprovalInfo] = useState(null);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const token = useMemo(() => {
    return extractTokenFromLocation(location);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, token }));
  }, [token]);

  const loadLookups = async () => {
    try {
      const response = await getPrebookingLookups();

      const idProofList = normalizeList({ data: response?.data?.idProofs }).filter(
        (item) => item?.IsActive !== false
      );
      const purposeList = normalizeList({ data: response?.data?.purposes }).filter(
        (item) => item?.IsActive !== false
      );
      const employeeList = normalizeList({ data: response?.data?.employees }).filter(
        (item) => item?.IsActive !== false
      );
      setIdProofs(idProofList);
      setPurposes(purposeList);
      setEmployees(employeeList);
    } catch (err) {
      setError(err?.message || 'Unable to load lookup data.');
    }
  };

  const loadForm = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (token) {
        try {
          const response = await getPrebookingForm({ token });
          const item = Array.isArray(response?.data?.Items)
            ? response.data.Items[0]
            : response?.data?.Items;

          if (item) {
            setForm((prev) => ({
              ...prev,
              token,
              visitorName: item?.VisitorName || prev.visitorName,
              visitorEmail: item?.VisitorEmail || prev.visitorEmail,
              visitDate: item?.VisitDate || prev.visitDate,
            }));
          } else {
            setError('Prebooking request not found. You can still fill form manually.');
          }
        } catch (tokenErr) {
          console.warn('Token error:', tokenErr);
          setError('Could not auto-fill - complete form manually.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
    loadForm();
  }, [token]);

  const handleChange = (field) => async (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));

    // Check approval when employee is selected
    if (field === 'hostEmployeeId' && value) {
      try {
        setCheckingApproval(true);
        setApprovalInfo(null);
        const response = await getApprovalAuthorityPublic(
          parseInt(value),
          form.purposeId || null
        );
        setApprovalInfo(response.data);
      } catch (err) {
        console.error('Error checking approval:', err);
        setApprovalInfo(null);
      } finally {
        setCheckingApproval(false);
      }
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({
        ...prev,
        visitorPhotoBase64: '',
        visitorPhotoFile: null,
        visitorPhotoPreview: '',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setForm((prev) => ({
        ...prev,
        visitorPhotoBase64: base64,
        visitorPhotoFile: file,
        visitorPhotoPreview: result,
      }));
    };
    reader.onerror = () => {
      setError('Unable to read photo file.');
      setForm((prev) => ({
        ...prev,
        visitorPhotoBase64: '',
        visitorPhotoFile: null,
        visitorPhotoPreview: '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      setError('Unable to access camera. Please check browser permissions.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const file = await dataUrlToFile(dataUrl, 'visitor-photo.jpg');
    setForm((prev) => ({
      ...prev,
      visitorPhotoBase64: base64,
      visitorPhotoFile: file,
      visitorPhotoPreview: dataUrl,
    }));
    stopCamera();
    setPhotoMode('upload');
  };

  useEffect(() => () => stopCamera(), []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');
    setGatePassInfo(null);

    let submitToken = form.token;
    if (!submitToken) {
      submitToken = `PUBLIC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (!form.visitorPhotoFile && !form.visitorPhotoBase64) {
      setError('Please upload a visitor photo.');
      setIsSaving(false);
      return;
    }

    if (!form.hostEmployeeId) {
      setError('Please select who you want to meet.');
      setIsSaving(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append('Token', submitToken);
      payload.append('VisitorName', form.visitorName);
      payload.append('VisitorEmail', form.visitorEmail);
      payload.append('VisitorMobile', form.visitorMobile);
      if (form.visitorPhotoFile) {
        payload.append('VisitorPhoto', form.visitorPhotoFile);
      } else {
        payload.append('VisitorPhotoBase64', form.visitorPhotoBase64);
      }
      payload.append('IdProofId', String(Number(form.idProofId)));
      payload.append('IdProofNumber', form.idProofNumber);
      payload.append('PurposeId', String(Number(form.purposeId)));
      payload.append('HostEmployeeId', String(Number(form.hostEmployeeId)));
      payload.append('VisitDate', form.visitDate);
      payload.append('VisitTimeSlot', form.visitTimeSlot);
      payload.append('CompanyName', form.companyName || '');
      payload.append('Address', form.address || '');
      payload.append('Notes', form.notes || '');

      // Submit prebooking
      const response = await submitPrebookingForm(payload);

      const gatePass = response?.data?.gatePass;
      const isAutoApproved = Number(response?.data?.AutoApproved || 0) === 1;

      setForm((prev) => ({ ...prev, token: submitToken }));

      if (gatePass?.referenceCode) {
        setGatePassInfo(gatePass);
      }

      // Approval records are created automatically by stored procedure
      if (isAutoApproved && gatePass?.referenceCode) {
        setSuccess(
          `VIP prebooking approved. Gate pass is ready with reference code ${gatePass.referenceCode}.`
        );
      } else if (isAutoApproved) {
        setSuccess('VIP prebooking approved. Gate pass is being prepared.');
      } else if (approvalInfo?.approverId) {
        setSuccess(
          `Prebooking submitted successfully. Waiting for approval from ${approvalInfo.approverName}.`
        );
      } else {
        setSuccess('Prebooking submitted successfully. Entry pre-approved!');
      }

      // After successful submit, hide form and keep only tracking/gate pass section.
      setShowTrackOnly(true);
    } catch (err) {
      setError(err?.message || 'Unable to submit prebooking.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 px-2 sm:px-4 md:px-6 py-4 sm:py-6 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-lg sm:rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-sm text-slate-600">Loading prebooking form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 px-2 sm:px-4 md:px-6 py-4 sm:py-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="rounded-lg sm:rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 p-4 sm:p-6 md:p-8 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Visitor Pre-Booking</h1>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                Complete the form to schedule your visit
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 md:p-8 shadow-lg">

          <TrackRequestDigitalPass
            initialToken={form.token}
            onTokenResolved={(resolvedToken) => {
              setForm((prev) => ({ ...prev, token: resolvedToken }));
            }}
          />

          {!showTrackOnly ? (
            <>

              {error ? (
                <div className="mb-4 sm:mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              {success ? (
                <div className="mb-4 sm:mb-6 space-y-3 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-emerald-700">{success}</p>
                  </div>

                  {gatePassInfo?.referenceCode ? (
                    <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        Gate Pass Reference
                      </p>
                      <p className="mt-1 font-mono text-xl font-bold text-emerald-900">
                        {gatePassInfo.referenceCode}
                      </p>
                      <p className="mt-1 text-xs text-emerald-600">
                        Present this code at the gate kiosk
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-5">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Personal Information
              </h3>
              
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Full Name *
                </label>
                <input
                  value={form.visitorName}
                  onChange={handleChange('visitorName')}
                  placeholder="Enter your full name"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={form.visitorEmail}
                  onChange={handleChange('visitorEmail')}
                  placeholder="your.email@example.com"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={form.visitorMobile}
                  onChange={handleChange('visitorMobile')}
                  placeholder="+91 XXXXX XXXXX"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                Photo Upload
              </h3>
              
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Visitor Photo *
                </label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMode('upload');
                      stopCamera();
                    }}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                      photoMode === 'upload'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📁 Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMode('camera');
                      startCamera();
                    }}
                    className={`rounded-lg px-4 py-5 text-xl font-semibold transition-all ${
                      photoMode === 'camera'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📷 Use Camera
                  </button>
                </div>

                {photoMode === 'upload' ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="mt-2 w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 outline-none transition hover:border-blue-400 hover:bg-blue-50 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white file:cursor-pointer hover:file:bg-blue-700"
                    required={!form.visitorPhotoBase64}
                  />
                ) : (
                  <div className="mt-2 space-y-3">
                    <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-900 p-2">
                      <video
                        ref={videoRef}
                        className="h-[320px] sm:h-[420px] w-full rounded-md bg-black object-contain"
                        autoPlay
                        muted
                        playsInline
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={!isCameraActive}
                        className="rounded-lg bg-blue-600 px-4 py-4 text-4xl font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        📸 Capture Photo
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
                      >
                        ⏹️ Stop Camera
                      </button>
                    </div>
                    <p className="text-xs text-slate-600">
                      Face ko frame ke center me rakhein. Ab preview full frame me dikhna chahiye.
                    </p>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}

                {form.visitorPhotoPreview ? (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-green-700">✓ Photo preview</p>
                    <img
                      src={form.visitorPhotoPreview}
                      alt="Visitor preview"
                      className="w-full max-h-[420px] rounded-lg object-contain border-2 border-green-300 bg-black"
                    />
                    <p className="text-xs text-green-700">Agar face cut ho raha ho to dobara capture karein.</p>
                  </div>
                ) : null}
              </div>
            </div>
            {/* ID Verification Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
                ID Verification
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    ID Proof Type *
                  </label>
                  <select
                    value={form.idProofId}
                    onChange={handleChange('idProofId')}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select ID type</option>
                    {idProofs.map((item) => (
                      <option key={item?.IdProofId || item?.Name} value={item?.IdProofId || ''}>
                        {item?.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    ID Number *
                  </label>
                  <input
                    value={form.idProofNumber}
                    onChange={handleChange('idProofNumber')}
                    placeholder="Enter ID number"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
            </div>
            {/* Visit Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Visit Details
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Purpose of Visit *
                  </label>
                  <select
                    value={form.purposeId}
                    onChange={handleChange('purposeId')}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select purpose</option>
                    {purposes.map((item) => (
                      <option key={item?.PurposeId || item?.Name} value={item?.PurposeId || ''}>
                        {item?.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Visit Date *
                  </label>
                  <input
                    type="date"
                    value={form.visitDate}
                    onChange={handleChange('visitDate')}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Who would you like to meet? *
                </label>
                <select
                  value={form.hostEmployeeId}
                  onChange={handleChange('hostEmployeeId')}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">Select host employee</option>
                  {employees.map((item) => (
                    <option key={item?.EmployeeId || item?.Id} value={item?.EmployeeId || item?.Id || ''}>
                      {item?.Name || `${item?.FirstName || ''} ${item?.LastName || ''}`.trim()} {item?.Designation ? `- ${item.Designation}` : ''}
                    </option>
                  ))}
                </select>
                {checkingApproval ? (
                  <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-2">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking approval requirements...
                  </p>
                ) : null}
              </div>
              {approvalInfo && !checkingApproval ? (
                <div
                  className={`rounded-lg border-l-4 px-4 py-3 flex items-start gap-3 ${
                    approvalInfo.approverId
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-green-500 bg-green-50'
                  }`}
                >
                  {approvalInfo.approverId ? (
                    <>
                      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-amber-900">⏳ Approval Required</p>
                        <p className="mt-0.5 text-xs text-amber-700">
                          This visit requires approval from <strong>{approvalInfo.approverName}</strong>. You'll be notified once approved.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-green-900">✓ Pre-Approved</p>
                        <p className="mt-0.5 text-xs text-green-700">
                          This visit is pre-approved. You can proceed with your visit.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Time Slot *
                </label>
                <select
                  value={form.visitTimeSlot}
                  onChange={handleChange('visitTimeSlot')}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">Select time slot</option>
                  <option value="Morning">🌅 Morning (9am - 12pm)</option>
                  <option value="Afternoon">☀️ Afternoon (12pm - 4pm)</option>
                  <option value="Evening">🌆 Evening (4pm - 7pm)</option>
                  <option value="Full Day">📅 Full Day</option>
                </select>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Additional Information
              </h3>
              
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Company / Institute
                </label>
                <input
                  value={form.companyName}
                  onChange={handleChange('companyName')}
                  placeholder="Your organization name (optional)"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={handleChange('address')}
                  placeholder="Your address (optional)"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Additional Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={handleChange('notes')}
                  placeholder="Any additional information you'd like to share..."
                  rows="4"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Pre-Booking Request
                </>
              )}
            </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PrebookingForm;
