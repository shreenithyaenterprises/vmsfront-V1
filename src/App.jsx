import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/auth/Login.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import Home from './pages/home/Home.jsx';
import TypeMaster from './pages/master/type/TypeMaster.jsx';
import PurposeMaster from './pages/master/purpose/PurposeMaster.jsx';
import EmployeeMaster from './pages/master/employee/EmployeeMaster.jsx';
import DepartmentMaster from './pages/master/department/DepartmentMaster.jsx';
import DesignationMaster from './pages/master/designation/DesignationMaster.jsx';
import IdProofMaster from './pages/master/idProof/IdProofMaster.jsx';
import BadgeMaster from './pages/master/badge/BadgeMaster.jsx';
import ApprovalRuleMaster from './pages/master/approvalRule/ApprovalRuleMaster.jsx';
import ApprovalAuthorityMaster from './pages/master/approvalAuthority/ApprovalAuthorityMaster.jsx';
import TimePolicyMaster from './pages/master/timePolicy/TimePolicyMaster.jsx';
import CompanyMaster from './pages/master/companyConfig/CompanyMaster.jsx';
import PrebookingRequest from './pages/prebooking/request/PrebookingRequest.jsx';
// import PrebookingWhatsAppRequest from './pages/prebooking/request/PrebookingWhatsAppRequest.jsx';
import PrebookingTemplate from './pages/prebooking/template/PrebookingTemplate.jsx';
import PrebookingForm from './pages/prebooking/public/PrebookingForm.jsx';
import CeatInterplantPublicForm from './pages/prebooking/public/CeatInterplantPublicForm.jsx';
import ApprovalsQueue from './pages/prebooking/approval/ApprovalsQueue.jsx';
import CeatInterplantApprovals from './pages/prebooking/approval/CeatInterplantApprovals.jsx';
import GateEntryKiosk from './pages/prebooking/gate/GateEntryKiosk.jsx';
import VisitorReport from './pages/prebooking/report/VisitorReport.jsx';
import GovernmentOfficialEntry from './pages/prebooking/security/GovernmentOfficialEntry.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

import EntryExit from './pages/entryexit/EntryExit.jsx';

const App = () => (
  <Routes>
    <Route path="/prebooking/form" element={<PrebookingForm />} />
    <Route path="/prebooking/form/:token" element={<PrebookingForm />} />
    <Route path="/prebooking/public/form" element={<PrebookingForm />} />
    <Route path="/prebooking/public/form/:token" element={<PrebookingForm />} />
    <Route path="/prebooking/ceat-interplant" element={<CeatInterplantPublicForm />} />
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Home />} />
      <Route path="master/type" element={<TypeMaster />} />
      <Route path="master/department" element={<DepartmentMaster />} />
      <Route path="master/designation" element={<DesignationMaster />} />
      <Route path="master/id-proof" element={<IdProofMaster />} />
      <Route path="master/badge" element={<BadgeMaster />} />
      <Route path="master/approval-rule" element={<ApprovalRuleMaster />} />
      <Route path="master/approval-authority" element={<ApprovalAuthorityMaster />} />
      <Route path="master/time-policy" element={<TimePolicyMaster />} />
      <Route path="master/purpose" element={<PurposeMaster />} />
      <Route path="master/employee" element={<EmployeeMaster />} />
      <Route path="master/company" element={<CompanyMaster />} />
      <Route path="prebooking/request" element={<PrebookingRequest />} />
      {/* WhatsApp Request route disabled */}
      {/* <Route path="prebooking/request/whatsapp" element={<PrebookingWhatsAppRequest />} /> */}
      <Route path="prebooking/template" element={<PrebookingTemplate />} />
      <Route path="prebooking/approvals" element={<ApprovalsQueue />} />
      <Route path="prebooking/gate" element={<GateEntryKiosk />} />
      <Route path="prebooking/government-official" element={<GovernmentOfficialEntry />} />
      <Route path="prebooking/ceat-interplant/approvals" element={<CeatInterplantApprovals />} />
      <Route path="prebooking/report" element={<VisitorReport />} />
      <Route path="prebooking/security-check" element={<PrebookingForm />} />
      <Route path="entry-exit" element={<EntryExit />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
