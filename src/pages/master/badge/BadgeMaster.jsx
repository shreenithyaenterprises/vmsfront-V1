import { useEffect, useMemo, useState } from 'react';
import {
  createBadge,
  deleteBadge,
  getBadges,
  updateBadge,
} from '../../../services/badgeService.js';

const emptyForm = {
  id: null,
  code: '',
  color: '',
};

const getItemId = (item) => item?.BadgeId ?? item?.Id ?? item?.ID ?? null;

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

const BadgeMaster = () => {
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);
  const filteredItems = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) =>
      `${item?.Code || ''} ${item?.Color || ''}`.toLowerCase().includes(value)
    );
  }, [items, query]);

  const loadBadges = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getBadges();
      const list = normalizeList(response);
      const visibleItems = list.filter((item) => item?.IsActive !== false);
      setItems(visibleItems);
    } catch (err) {
      setError(err?.message || 'Unable to load badges.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBadges();
  }, []);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSuccess('');
    setError('');
  };

  const handleEdit = (item) => {
    setError('');
    setSuccess('');
    setForm({
      id: getItemId(item),
      code: item?.Code || '',
      color: item?.Color || '',
    });
  };

  const handleDelete = async (item) => {
    const id = getItemId(item);
    if (!id) return;
    const confirmed = window.confirm('Delete this badge?');
    if (!confirmed) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await deleteBadge({ id });
      setSuccess('Badge deleted.');
      await loadBadges();
    } catch (err) {
      setError(err?.message || 'Unable to delete badge.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      if (isEditing) {
        await updateBadge({
          id: form.id,
          code: form.code,
          color: form.color,
        });
        setSuccess('Badge updated.');
      } else {
        await createBadge({ code: form.code, color: form.color });
        setSuccess('Badge created.');
      }

      resetForm();
      await loadBadges();
    } catch (err) {
      setError(err?.message || 'Unable to save badge.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="bg-gradient-to-r from-white via-white to-slate-50 px-8 py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Badge Master</h1>
              <p className="mt-1 text-sm text-slate-600">Create and manage badge types and colors.</p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              New Badge
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 px-8 pb-8 pt-6 sm:grid-cols-2"
        >
          <div>
            <label className="text-sm font-medium text-slate-700">Badge code</label>
            <input
              value={form.code}
              onChange={handleChange('code')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="NORMAL"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Color</label>
            <input
              value={form.color}
              onChange={handleChange('color')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.5)] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="White"
              required
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Update Badge' : 'Create Badge'}
            </button>
          </div>
        </form>

        {error ? (
          <div className="mx-8 mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mx-8 mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Badge list</h2>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by code or color"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:max-w-xs"
            />
            <button
              type="button"
              onClick={loadBadges}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 text-sm text-slate-500">Loading badges...</div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No badges found.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No matches found for your search.
          </div>
        ) : (
          <div className="mt-6 max-h-[60vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item) => {
                  const id = getItemId(item);
                  return (
                    <tr key={id || item?.Code} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item?.Code || '-'}
                      </td>
                      <td className="px-4 py-3">{item?.Color || '-'}</td>
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
                            onClick={() => handleDelete(item)}
                            disabled={isSaving}
                            className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
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

export default BadgeMaster;
