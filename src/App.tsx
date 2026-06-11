/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Analytics } from './components/Analytics';
import { Onboarding } from './components/Onboarding';
import { ProfileSetup } from './components/ProfileSetup';
import { CourseDetail } from './components/CourseDetail';
import { CourseList } from './components/CourseList';
import { AcademicCalendar } from './components/AcademicCalendar';
import { PostAuthGate } from './components/PostAuthGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { ErrorBoundary } from 'react-error-boundary';
import { GlobalErrorFallback } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <Router>
        <Routes>
        {/* ─── Public-Only Routes ────────────────────────────── */}
        {/* Logged-in users are redirected away to /post-auth */}
        <Route path="/" element={
          <PublicOnlyRoute>
            <LandingPage />
          </PublicOnlyRoute>
        } />
        <Route path="/auth" element={
          <PublicOnlyRoute>
            <Auth />
          </PublicOnlyRoute>
        } />

        {/* ─── Post-Auth Gate ────────────────────────────────── */}
        {/* The single canonical routing decision point.         */}
        {/* Both Google OAuth and email auth funnel here.         */}
        <Route path="/post-auth" element={<PostAuthGate />} />

        {/* ─── Setup Routes (auth required, no profile needed) ── */}
        <Route path="/profile-setup" element={
          <ProtectedRoute requireProfile={false} requireLoadout={false}>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute requireProfile={true} requireLoadout={false}>
            <Onboarding />
          </ProtectedRoute>
        } />

        {/* ─── Protected Routes (auth + profile required) ────── */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Layout>
                <Analytics />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/courses" 
          element={
            <ProtectedRoute>
              <Layout>
                <CourseList />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/courses/:id" 
          element={
            <ProtectedRoute>
              <Layout>
                <CourseDetail />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <Layout>
                <AcademicCalendar />
              </Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <div className="py-12 text-center">
                  <h2 className="text-4xl font-black uppercase tracking-tighter">Settings</h2>
                  <p className="mt-4 text-xl font-medium opacity-60 italic">Account settings coming soon...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } 
        />

          {/* ─── Catch-all ───────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
