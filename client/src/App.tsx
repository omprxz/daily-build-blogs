import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './store/themeContext.js';

// Public Layout & Pages
import { PublicLayout } from './layouts/PublicLayout.js';
import { HomePage } from './pages/HomePage.js';
import { ArticlePage } from './pages/ArticlePage.js';
import { CategoryPage } from './pages/CategoryPage.js';
import { SearchPage } from './pages/SearchPage.js';
import {
  AboutPage,
  EditorialPolicyPage,
  CorrectionsPolicyPage,
  PrivacyPolicyPage,
  TermsPage,
} from './pages/StaticPages.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Admin Layout & Modules (Dynamically split to keep public bundle ultra-lightweight)
const AdminLayout = React.lazy(() => import('./layouts/AdminLayout.js').then(m => ({ default: m.AdminLayout })));
const LoginPage = React.lazy(() => import('./admin/LoginPage.js').then(m => ({ default: m.LoginPage })));
const AdminDashboard = React.lazy(() => import('./admin/AdminDashboard.js').then(m => ({ default: m.AdminDashboard })));
const ArticleList = React.lazy(() => import('./admin/ArticleList.js').then(m => ({ default: m.ArticleList })));
const ArticleEditor = React.lazy(() => import('./admin/ArticleEditor.js').then(m => ({ default: m.ArticleEditor })));
const AIContentStudio = React.lazy(() => import('./admin/AIContentStudio.js').then(m => ({ default: m.AIContentStudio })));
const ProvidersAndAgentView = React.lazy(() => import('./admin/ProvidersAndAgentView.js').then(m => ({ default: m.ProvidersAndAgentView })));
const WorkflowBuilder = React.lazy(() => import('./admin/WorkflowBuilder.js').then(m => ({ default: m.WorkflowBuilder })));
const TrainingAndSourcesView = React.lazy(() => import('./admin/TrainingAndSourcesView.js').then(m => ({ default: m.TrainingAndSourcesView })));
const CategoriesManager = React.lazy(() => import('./admin/CategoriesManager.js').then(m => ({ default: m.CategoriesManager })));
const SEOManager = React.lazy(() => import('./admin/SEOManager.js').then(m => ({ default: m.SEOManager })));
const NewsletterView = React.lazy(() => import('./admin/NewsletterView.js').then(m => ({ default: m.NewsletterView })));
const AnalyticsView = React.lazy(() => import('./admin/AnalyticsView.js').then(m => ({ default: m.AnalyticsView })));
const SitesManager = React.lazy(() => import('./admin/SitesManager.js').then(m => ({ default: m.SitesManager })));

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Routes>
        {/* Public Publication Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="article/:slug" element={<ArticlePage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="editorial-policy" element={<EditorialPolicyPage />} />
          <Route path="corrections-policy" element={<CorrectionsPolicyPage />} />
          <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Admin Login Route */}
        <Route
          path="/admin/login"
          element={
            <React.Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center font-mono text-xs text-white/50">Loading Portal...</div>}>
              <LoginPage />
            </React.Suspense>
          }
        />

        {/* Protected Administration Routes */}
        <Route
          path="/admin"
          element={
            <React.Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center font-mono text-xs text-white/50">Loading Workspace...</div>}>
              <AdminLayout />
            </React.Suspense>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="articles" element={<ArticleList />} />
          <Route path="articles/new" element={<ArticleEditor />} />
          <Route path="articles/:id" element={<ArticleEditor />} />
          <Route path="studio" element={<AIContentStudio />} />
          <Route path="training" element={<TrainingAndSourcesView />} />
          <Route path="providers" element={<ProvidersAndAgentView />} />
          <Route path="images" element={<ProvidersAndAgentView />} />
          <Route path="automation" element={<WorkflowBuilder />} />
          <Route path="sources" element={<TrainingAndSourcesView />} />
          <Route path="categories" element={<CategoriesManager />} />
          <Route path="seo" element={<SEOManager />} />
          <Route path="newsletter" element={<NewsletterView />} />
          <Route path="analytics" element={<AnalyticsView />} />
          <Route path="sites" element={<SitesManager />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
};
