import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientListPage from './pages/PatientListPage';
import PatientRegistrationPage from './pages/PatientRegistrationPage';
import PatientDetailsPage from './pages/PatientDetailsPage';
import CaseListPage from './pages/CaseListPage';
import CaseRegistrationPage from './pages/CaseRegistrationPage';
import ClinicalCaseDetailsPage from './pages/ClinicalCaseDetailsPage';
import PostmortemCaseDetailsPage from './pages/PostmortemCaseDetailsPage';
import ExaminationFormPage from './pages/ExaminationFormPage';
import EvidenceManagementPage from './pages/EvidenceManagementPage';
import LabTestPage from './pages/LabTestPage';

// Phase 4 Pages
import PoliceCourtInfoPage from './pages/PoliceCourtInfoPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import ReportListPage from './pages/ReportListPage';
import ReportGenerationPage from './pages/ReportGenerationPage';
import SearchPage from './pages/SearchPage';

// Reports Module Pages
import ReportsIndexPage from './pages/ReportsIndexPage';
import ReportDailyPage from './pages/ReportDailyPage';
import ReportMonthlyPage from './pages/ReportMonthlyPage';
import ReportPendingPage from './pages/ReportPendingPage';
import ReportCourtPage from './pages/ReportCourtPage';
import ReportStatisticalPage from './pages/ReportStatisticalPage';

// Phase 5 Pages
import StaffManagementPage from './pages/StaffManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import AuditLogPage from './pages/AuditLogPage';
import StatisticsPage from './pages/StatisticsPage';
import BackupSettingsPage from './pages/BackupSettingsPage';
import PMRegistryPage from './pages/PMRegistryPage';
import CourtDeskPage from './pages/CourtDeskPage';
import PoliceHubPage from './pages/PoliceHubPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
};

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      
      {/* Patients */}
      <Route path="/patients" element={<ProtectedRoute><PatientListPage /></ProtectedRoute>} />
      <Route path="/patients/new" element={
        <ProtectedRoute allowedRoles={['admin', 'records_clerk', 'doctor']}>
          <PatientRegistrationPage />
        </ProtectedRoute>
      } />
      <Route path="/patients/:id" element={<ProtectedRoute><PatientDetailsPage /></ProtectedRoute>} />
      
      {/* Cases */}
      <Route path="/cases" element={<ProtectedRoute><CaseListPage /></ProtectedRoute>} />
      <Route path="/cases/new" element={
        <ProtectedRoute allowedRoles={['admin', 'records_clerk', 'police']}>
          <CaseRegistrationPage />
        </ProtectedRoute>
      } />
      <Route path="/cases/clinical/:id" element={<ProtectedRoute><ClinicalCaseDetailsPage /></ProtectedRoute>} />
      <Route path="/cases/postmortem/:id" element={<ProtectedRoute><PostmortemCaseDetailsPage /></ProtectedRoute>} />
      
      {/* Shared Forms */}
      <Route path="/exam-injury" element={
        <ProtectedRoute allowedRoles={['admin', 'doctor']}>
          <ExaminationFormPage />
        </ProtectedRoute>
      } />
      
      {/* Evidence & Labs */}
      <Route path="/evidence" element={<ProtectedRoute><EvidenceManagementPage /></ProtectedRoute>} />
      <Route path="/lab-tests" element={<ProtectedRoute><LabTestPage /></ProtectedRoute>} />
      
      {/* Phase 4: Directories, Documents, Reports, Search */}
      <Route path="/directories" element={<ProtectedRoute><PoliceCourtInfoPage /></ProtectedRoute>} />
      <Route path="/cases/:id/documents" element={<ProtectedRoute><DocumentUploadPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportListPage /></ProtectedRoute>} />
      <Route path="/reports/generate/:type/:id" element={<ProtectedRoute><ReportGenerationPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      
      {/* Phase 5: Admin & Management */}
      <Route path="/staff" element={<ProtectedRoute allowedRoles={['admin']}><StaffManagementPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><AuditLogPage /></ProtectedRoute>} />
      <Route path="/statistics" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><StatisticsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><BackupSettingsPage /></ProtectedRoute>} />
      <Route path="/pm-registry" element={<ProtectedRoute allowedRoles={['admin', 'doctor', 'police', 'court']}><PMRegistryPage /></ProtectedRoute>} />

      {/* Court & Legal Desk */}
      <Route path="/court" element={<ProtectedRoute><CourtDeskPage /></ProtectedRoute>} />
      <Route path="/court/summons" element={<ProtectedRoute><CourtDeskPage /></ProtectedRoute>} />
      <Route path="/court/trials" element={<ProtectedRoute><CourtDeskPage /></ProtectedRoute>} />

      {/* Police & Inquest Hub */}
      <Route path="/police-hub" element={<ProtectedRoute><PoliceHubPage /></ProtectedRoute>} />
      <Route path="/police-hub/inquests" element={<ProtectedRoute><PoliceHubPage /></ProtectedRoute>} />
      <Route path="/police-hub/handovers" element={<ProtectedRoute><PoliceHubPage /></ProtectedRoute>} />

      {/* Reports Module */}
      <Route path="/reports/dashboard" element={<ProtectedRoute><ReportsIndexPage /></ProtectedRoute>} />
      <Route path="/reports/daily" element={<ProtectedRoute><ReportDailyPage /></ProtectedRoute>} />
      <Route path="/reports/monthly" element={<ProtectedRoute><ReportMonthlyPage /></ProtectedRoute>} />
      <Route path="/reports/pending" element={<ProtectedRoute><ReportPendingPage /></ProtectedRoute>} />
      <Route path="/reports/court" element={<ProtectedRoute><ReportCourtPage /></ProtectedRoute>} />
      <Route path="/reports/statistical" element={<ProtectedRoute><ReportStatisticalPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
