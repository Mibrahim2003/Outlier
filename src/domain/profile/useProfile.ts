import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { DbProfileRow } from '../db-types';

export function useProfile(userId: string | undefined, reportSyncError: (msg: string) => void) {
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);

  const hydrateProfile = (data: DbProfileRow | null) => {
    setUserProfileState(
      data
        ? {
            name: data.name,
            registrationNumber: data.registration_number,
            degree: data.degree,
            universityName: data.university_name,
            graduationYear: String(data.graduation_year),
            currentCgpa: Number(data.current_cgpa),
            targetGpa: Number(data.target_gpa),
            semester: data.semester,
            courseCount: Number(data.course_count ?? 0),
          }
        : null,
    );
  };

  const setUserProfile = (profile: UserProfile | null) => {
    setUserProfileState(profile);

    if (!userId || !profile) return;

    void supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          name: profile.name,
          registration_number: profile.registrationNumber || '',
          degree: profile.degree,
          university_name: profile.universityName,
          graduation_year: profile.graduationYear,
          current_cgpa: profile.currentCgpa,
          target_gpa: profile.targetGpa,
          semester: profile.semester,
          course_count: profile.courseCount,
        },
        { onConflict: 'user_id' },
      )
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to save profile: ${error.message}`);
      });
  };

  const reset = () => setUserProfileState(null);

  return { userProfile, setUserProfile, hydrateProfile, reset };
}
