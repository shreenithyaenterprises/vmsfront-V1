import { useEffect, useMemo, useState } from 'react';
import {
  createPrebookingTemplate,
  listPrebookingTemplates,
  togglePrebookingTemplate,
  updatePrebookingTemplate,
} from '../../../services/prebookingService.js';

const emptyForm = {
  templateId: null,
  templateCode: '',
  subject: '',
  bodyHtml: '',
};

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

const PrebookingTemplate = () => {
  const [form, setForm] = useState(emptyForm);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');

  const isEditing = useMemo(() => Boolean(form.templateId), [form.templateId]);
  const filteredTemplates = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return templates;
    return templates.filter((item) =>
      [item?.TemplateCode, item?.Subject, item?.BodyHtml]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value)
    );
  }, [templates, query]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await listPrebookingTemplates({ onlyActive: null });
      const list = normalizeList(response);
      setTemplates(list);
    } catch (err) {
      setError(err?.message || 'Unable to load templates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setError('');
    setSuccess('');
  };

  const handleEdit = (item) => {
    setForm({
      templateId: item?.TemplateId || null,
      templateCode: item?.TemplateCode || '',
      subject: item?.Subject || '',
      bodyHtml: item?.BodyHtml || '',
    });
    setError('');
    setSuccess('');
  };

  const handleToggle = async (item) => {
    const templateId = item?.TemplateId;
    if (!templateId) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await togglePrebookingTemplate({
        templateId,
        isActive: !(item?.IsActive === true),
      });
      setSuccess('Template status updated.');
      await loadTemplates();
    } catch (err) {
      setError(err?.message || 'Unable to update template status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isEditing) {
        await updatePrebookingTemplate({
          templateId: form.templateId,
          subject: form.subject,
          bodyHtml: form.bodyHtml,
        });
        setSuccess('Template updated.');
      } else {
        await createPrebookingTemplate({
          templateCode: form.templateCode,
          subject: form.subject,
          bodyHtml: form.bodyHtml,
        });
        setSuccess('Template created.');
      }

      resetForm();
      await loadTemplates();
    } catch (err) {
      setError(err?.message || 'Unable to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Prebooking Templates</h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage email templates stored in the database for prebooking.
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            New Template
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr]"
        >
          <div>
            <label className="text-sm font-medium text-slate-700">Template code</label>
            <input
              value={form.templateCode}
              onChange={handleChange('templateCode')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="PREBOOKING_REQUEST"
              required
              disabled={isEditing}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <input
              value={form.subject}
              onChange={handleChange('subject')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Email subject"
              required
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="text-sm font-medium text-slate-700">Body HTML</label>
            <textarea
              value={form.bodyHtml}
              onChange={handleChange('bodyHtml')}
              className="mt-2 min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Paste HTML here"
              required
            />
            <p className="mt-2 text-xs text-slate-500">
              Use placeholders like {'{{visitor_name}}'} and {'{{form_link}}'}.
            </p>
          </div>
          <div className="flex items-end gap-3 md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
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
          <h2 className="text-lg font-semibold text-slate-900">Template list</h2>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by code or subject"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:max-w-xs"
            />
            <button
              type="button"
              onClick={loadTemplates}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 text-sm text-slate-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No templates found.
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No matches found for your search.
          </div>
        ) : (
          <div className="mt-6 max-h-[70vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTemplates.map((item) => (
                  <tr key={item?.TemplateId || item?.TemplateCode} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item?.TemplateCode || '-'}
                    </td>
                    <td className="px-4 py-3">{item?.Subject || '-'}</td>
                    <td className="px-4 py-3">{item?.IsActive ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          disabled={isSaving}
                          className="rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-600 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {item?.IsActive ? 'Deactivate' : 'Activate'}
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

export default PrebookingTemplate;
