import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { OnboardingState } from '../../types';
import { DbOnboardingRow } from '../db-types';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  loadoutCommitted: false,
  version: 1,
};

export const mapOnboardingRow = (row: DbOnboardingRow): OnboardingState => ({
  loadoutCommitted: Boolean(row?.loadout_committed),
  committedAt: row?.committed_at ?? undefined,
  version: Number(row?.version ?? 1),
});

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: onboardingState = DEFAULT_ONBOARDING_STATE, isLoading } = useQuery({
    queryKey: ['onboarding', userId],
    queryFn: async () => {
      if (!userId) return DEFAULT_ONBOARDING_STATE;
      const { data, error } = await supabase.from('onboarding_states').select('*').eq('user_id', userId).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? mapOnboardingRow(data) : DEFAULT_ONBOARDING_STATE;
    },
    enabled: !!userId,
  });

  const commitLoadoutMutation = useMutation({
    mutationFn: async () => {
      const next = {
        loadoutCommitted: true,
        committedAt: new Date().toISOString(),
        version: onboardingState.version,
      };
      const { error } = await supabase.from('onboarding_states').upsert({
        user_id: userId!,
        loadout_committed: next.loadoutCommitted,
        committed_at: next.committedAt,
        version: next.version,
      }, { onConflict: 'user_id' });
      if (error) throw error;
      return next;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['onboarding', userId] });
      const previous = queryClient.getQueryData(['onboarding', userId]);
      queryClient.setQueryData(['onboarding', userId], {
        ...onboardingState,
        loadoutCommitted: true,
        committedAt: new Date().toISOString(),
      });
      return { previous };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['onboarding', userId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', userId] });
    },
  });

  const resetLoadoutCommitMutation = useMutation({
    mutationFn: async () => {
      const next = {
        loadoutCommitted: false,
        version: onboardingState.version,
      };
      const { error } = await supabase.from('onboarding_states').upsert({
        user_id: userId!,
        loadout_committed: next.loadoutCommitted,
        committed_at: null,
        version: next.version,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['onboarding', userId] });
      const previous = queryClient.getQueryData(['onboarding', userId]);
      queryClient.setQueryData(['onboarding', userId], {
        ...onboardingState,
        loadoutCommitted: false,
        committedAt: undefined,
      });
      return { previous };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['onboarding', userId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', userId] });
    },
  });

  return { 
    onboardingState, 
    isLoading,
    commitLoadout: commitLoadoutMutation.mutate, 
    resetLoadoutCommit: resetLoadoutCommitMutation.mutate 
  };
}
