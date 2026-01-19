import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import "./index.css";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SubmitListingPage from "./pages/SubmitListingPage";
import PendingKycPage from "./pages/PendingKycPage";
import PendingApprovalsPage from "./pages/PendingApprovalsPage";
import BuyerRequestsPage from "./pages/BuyerRequestsPage";
import ListingsListPage from "./pages/ListingsListPage";
import ListingUpsertPage from "./pages/ListingUpsertPage";
import AddPropertyPage from "./pages/AddPropertyPage";
import AuthGuard from "./components/AuthGuard";
import AgenciesListPage from "./pages/Agencies/AgenciesListPage";
import AgencyDetailPage from "./pages/Agencies/AgencyDetailPage";
import AgencyMembersPage from "./pages/Agencies/AgencyMembersPage";
import EnterprisesListPage from "./pages/Enterprises/EnterprisesListPage";
import EnterpriseDetailPage from "./pages/Enterprises/EnterpriseDetailPage";
import EnterpriseMembersPage from "./pages/Enterprises/EnterpriseMembersPage";
import EnterpriseProjectsPage from "./pages/Enterprises/EnterpriseProjectsPage";
import EnterpriseProjectDetailPage from "./pages/Enterprises/EnterpriseProjectDetailPage";
import OrgListingsListPage from "./pages/OrgListings/OrgListingsListPage";
import OrgListingDetailPage from "./pages/OrgListings/OrgListingDetailPage";
import LeadsBoardPage from "./pages/Leads/LeadsBoardPage";
import LeadsTablePage from "./pages/Leads/LeadsTablePage";
import LeadDetailsPage from "./pages/Leads/LeadDetailsPage";
import MandatesListPage from "./pages/Mandates/MandatesListPage";
import MandateDetailPage from "./pages/Mandates/MandateDetailPage";
import OrgVerificationPage from "./pages/Verification/OrgVerificationPage";
import BusinessRequestsPage from "./pages/BusinessRequestsPage";
import BillingPage from "./pages/BillingPage";
import TeamPage from "./pages/TeamPage";
import ProjectsListPage from "./pages/Projects/ProjectsListPage";
import ProjectUpsertPage from "./pages/Projects/ProjectUpsertPage";
import ProjectUnitsPage from "./pages/Projects/ProjectUnitsPage";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route path="/" element={<App />}> 
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="/listings" element={<ListingsListPage />} />
            <Route path="/listings/new" element={<ListingUpsertPage />} />
            <Route path="/listings/:propertyId/edit" element={<ListingUpsertPage />} />
            <Route path="/submit/:propertyId" element={<SubmitListingPage />} />
            <Route path="/add" element={<Navigate to="/listings/new" replace />} />
            <Route path="/add/project" element={<AddPropertyPage mode="project" />} />
            <Route path="/add/project-unit" element={<AddPropertyPage mode="project_unit" />} />
            <Route path="/pending-kyc" element={<PendingKycPage />} />
            <Route path="/pending-approvals" element={<PendingApprovalsPage />} />
            <Route path="/buyer-requests" element={<BuyerRequestsPage />} />
            <Route path="/agencies" element={<AgenciesListPage />} />
            <Route path="/agencies/:agencyId" element={<AgencyDetailPage />} />
            <Route path="/agencies/:agencyId/members" element={<AgencyMembersPage />} />
            <Route path="/enterprises" element={<EnterprisesListPage />} />
            <Route path="/enterprises/:enterpriseId" element={<EnterpriseDetailPage />} />
            <Route path="/enterprises/:enterpriseId/members" element={<EnterpriseMembersPage />} />
            <Route path="/enterprises/:enterpriseId/projects" element={<EnterpriseProjectsPage />} />
            <Route
              path="/enterprises/:enterpriseId/projects/:projectId"
              element={<EnterpriseProjectDetailPage />}
            />
            <Route path="/org-listings" element={<OrgListingsListPage />} />
            <Route path="/org-listings/:orgListingId" element={<OrgListingDetailPage />} />
            <Route path="/leads" element={<LeadsBoardPage />} />
            <Route path="/leads/table" element={<LeadsTablePage />} />
            <Route path="/leads/:leadId" element={<LeadDetailsPage />} />
            <Route path="/mandates" element={<MandatesListPage />} />
            <Route path="/mandates/:mandateId" element={<MandateDetailPage />} />
            <Route path="/org-verification/:orgType/:orgId" element={<OrgVerificationPage />} />
            <Route path="/business-requests" element={<BusinessRequestsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/projects" element={<ProjectsListPage />} />
            <Route path="/projects/new" element={<ProjectUpsertPage />} />
            <Route path="/projects/:projectId/edit" element={<ProjectUpsertPage />} />
            <Route path="/projects/:projectId/units" element={<ProjectUnitsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);


