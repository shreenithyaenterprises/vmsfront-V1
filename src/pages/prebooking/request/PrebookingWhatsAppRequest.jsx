import { useEffect, useState } from 'react';
import { createPrebookingWhatsAppRequest } from '../../../services/prebookingService.js';
import { getCompanyConfigs } from '../../../services/companyConfigService.js';

const emptyForm = {
  companyName: '',
  visitorName: '',
  visitorMobile: '',
};

const normalizeCompanies = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.Data)) return payload.Data;
  return [];
};

const normalizeMobileForApi = (mobile) => String(mobile || '').replace(/\D/g, '');

const PrebookingWhatsAppRequest = () => {
  const [form, setForm] = useState(emptyForm);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadCompany = async () => {
      setIsLoadingCompany(true);
      setError('');

      try {
        const response = await getCompanyConfigs();
        const companies = normalizeCompanies(response);
        const firstCompany = companies[0] || null;

        setForm((prev) => ({
          ...prev,
          companyName: firstCompany?.company_name || firstCompany?.companyName || '',
        }));
      } catch (err) {
        setError(err?.message || 'Unable to load company details.');
      } finally {
        setIsLoadingCompany(false);
      }
    };

    loadCompany();
  }, []);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        companyName: form.companyName,
        visitorName: form.visitorName,
        visitorMobile: normalizeMobileForApi(form.visitorMobile),
      };

      const response = await createPrebookingWhatsAppRequest(payload);
      const token = response?.data?.Token || response?.data?.token || '';
      const messageId = response?.data?.WhatsAppMessageId || '';

      setSuccess(
        `WhatsApp request sent successfully.${token ? ` Token: ${token}.` : ''}${messageId ? ` Message ID: ${messageId}` : ''}`
      );
      setForm((prev) => ({
        ...prev,
        visitorName: '',
        visitorMobile: '',
      }));
    } catch (err) {
      setError(err?.message || 'Unable to send WhatsApp request.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <h1 className="text-3xl font-semibold text-slate-900">WhatsApp Prebooking Request</h1>
        <p className="mt-2 text-sm text-slate-600">
          Send the approved WhatsApp template and software link directly to the entered mobile number.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr]"
        >
          <div>
            <label className="text-sm font-medium text-slate-700">Company name</label>
            <input
              value={form.companyName}
              onChange={handleChange('companyName')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none"
              placeholder={isLoadingCompany ? 'Loading company...' : 'Set company name in Company Master'}
              readOnly
              required
            />
          </div>

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
            <label className="text-sm font-medium text-slate-700">Mobile number</label>
            <input
              value={form.visitorMobile}
              onChange={handleChange('visitorMobile')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter WhatsApp mobile number"
              inputMode="numeric"
              minLength={10}
              maxLength={16}
              required
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || isLoadingCompany || !form.companyName}
              className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(5,150,105,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Sending WhatsApp...' : 'Send on WhatsApp'}
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
    </div>
  );
};

export default PrebookingWhatsAppRequest;
