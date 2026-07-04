import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { setSoundEnabled } from '../../utils/sound';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: userProfile = null, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      
      return {
        name: data.name,
        registrationNumber: data.registration_number,
        degree: data.degree,
        universityName: data.university_name,
        graduationYear: String(data.graduation_year),
        currentCgpa: Number(data.current_cgpa),
        targetGpa: Number(data.target_gpa),
        semester: data.semester,
        courseCount: Number(data.course_count ?? 0),
        gradingScale: data.grading_scale ?? undefined,
        aiPersona: data.ai_persona || 'tactical',
        autoGenerateInsights: data.auto_generate_insights ?? false,
        soundEnabled: data.sound_enabled ?? true,
      } as UserProfile;
    },
    enabled: !!userId,
  });

  // Keep the app-wide sound mute flag in sync with the user's saved preference.
  useEffect(() => {
    if (userProfile) setSoundEnabled(userProfile.soundEnabled ?? true);
  }, [userProfile]);

  const setUserProfileMutation = useMutation({
    meta: { sound: 'success' },
    mutationFn: async (profile: UserProfile | null) => {
      if (!profile) return; // Currently no deletion logic for profile
      const { error } = await supabase.from('profiles').upsert({
        user_id: userId!,
        name: profile.name,
        registration_number: profile.registrationNumber || '',
        degree: profile.degree,
        university_name: profile.universityName,
        graduation_year: profile.graduationYear,
        current_cgpa: profile.currentCgpa,
        target_gpa: profile.targetGpa,
        semester: profile.semester,
        course_count: profile.courseCount,
        grading_scale: profile.gradingScale,
        ai_persona: profile.aiPersona,
        auto_generate_insights: profile.autoGenerateInsights,
        sound_enabled: profile.soundEnabled,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onMutate: async (newProfile) => {
      await queryClient.cancelQueries({ queryKey: ['profile', userId] });
      const previousProfile = queryClient.getQueryData(['profile', userId]);
      queryClient.setQueryData(['profile', userId], newProfile);
      return { previousProfile };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['profile', userId], context?.previousProfile);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return { 
    userProfile, 
    isLoading,
    setUserProfile: setUserProfileMutation.mutate 
  };
}
