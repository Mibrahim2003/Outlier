import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../domain/profile/useProfile';
import { useOnboarding } from '../domain/onboarding/useOnboarding';
import { LoadingScreen } from './LoadingScreen';

/**
 * PostAuthGate — the single canonical routing decision point after any auth event.
 *
 * Both Google OAuth and email auth funnel here.
 * Zero UI — just reads state and redirects:
 *   1. Not authenticated → /auth
 *   2. No profile → /profile-setup
 *   3. No loadout committed → /onboarding
 *   4. All good → /dashboard
 */
export const PostAuthGate = () => {
  const { user, loading } = useAuth();
  const { userProfile, isLoading: isProfileLoading } = useProfile();
  const { onboardingState, isLoading: isOnboardingLoading } = useOnboarding();

  if (loading || isProfileLoading || isOnboardingLoading) return <LoadingScreen message="Syncing Data..." />;

  if (!user) return <Navigate to="/auth" replace />;

  if (!userProfile?.name) return <Navigate to="/profile-setup" replace />;

  if (!onboardingState.loadoutCommitted) return <Navigate to="/onboarding" replace />;

  return <Navigate to="/dashboard" replace />;
};
