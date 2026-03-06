import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { lazy, Suspense } from "react";
// New UI (strict-template / redesign)
const RedesignIndex = lazy(() => import("./redesign/pages/RedesignIndex"));
const RedesignCatalog = lazy(() => import("./redesign/pages/RedesignCatalog"));
const RedesignApartments = lazy(() => import("./redesign/pages/RedesignApartments"));
const RedesignComplex = lazy(() => import("./redesign/pages/RedesignComplex"));
const RedesignApartment = lazy(() => import("./redesign/pages/RedesignApartment"));
const RedesignMap = lazy(() => import("./redesign/pages/RedesignMap"));
const RedesignLayouts = lazy(() => import("./redesign/pages/RedesignLayouts"));
// Legacy pages (catalog apartments, news, auth, etc.)
import Index from "./pages/Index";
import Catalog from "./pages/Catalog";
import CatalogZhk from "./pages/CatalogZhk";
import ZhkDetail from "./pages/ZhkDetail";
import ObjectDetail from "./pages/ObjectDetail";
const MapPage = lazy(() => import("./pages/MapPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Ipoteka from "./pages/Ipoteka";
import Favorites from "./pages/Favorites";
import ContactsPage from "./pages/ContactsPage";

// Admin pages
const AdminLayout = lazy(() => import("./admin/layout/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));
const AdminPages = lazy(() => import("./admin/pages/AdminPages"));
const AdminPageEditor = lazy(() => import("./admin/pages/AdminPageEditor"));
const AdminMedia = lazy(() => import("./admin/pages/AdminMedia"));
const AdminUsers = lazy(() => import("./admin/pages/AdminUsers"));
const AdminSettings = lazy(() => import("./admin/pages/AdminSettings"));
const AdminTokens = lazy(() => import("./admin/pages/AdminTokens"));
const EditorPage = lazy(() => import("./admin/components/editor/EditorPage"));

const queryClient = new QueryClient();

function LegacyRedirect({ toTemplate, paramKey }: { toTemplate: string; paramKey: string }) {
  const params = useParams();
  const value = params[paramKey as keyof typeof params];
  const to = value ? toTemplate.replace(`:${paramKey}`, value) : toTemplate;
  return <Navigate to={to} replace />;
}

const Loading = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Main routes — new UI (strict-template) */}
            <Route path="/" element={<RedesignIndex />} />
            <Route path="/catalog" element={<RedesignCatalog />} />
            <Route path="/complex/:slug" element={<RedesignComplex />} />
            <Route path="/apartment/:id" element={<RedesignApartment />} />
            <Route path="/apartment" element={<RedesignApartments />} />
            <Route path="/map" element={<RedesignMap />} />
            <Route path="/layouts/:complex" element={<RedesignLayouts />} />
            <Route path="/search" element={<SearchPage />} />
            {/* Legacy redirects — param preserved */}
            <Route path="/zhk/:slug" element={<LegacyRedirect toTemplate="/complex/:slug" paramKey="slug" />} />
            <Route path="/object/:slug" element={<LegacyRedirect toTemplate="/apartment/:slug" paramKey="slug" />} />
            <Route path="/catalog-apartments" element={<Catalog />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:slug" element={<NewsDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/ipoteka" element={<Ipoteka />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/contacts" element={<ContactsPage />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="pages" element={<AdminPages />} />
              <Route path="page-editor/:slug" element={<AdminPageEditor />} />
              <Route path="media" element={<AdminMedia />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="tokens" element={<AdminTokens />} />
            </Route>
            <Route path="/admin/editor/:pageId" element={<EditorPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
