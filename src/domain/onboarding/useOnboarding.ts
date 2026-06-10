import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { OnboardingState } from '../../types';
import { DbOnboardingRow } from '../db-types';

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  loadoutCommitted: false,
  version: 1,
};

export const mapOnboardingRow = (row: DbOnboardingRow): OnboardingState => ({
  loadoutCommitted: Boolean(row?.loadout_committed),
  committedAt: row?.committed_at ?? undefined,
  version: Number(row?.version ?? 1),
});

export function useOnboarding(userId: string | undefined, reportSyncError: (msg: string) => void) {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);

  const hydrateOnboarding = (data: DbOnboardingRow | null) => {
    setOnboardingState(data ? mapOnboardingRow(data) : DEFAULT_ONBOARDING_STATE);
  };

  const commitLoadout = () => {
    const next = {
      ...onboardingState,
      loadoutCommitted: true,
      committedAt: new Date().toISOString(),
    };
    setOnboardingState(next);

    if (!userId) return;

    void supabase
      .from('onboarding_states')
      .upsert(
        {
          user_id: userId,
          loadout_committed: true,
          committed_at: next.committedAt,
          version: next.version,
        },
        { onConflict: 'user_id' },
      )
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to commit onboarding loadout: ${error.message}`);
      });
  };

  const resetLoadoutCommit = () => {
    const next = {
      ...onboardingState,
      loadoutCommitted: false,
      committedAt: undefined,
    };
    setOnboardingState(next);

    if (!userId) return;

    void supabase
      .from('onboarding_states')
      .upsert(
        {
          user_id: userId,
          loadout_committed: false,
          committed_at: null,
          version: next.version,
        },
        { onConflict: 'user_id' },
      )
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to reset onboarding loadout: ${error.message}`);
      });
  };

  const reset = () => setOnboardingState(DEFAULT_ONBOARDING_STATE);

  return { onboardingState, commitLoadout, resetLoadoutCommit, hydrateOnboarding, reset };
}
