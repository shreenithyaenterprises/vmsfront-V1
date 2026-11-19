import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuth } from '../utils/authStorage.js';
import { logout } from '../services/authService.js';

const ROLE_PERMISSIONS = {
  ADMIN: {
    entryExit: true,
    requestApproval: true,
    reports: true,
    master: true,
  },
  EMPLOYEE: {
    entryExit: false,
    requestApproval: true,
    reports: false,
    master: false,
  },
  MANAGER: {
    entryExit: false,
    requestApproval: true,
    reports: true,
    master: false,
  },
  SECURITY: {
    entryExit: true,
    requestApproval: false,
    reports: true,
    master: false,
  },
};

const DEFAULT_PERMISSIONS = {
  entryExit: false,
  requestApproval: false,
  reports: false,
  master: false,
};

const normalizeRole = (role) => role?.trim().toUpperCase() || '';

const canAccessPath = (pathname, permissions) => {
  if (pathname === '/') return true;

  if (pathname.startsWith('/master')) {
    return permissions.master;
  }

  if (
    pathname.startsWith('/prebooking/gate') ||
    pathname.startsWith('/prebooking/security-check') ||
    pathname.startsWith('/entry-exit')
  ) {
    return permissions.entryExit;
  }

  if (
    pathname.startsWith('/prebooking/request') ||
    pathname.startsWith('/prebooking/government-official') ||
    pathname.startsWith('/prebooking/ceat-interplant/approvals') ||
    pathname.startsWith('/prebooking/approvals') ||
    pathname.startsWith('/prebooking/template')
  ) {
    return permissions.requestApproval;
  }

  if (pathname.startsWith('/prebooking/report')) {
    return permissions.reports;
  }

  return false;
};

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const role = normalizeRole(auth?.role);
  const permissions = ROLE_PERMISSIONS[role] || DEFAULT_PERMISSIONS;
  
  // Section toggles
  const [isEntryExitOpen, setIsEntryExitOpen] = useState(true);
  const [isRequestApprovalOpen, setIsRequestApprovalOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  
  // Sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!canAccessPath(location.pathname, permissions)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate, permissions]);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-md border-l-4 border-blue-400 -ml-px'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`;

  const sectionButtonClass = (isActive) =>
    `flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
      isActive 
        ? 'bg-slate-700 text-blue-400' 
        : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
    }`;

  const isEntryExitActive =
    permissions.entryExit &&
    (location.pathname.startsWith('/prebooking/gate') ||
      location.pathname.startsWith('/prebooking/security-check'));
  const isRequestApprovalActive =
    permissions.requestApproval &&
    (location.pathname.startsWith('/prebooking/request') ||
      location.pathname.startsWith('/prebooking/government-official') ||
      location.pathname.startsWith('/prebooking/ceat-interplant/approvals') ||
      location.pathname.startsWith('/prebooking/approvals') ||
      location.pathname.startsWith('/prebooking/template'));
  const isReportsActive = permissions.reports && location.pathname.startsWith('/prebooking/report');
  const isMasterActive = location.pathname.startsWith('/master');

  useEffect(() => {
    if (isMasterActive) setIsMasterOpen(true);
  }, [isMasterActive]);

  useEffect(() => {
    if (isEntryExitActive) setIsEntryExitOpen(true);
  }, [isEntryExitActive]);

  useEffect(() => {
    if (isRequestApprovalActive) setIsRequestApprovalOpen(true);
  }, [isRequestApprovalActive]);

  useEffect(() => {
    if (isReportsActive) setIsReportsOpen(true);
  }, [isReportsActive]);

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">VMS Portal</h1>
            <p className="text-xs text-slate-400 mt-0.5">Visitor Management</p>
          </div>
          {!isDesktopCollapsed && (
            <button
              onClick={() => setIsDesktopCollapsed(true)}
              className="hidden lg:block p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
              aria-label="Collapse sidebar"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shadow-lg">
            {auth?.role?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-medium text-slate-200">{auth?.role || 'User'}</p>
            <p className="text-slate-400">Active Session</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Home */}
        <div className="mb-4">
          <NavLink to="/" end className={linkClass}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </NavLink>
        </div>

        {/* Entry / Exit Section */}
        {permissions.entryExit && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsEntryExitOpen((prev) => !prev)}
            className={sectionButtonClass(isEntryExitActive)}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              Entry / Exit
            </span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isEntryExitOpen ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isEntryExitOpen && (
            <div className="mt-1 ml-2 space-y-1 border-l-2 border-slate-700 pl-2">
              <NavLink to="/prebooking/gate" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Gate Entry Kiosk</span>
              </NavLink>
              <NavLink to="/prebooking/security-check" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Security Check</span>
              </NavLink>
              <NavLink to="/entry-exit" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Entry / Exit List</span>
              </NavLink>
            </div>
          )}
        </div>
        )}

        {/* Request & Approval Section */}
        {permissions.requestApproval && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsRequestApprovalOpen((prev) => !prev)}
            className={sectionButtonClass(isRequestApprovalActive)}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Requests & Approvals
            </span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isRequestApprovalOpen ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isRequestApprovalOpen && (
            <div className="mt-1 ml-2 space-y-1 border-l-2 border-slate-700 pl-2">
              <NavLink to="/prebooking/request" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Request</span>
              </NavLink>
              {/* WhatsApp Request - disabled */}
              {/* <NavLink to="/prebooking/request/whatsapp" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>WhatsApp Request</span>
              </NavLink> */}
              {/* Apply Form - Commented out */}
              {/* <NavLink to="/prebooking/ceat-interplant" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 018 0v2m-4-9a3 3 0 100-6 3 3 0 000 6zM5 21h14a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z" />
                </svg>
                <span>Apply Form</span>
              </NavLink> */}
              <NavLink to="/prebooking/government-official" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" />
                </svg>
                <span>Government Official</span>
              </NavLink>
              <NavLink to="/prebooking/approvals" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Approvals Queue</span>
              </NavLink>
              {/* Inter-Plant Approval - Commented out */}
              {/* <NavLink to="/prebooking/ceat-interplant/approvals" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-5l2 2h-4l2-2zm0 18l-2-2h4l-2 2zM3 12l2-2v4l-2-2zm18 0l-2 2v-4l2 2z" />
                </svg>
                <span>Inter-Plant Approval</span>
              </NavLink> */}
            </div>
          )}
        </div>
        )}

        {/* Reports Section */}
        {permissions.reports && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsReportsOpen((prev) => !prev)}
            className={sectionButtonClass(isReportsActive)}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reports
            </span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isReportsOpen ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isReportsOpen && (
            <div className="mt-1 ml-2 space-y-1 border-l-2 border-slate-700 pl-2">
              <NavLink to="/prebooking/report" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Visitor Report</span>
              </NavLink>
            </div>
          )}
        </div>
        )}

        {/* Master Section */}
        {permissions.master && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsMasterOpen((prev) => !prev)}
            className={sectionButtonClass(isMasterActive)}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Master Data
            </span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isMasterOpen ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isMasterOpen && (
            <div className="mt-1 ml-2 space-y-1 border-l-2 border-slate-700 pl-2">
              <NavLink to="/master/employee" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Employee</span>
              </NavLink>
              <NavLink to="/master/department" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Department</span>
              </NavLink>
              <NavLink to="/master/designation" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Designation</span>
              </NavLink>
              <NavLink to="/master/approval-rule" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Approval Rule</span>
              </NavLink>
              <NavLink to="/master/approval-authority" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Approval Authority</span>
              </NavLink>
              <NavLink to="/master/time-policy" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Time Policy</span>
              </NavLink>
              <NavLink to="/master/company" className={linkClass}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Company Master</span>
              </NavLink>
            </div>
          )}
        </div>
        )}
      </nav>

      {/* Footer - Logout */}
      <div className="px-4 py-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 hover:border-red-700 shadow-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-lg font-bold text-white">VMS Portal</h1>
          <p className="text-xs text-slate-400">Visitor Management</p>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 bottom-0 z-50 flex flex-col bg-slate-900 border-r border-slate-700 transition-all duration-300 shadow-2xl
          ${isSidebarOpen ? 'left-0' : '-left-full'}
          lg:left-0
          ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-72'}
          w-72
        `}
      >
        {isDesktopCollapsed ? (
          // Collapsed Desktop View
          <div className="hidden lg:flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 flex justify-center">
              <button
                onClick={() => setIsDesktopCollapsed(false)}
                className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                aria-label="Expand sidebar"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-2">
              <NavLink to="/" end className="flex justify-center p-3 rounded-lg hover:bg-slate-700 transition-colors" title="Dashboard">
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </NavLink>
              {(permissions.entryExit || permissions.requestApproval || permissions.reports || permissions.master) && (
                <div className="h-px bg-slate-700 my-2" />
              )}
              {permissions.entryExit && (
                <NavLink
                  to="/prebooking/gate"
                  className="flex justify-center p-3 rounded-lg hover:bg-slate-700 transition-colors w-full"
                  title="Entry / Exit"
                >
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </NavLink>
              )}
              {permissions.requestApproval && (
                <NavLink
                  to="/prebooking/request"
                  className="flex justify-center p-3 rounded-lg hover:bg-slate-700 transition-colors w-full"
                  title="Requests & Approvals"
                >
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </NavLink>
              )}
              {permissions.reports && (
                <NavLink
                  to="/prebooking/report"
                  className="flex justify-center p-3 rounded-lg hover:bg-slate-700 transition-colors w-full"
                  title="Reports"
                >
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </NavLink>
              )}
              {permissions.master && (
                <NavLink
                  to="/master/employee"
                  className="flex justify-center p-3 rounded-lg hover:bg-slate-700 transition-colors w-full"
                  title="Master"
                >
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </NavLink>
              )}
            </div>
            <div className="p-2 border-t border-slate-700">
              <button
                onClick={handleLogout}
                className="flex justify-center p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors w-full shadow-md"
                title="Sign Out"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          // Full Sidebar View
          <SidebarContent />
        )}

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-700 transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </aside>

      {/* Main Content */}
      <div
        className={`
          transition-all duration-300
          pt-16 lg:pt-0
          ${isDesktopCollapsed ? 'lg:pl-20' : 'lg:pl-72'}
        `}
      >
        <main className="px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;