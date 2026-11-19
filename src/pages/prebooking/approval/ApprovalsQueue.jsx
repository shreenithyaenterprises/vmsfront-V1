import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPendingApprovals, submitApprovalDecision, getApprovalStatus } from '../../../services/approvalService.js';
import { getPendingSecurityChecks, approveSecurityCheck, rejectSecurityCheck } from '../../../services/directVisitorService.js';

// Normalize prebooking approval
const normalizeApproval = (approval) => ({
  requestType: 'PREBOOKING',
  approvalLogId: approval?.approvalLogId ?? approval?.ApprovalLogId ?? null,
  prebookingId: approval?.prebookingId ?? approval?.PrebookingId ?? null,
  securityCheckId: null,
  visitorName: approval?.visitorName ?? approval?.VisitorName ?? 'Unknown Visitor',
  visitorEmail: approval?.visitorEmail ?? approval?.VisitorEmail ?? '-',
  visitDate: approval?.visitDate ?? approval?.VisitDate ?? null,
  hostEmployeeName: approval?.hostEmployeeName ?? approval?.HostEmployeeName ?? '-',
  approvalLevel: approval?.approvalLevel ?? approval?.ApprovalLevel ?? 1,
  createdAt: approval?.createdAt ?? approval?.CreatedAt ?? null,
  action: approval?.action ?? approval?.Action ?? 'PENDING',
  referenceCode: approval?.referenceCode ?? approval?.ReferenceCode ?? null,
});

// Normalize security check approval
const normalizeSecurityCheck = (check) => ({
  requestType: 'SECURITY_CHECK',
  approvalLogId: null,
  prebookingId: null,
  securityCheckId: check?.security_check_id ?? check?.SecurityCheckId ?? null,
  visitorName: check?.visitor_name ?? check?.VisitorName ?? 'Unknown Visitor',
  visitorEmail: check?.visitor_email ?? check?.VisitorEmail ?? '-',
  visitDate: null, // Security checks are immediate, no future visit date
  hostEmployeeName: check?.host_employee_name ?? check?.HostEmployeeName ?? '-',
  approvalLevel: 1, // Security checks don't have multi-level approval
  createdAt: check?.created_at ?? check?.CreatedAt ?? null,
  action: check?.approval_status ?? check?.ApprovalStatus ?? 'PENDING',
  referenceCode: check?.reference_code ?? check?.ReferenceCode ?? null,
});

const normalizeHistoryItem = (entry) => ({
  approverName: entry?.approverName ?? entry?.ApproverName ?? 'System',
  action: entry?.action ?? entry?.Action ?? 'PENDING',
  approvalLevel: entry?.approvalLevel ?? entry?.ApprovalLevel ?? '-',
  remarks: entry?.remarks ?? entry?.Remarks ?? '',
  actionTime: entry?.actionTime ?? entry?.ActionTime ?? null,
});

