import { createBrowserRouter, Outlet } from "react-router-dom";
import Layout from "../components/Layout";
import HomePage from "../pages/Home/HomePage";
import PropertyListPage from "../pages/PropertyList/PropertyListPage";
import PropertyDetailsPage from "../pages/PropertyDetails/PropertyDetailsPage";
import AdvisorRequestPage from "../pages/AdvisorRequestPage";
import CityPage from "../pages/CityPage";
import PropertyLandingPage from "../pages/PropertyLanding/PropertyLandingPage";
import OwnerLoginPage from "../pages/owner/OwnerLoginPage";
import OwnerOnboardPage from "../pages/owner/OwnerOnboardPage";
import OwnerKycPage from "../pages/owner/OwnerKycPage";
import OwnerPostPropertyPage from "../pages/owner/OwnerPostPropertyPage";
import OwnerMyListingsPage from "../pages/owner/OwnerMyListingsPage";
import OwnerEditListingPage from "../pages/owner/OwnerEditListingPage";
import OwnerPreviewListingPage from "../pages/owner/OwnerPreviewListingPage";
import BusinessRequestAccessPage from "../pages/BusinessRequestAccessPage";
import ProjectsListPage from "../pages/Projects/ProjectsListPage";
import ProjectDetailsPage from "../pages/Projects/ProjectDetailsPage";
import ProjectUnitsPage from "../pages/Projects/ProjectUnitsPage";
import MapSearchPage from "../pages/Map/MapSearchPage";
import OwnerGuard from "../components/OwnerGuard";

function LayoutWrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutWrapper />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "search", element: <PropertyListPage /> },
      { path: "p/:propertyId", element: <PropertyDetailsPage /> },
      { path: "advisor", element: <AdvisorRequestPage /> },
      { path: "projects", element: <ProjectsListPage /> },
      { path: "projects/:slug", element: <ProjectDetailsPage /> },
      { path: "projects/:slug/units", element: <ProjectUnitsPage /> },
      { path: "map", element: <MapSearchPage /> },
      { path: "cities/:citySlug", element: <CityPage /> },
      { path: "properties/:city", element: <PropertyLandingPage /> },
      { path: "properties/:city/:locality", element: <PropertyLandingPage /> },
      { path: "business/request", element: <BusinessRequestAccessPage /> },
      { path: "owner/login", element: <OwnerLoginPage /> },
      {
        path: "owner",
        element: <OwnerGuard />,
        children: [
          { path: "onboard", element: <OwnerOnboardPage /> },
          { path: "kyc", element: <OwnerKycPage /> },
          { path: "post-property", element: <OwnerPostPropertyPage /> },
          { path: "my-listings", element: <OwnerMyListingsPage /> },
          { path: "my-listings/:listingId/edit", element: <OwnerEditListingPage /> },
          { path: "my-listings/:listingId/preview", element: <OwnerPreviewListingPage /> }
        ]
      }
    ]
  }
]);



