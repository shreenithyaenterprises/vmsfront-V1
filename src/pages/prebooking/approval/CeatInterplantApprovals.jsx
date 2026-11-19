import { useEffect, useState } from 'react';
import {
  getCeatInterplantPendingApprovals,
  submitCeatInterplantDecision,
} from '../../../services/ceatInterplantApprovalService';

const CeatInterplantApprovals = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [remarksById, setRemarksById] = useState({});

  const loadPending = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await getCeatInterplantPendingApprovals();
      setItems(response?.data?.items || []);
    } catch (error) {
      setMessage(error?.message || 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleDecision = async (requestId, action) => {
    setMessage('');
    try {
      const response = await submitCeatInterplantDecision({
        requestId,
        action,
        remarks: remarksById[requestId] || '',
      });
      setMessage(response?.message || 'Decision submitted');
      await loadPending();
    } catch (error) {
      setMessage(error?.message || 'Failed to submit decision');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inter-Plant Approvals</h1>
          <p className="text-sm text-slate-600">Approve or reject requests assigned to you.</p>
        </div>
        <button
          type="button"
          onClick={loadPending}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {message ? <p className="mb-4 text-sm text-slate-700">{message}</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Date</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Employee ID</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Visitor</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Location</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Purpose</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Remarks</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">No pending approvals</td>
                </tr>
              ) : null}

              {items.map((item) => (
                <tr key={item.RequestId}>
                  <td className="px-3 py-2">{item.CheckInDate}</td>
                  <td className="px-3 py-2">{item.EmployeeId}</td>
                  <td className="px-3 py-2">
                    <div>{item.VisitorName}</div>
                    <div className="text-xs text-slate-500">{item.VisitorMobile}</div>
                  </td>
                  <td className="px-3 py-2">{item.CompanyLocation}</td>
                  <td className="px-3 py-2">{item.PurposeOfVisit}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={remarksById[item.RequestId] || ''}
                      onChange={(e) =>
                        setRemarksById((prev) => ({ ...prev, [item.RequestId]: e.target.value }))
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      placeholder="Optional remarks"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecision(item.RequestId, 'APPROVED')}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(item.RequestId, 'REJECTED')}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CeatInterplantApprovals;