const ApprovalsQueue = () => {
  const [searchParams] = useSearchParams();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPendingApprovals();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingApprovals, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const requestedPrebookingId = searchParams.get('prebookingId');
    if (!requestedPrebookingId || pendingApprovals.length === 0) {
      return;
    }

    const matchingApproval = pendingApprovals.find((approval) =>
      approval.requestType === 'PREBOOKING' && String(approval.prebookingId) === String(requestedPrebookingId)
    );

    if (matchingApproval) {
      handleViewDetails(matchingApproval);
    }
  }, [pendingApprovals, searchParams]);

  const fetchPendingApprovals = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Debug: Check if user has valid token
      const token = localStorage.getItem('premium_vms_auth');
      console.log('Auth token exists:', !!token);
      if (!token) {
        console.error('No auth token found - user may not be logged in');
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Fetch both prebooking approvals and security check approvals
      const [prebookingResponse, securityCheckResponse] = await Promise.all([
        getPendingApprovals().catch(err => {
          console.warn('Prebooking approvals fetch failed:', err);
          return { data: { approvalRequests: [] } };
        }),
        getPendingSecurityChecks().catch(err => {
          console.warn('Security check approvals fetch failed:', err);
          console.error('Security check error details:', err);
          return { data: [] };
        })
      ]);

      // Normalize prebooking approvals
      const rawPrebookingList = prebookingResponse?.data?.approvalRequests || prebookingResponse?.data?.ApprovalRequests || [];
      const normalizedPrebooking = Array.isArray(rawPrebookingList) ? rawPrebookingList.map(normalizeApproval) : [];

      // Normalize security check approvals
      const rawSecurityCheckList = securityCheckResponse?.data || [];
      const normalizedSecurityChecks = Array.isArray(rawSecurityCheckList) ? rawSecurityCheckList.map(normalizeSecurityCheck) : [];

      // Combine both lists and sort by creation date (newest first)
      const combined = [...normalizedPrebooking, ...normalizedSecurityChecks].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setPendingApprovals(combined);
    } catch (err) {
      setError('Failed to fetch pending approvals: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (approval) => {
    try {
      setError(null);
      setSelectedApproval(approval);
      
      // Only fetch approval history for prebooking requests
      if (approval.requestType === 'PREBOOKING') {
        const response = await getApprovalStatus(approval.prebookingId);
        const rawHistory = response?.data?.approvalHistory || response?.data?.ApprovalHistory || [];
        const normalizedHistory = Array.isArray(rawHistory)
          ? rawHistory.map(normalizeHistoryItem)
          : [];
        setApprovalHistory(normalizedHistory);
      } else {
        // Security checks don't have multi-level history
        setApprovalHistory([]);
      }
      
      setShowDetails(true);
      setRemarks('');
    } catch (err) {
      setError('Failed to fetch approval details: ' + err.message);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;

    try {
      setError(null);
      setSubmitting(true);

      if (selectedApproval.requestType === 'SECURITY_CHECK') {
        // Approve security check
        await approveSecurityCheck(selectedApproval.securityCheckId, remarks || 'Approved');
      } else {
        // Approve prebooking
        await submitApprovalDecision(
          selectedApproval.approvalLogId,
          'APPROVED',
          remarks || 'Approved'
        );
      }

      setShowDetails(false);
      setSelectedApproval(null);
      fetchPendingApprovals();
    } catch (err) {
      setError('Failed to approve: ' + err.message);
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) {
      setError('No approval selected');
      return;
    }

    if (!remarks.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);

      if (selectedApproval.requestType === 'SECURITY_CHECK') {
        // Reject security check
        await rejectSecurityCheck(selectedApproval.securityCheckId, remarks);
      } else {
        // Reject prebooking
        await submitApprovalDecision(
          selectedApproval.approvalLogId,
          'REJECTED',
          remarks
        );
      }

      setShowDetails(false);
      setSelectedApproval(null);
      fetchPendingApprovals();
    } catch (err) {
      setError('Failed to reject: ' + err.message);
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-linear-to-r from-white via-white to-slate-50 px-8 py-8 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Approvals</h1>
              <p className="text-gray-600 mt-1">Review pending visitor pre-bookings</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">{pendingApprovals.length}</div>
              <p className="text-gray-600 text-sm">Pending approvals</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Main Content */}
        {pendingApprovals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Approvals</h3>
            <p className="text-gray-600">You're all caught up! No visitor requests need your approval.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.requestType === 'SECURITY_CHECK' 
                  ? `sc-${approval.securityCheckId}` 
                  : `pb-${approval.approvalLogId}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {(approval.visitorName || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {approval.visitorName}
                          </h3>
                          <p className="text-sm text-gray-600">{approval.visitorEmail}</p>
                        </div>
                        {/* Request Type Badge */}
                        <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                          approval.requestType === 'SECURITY_CHECK' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {approval.requestType === 'SECURITY_CHECK' ? 'Walk-in' : 'Pre-booking'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                            {approval.requestType === 'SECURITY_CHECK' ? 'Host Employee' : 'Visiting'}
                          </label>
                          <p className="text-gray-900 font-medium">{approval.hostEmployeeName}</p>
                        </div>
                        {approval.visitDate && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                              Visit Date
                            </label>
                            <p className="text-gray-900 font-medium">{formatDate(approval.visitDate)}</p>
                          </div>
                        )}
                        {approval.referenceCode && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                              Reference Code
                            </label>
                            <p className="text-gray-900 font-medium">{approval.referenceCode}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                            Approval Level
                          </label>
                          <p className="text-gray-900 font-medium">L{approval.approvalLevel}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                            Submitted
                          </label>
                          <p className="text-gray-900 font-medium">{approval.createdAt ? formatDateTime(approval.createdAt) : '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        ⏳ Pending
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleViewDetails(approval)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-blue-600 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Approval Details</h2>
                <p className="text-sm opacity-90 mt-1">
                  {selectedApproval.requestType === 'SECURITY_CHECK' ? 'Walk-in Visitor' : 'Pre-booked Visit'}
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-white hover:text-blue-100 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Visitor Info */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  📋 Visitor Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Name</label>
                    <p className="text-gray-900 font-medium">{selectedApproval.visitorName}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                    <p className="text-gray-900 font-medium">{selectedApproval.visitorEmail}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Visit Date</label>
                    <p className="text-gray-900 font-medium">{selectedApproval.visitDate ? formatDate(selectedApproval.visitDate) : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Host</label>
                    <p className="text-gray-900 font-medium">{selectedApproval.hostEmployeeName}</p>
                  </div>
                </div>
              </div>

              {/* Approval History */}
              {Array.isArray(approvalHistory) && approvalHistory.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                    📜 Approval History
                  </h3>
                  <div className="space-y-3">
                    {approvalHistory.map((entry, idx) => (
                      <div key={idx} className="bg-gray-50 rounded p-3 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">
                            {entry.approverName}
                          </span>
                          <span className={`px-3 py-1 rounded text-xs font-medium ${
                            entry.action === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            entry.action === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.action}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Level {entry.approvalLevel}</p>
                        {entry.remarks && (
                          <p className="text-sm text-gray-700 italic">
                            "{entry.remarks}"
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {entry.actionTime ? formatDateTime(entry.actionTime) : '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks Input */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-900 mb-2">
                  Remarks (Optional for Approval, Required for Rejection)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add remarks (optional for approval, required for rejection)"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded transition-colors"
                >
                  {submitting ? 'Processing...' : '✓ Approve'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded transition-colors"
                >
                  {submitting ? 'Processing...' : '✕ Reject'}
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  disabled={submitting}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsQueue;
