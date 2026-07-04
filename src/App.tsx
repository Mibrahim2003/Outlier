/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { Auth } from './components/Auth';
import { ResetPassword } from './components/ResetPassword';
import { Dashboard } from './components/Dashboard';
import { Analytics } from './components/Analytics';
import { Onboarding } from './components/Onboarding';
import { ProfileSetup } from './components/ProfileSetup';
import { CourseDetail } from './components/CourseDetail';
import { CourseList } from './components/CourseList';
import { AcademicCalendar } from './components/AcademicCalendar';
import { Settings } from './components/Settings';
import { PostAuthGate } from './components/PostAuthGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { ErrorBoundary } from 'react-error-boundary';
import { GlobalErrorFallback } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { playSound } from './utils/sound';

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    // Opt-in success chime: only mutations tagged `meta: { sound: 'success' }`
    // (meaningful save/commit moments) make a sound. Routine updates stay silent.
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.meta?.sound === 'success') playSound('success');
    },
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silent) return;

      playSound('error');
      toast.error('Sync Failed', {
        description: error.message || 'Check your connection and try again.',
      });
    },
  }),
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
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            className: 'bg-white border-4 border-ink shadow-[6px_6px_0px_#1A1A1A] rounded-none font-bold',
            descriptionClassName: 'text-ink/70 font-medium',
          }}
        />
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

        {/* Recovery links land here with a recovery session, so this route
            must stay outside PublicOnlyRoute (which bounces signed-in users). */}
        <Route path="/reset-password" element={<ResetPassword />} />

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
                <Settings />
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
