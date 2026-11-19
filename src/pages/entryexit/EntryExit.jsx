import { useEffect, useState } from 'react';
import { listVisitorReport } from '../../services/visitorReportService';
import { getCompanyConfigs } from '../../services/companyConfigService';


const EntryExit = () => {
  const [requests, setRequests] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listVisitorReport({ fromDate, toDate, pageSize: 200, approvalStatus: 'APPROVED' });
      const data = res.data || res || {};
      const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
      setRequests(items.map(formatVisitorData));
    } catch (error) {
      console.error('Error fetching visitor report data:', error);
    } finally {
      setLoading(false);
    }

    try {
      const res = await getCompanyConfigs();
      const configs = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.recordset)
            ? res.recordset
            : Array.isArray(res?.items)
              ? res.items
              : [];
      if (configs.length > 0) setCompany(configs[0]);
    } catch (error) {
      console.error('Error fetching company config:', error);
    }
  };

  const formatVisitorData = (visitor) => {
    const photo = visitor.VisitorPhoto || visitor.visitor_photo || visitor.VisitorPhotoBase64 || visitor.visitor_photo_base64 || visitor.photo || null;
    return {
      visitorName: visitor.VisitorName || visitor.visitor_name || visitor.visitorName || 'N/A',
      visitorEmail: visitor.VisitorEmail || visitor.visitor_email || visitor.visitorEmail || 'N/A',
      visitorMobile: visitor.VisitorMobile || visitor.visitor_mobile || visitor.visitorMobile || 'N/A',
      visitorCompany: visitor.CompanyName || visitor.company_name || visitor.companyName || visitor.VisitorCompany || visitor.visitor_company || visitor.Company || visitor.company || 'N/A',
      visitorPhoto: photo,
      departmentName: visitor.DepartmentName || visitor.department_name || visitor.departmentName || 'N/A',
      hostEmployeeName: visitor.HostEmployeeName || visitor.host_employee_name || visitor.hostEmployeeName || 'N/A',
      visitDate: visitor.VisitDate || visitor.visit_date || visitor.visitDate || 'N/A',
      purposeName: visitor.PurposeName || visitor.purpose_name || visitor.purposeName || visitor.Purpose || 'N/A',
      idProofNumber: visitor.id_proof_number || visitor.IDProofNumber || visitor.idProofNumber || 'N/A',
      visitTimeSlot: visitor.visit_time_slot || visitor.VisitTimeSlot || visitor.visitTimeSlot || 'N/A',
      referenceCode: visitor.ReferenceCode || visitor.reference_code || visitor.referenceCode || 'N/A',
      entryTime: visitor.EntryTime || visitor.entry_time || visitor.entryTime || 'N/A',
      exitTime: visitor.ExitTime || visitor.exit_time || visitor.exitTime || 'N/A',
      status: visitor.ApprovalStatus || visitor.approval_status || visitor.VisitStatus || visitor.RequestStatus || visitor.status || 'N/A',
      additionalDetails: visitor.additional_details || visitor.additionalDetails || {}
    };
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CHECKED_IN': return 'bg-blue-100 text-blue-800';
      case 'PENDING_ENTRY': return 'bg-indigo-100 text-indigo-800';
      case 'CHECKED_OUT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatPhotoSrc = (photo) => {
    if (!photo) return null;
    const trimmed = String(photo).trim();
    if (!trimmed) return null;
    if (
      trimmed.startsWith('data:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/')
    ) {
      return trimmed;
    }
    if (trimmed.length < 100) {
      console.warn('VisitorPhoto appears to be truncated or invalid:', trimmed);
      return null;
    }
    const isPNG = trimmed.startsWith('iVBOR');
    return `data:image/${isPNG ? 'png' : 'jpeg'};base64,${trimmed}`;
  };

  const handlePrint = (request) => {
    const photoSrc = request.visitorPhoto ? formatPhotoSrc(request.visitorPhoto) : null;

    // Hardcoded company details
  const companyName = 'SKY STEEL & POWER PVT LTD';
    const companyAddress = ' Power plant consultant Kesda, Chhattisgarh';
    const companyEmail = '';
    const companyPhone = '';
    // const logo = '../../assets/logo.png'; 

    // Build the gate pass HTML – use the imported logo variable directly
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Gate Pass - ${request.visitorName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; padding: 30px; color: #1f2937; }
          .container { max-width: 800px; margin: auto; background: #fff; }
          .header { border-bottom: 2px solid #1f2937; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
          .company-logo { height: 80px; width: 80px; object-fit: contain; border-radius: 8px; margin-right: 20px; }
          .company-info h1 { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
          .company-info p { font-size: 14px; color: #4b5563; max-width: 400px; }
          .contact-info { display: flex; gap: 16px; font-size: 13px; color: #6b7280; margin-top: 6px; }
          .right-header { text-align: right; display: flex; align-items: center; gap: 20px; }
          .photo-box { display: flex; flex-direction: column; align-items: center; }
          .photo-box img { height: 96px; width: 96px; object-fit: cover; border-radius: 8px; border: 2px solid #d1d5db; }
          .photo-box span { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .date-box { background: #eff6ff; padding: 8px 16px; border-radius: 8px; }
          .date-box p:first-child { font-size: 13px; color: #4b5563; }
          .date-box p:last-child { font-size: 16px; font-weight: 600; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; }
          .detail-card { background: #f9fafb; padding: 12px; border-radius: 8px; }
          .detail-card label { font-size: 12px; color: #6b7280; }
          .detail-card p { font-size: 16px; font-weight: 600; }
          .ref-card { background: #eff6ff; border: 1px solid #bfdbfe; }
          .ref-card label { color: #2563eb; }
          .footer { border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="display:flex; align-items:flex-start;">
              
              <div class="company-info">
                <h1>${companyName}</h1>
                <p>${companyAddress}</p>
                <div class="contact-info">
                  ${companyEmail ? `<span>Email: ${companyEmail}</span>` : ''}
                  ${companyPhone ? `<span>Phone: ${companyPhone}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="right-header">
              ${photoSrc ? `
              <div class="photo-box">
                <img id="visitor-photo" src="${photoSrc}" alt="Visitor" onerror="this.style.display='none'" />
                <span>Visitor Photo</span>
              </div>` : ''}
              <div class="date-box">
                <p>Visit Date</p>
                <p>${request.visitDate}</p>
              </div>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-card">
              <label>Visitor Name</label>
              <p>${request.visitorName}</p>
            </div>
            <div class="detail-card ref-card">
              <label>Reference Code</label>
              <p>${request.referenceCode !== 'N/A' ? request.referenceCode : 'Pending approval'}</p>
            </div>
            <div class="detail-card">
              <label>Email Address</label>
              <p>${request.visitorEmail}</p>
            </div>
            <div class="detail-card">
              <label>Mobile Number</label>
              <p>${request.visitorMobile}</p>
            </div>
            <div class="detail-card">
              <label>Department</label>
              <p>${request.departmentName}</p>
            </div>
            <div class="detail-card">
              <label>Host Employee</label>
              <p>${request.hostEmployeeName}</p>
            </div>
            <div class="detail-card">
              <label>Purpose of Visit</label>
              <p>${request.purposeName}</p>
            </div>
          </div>

          <div class="footer">
            This is a system-generated gate pass.
          </div>
        </div>
      </body>
      </html>
    `;

    // Open new window and write content
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow pop-ups to print the gate pass.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();

    // If there is a photo, wait for it to load, then print
    if (photoSrc) {
      const img = printWindow.document.getElementById('visitor-photo');
      if (img) {
        img.onload = () => {
          printWindow.print();
          printWindow.close();
        };
        img.onerror = () => {
          // Still print even if photo fails
          printWindow.print();
          printWindow.close();
        };
        // If image is already cached/loaded immediately
        if (img.complete) {
          printWindow.print();
          printWindow.close();
        }
      } else {
        printWindow.print();
        printWindow.close();
      }
    } else {
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Visitor Entry/Exit Management</h1>
              <p className="mt-2 text-sm text-gray-600">Monitor and manage gatepass records for a selected date range</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg shadow-sm p-2 flex items-center gap-2">
                <label htmlFor="fromDate" className="text-sm text-gray-500">From:</label>
                <input type="date" id="fromDate" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <label htmlFor="toDate" className="text-sm text-gray-500 ml-2">To:</label>
                <input type="date" id="toDate" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <button onClick={fetchData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition duration-200 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Visitors</p>
                <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{requests.filter(r => String(r.status).toUpperCase() === 'APPROVED').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Selected Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to {new Date(toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visitor</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Host/Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><span className="ml-3 text-gray-500">Loading visitors...</span></div></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500"><svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><p className="text-lg font-medium">No visitors found</p><p className="text-sm">No approved visitors for the selected date</p></td></tr>
                ) : (
                  requests.map((req, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-6 py-4"><div className="flex items-center"><div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">{req.visitorName.charAt(0)}</div><div className="ml-4"><div className="text-sm font-medium text-gray-900">{req.visitorName}</div><div className="text-sm text-gray-500">ID: {req.idProofNumber}</div></div></div></td>
                      <td className="px-6 py-4"><div className="text-sm text-gray-900">{req.visitorEmail}</div><div className="text-sm text-gray-500">{req.visitorMobile}</div></td>
                      <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{req.hostEmployeeName}</div><div className="text-sm text-gray-500">{req.departmentName}</div></td>
                      <td className="px-6 py-4"><div className="text-sm text-gray-900">{req.visitDate}</div><div className="text-sm text-gray-500">{req.visitTimeSlot}</div><div className="text-xs text-gray-500 mt-1">In: {req.entryTime}</div><div className="text-xs text-gray-500">Out: {req.exitTime}</div><div className="text-xs text-gray-400 mt-1">{req.purposeName}</div><div className="text-xs text-blue-600 mt-1 font-medium">Ref: {req.referenceCode}</div></td>
                      <td className="px-6 py-4"><span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(req.status)}`}>{req.status}</span></td>
                      <td className="px-6 py-4">
                        <button onClick={() => handlePrint(req)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition duration-200 shadow-sm hover:shadow-md">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Gate Pass / Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Powered by Shree Nithaya Enterprises</p>
          <p className="text-xs mt-1">© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default EntryExit;
