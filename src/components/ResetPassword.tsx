import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import { playSound } from '../utils/sound';
import { PasswordInput } from './ui';

/**
 * Landing page for Supabase password-recovery links.
 * The email link signs the user in with a recovery session; this page
 * lets them set a new password, then funnels them through /post-auth.
 */
export function ResetPassword() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <LoadingScreen />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      playSound('error');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      playSound('error');
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      playSound('error');
      setIsSaving(false);
    } else {
      playSound('success');
      navigate('/post-auth');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-primary-container p-6 font-space">
      <div className="w-full max-w-md bg-white border-4 border-ink p-8 shadow-[8px_8px_0px_#1A1A1A]">
        {session ? (
          <>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Set a new password</h2>
            <p className="text-sm font-bold uppercase tracking-wider opacity-60 mb-8">
              Set a new password for your account.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-error text-white border-4 border-ink font-bold uppercase tracking-wider text-sm flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-wider">New password</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  showStrength
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold uppercase tracking-wider">Confirm password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-ink text-white border-4 border-ink p-4 mt-4 flex items-center justify-center gap-3 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#1A1A1A] transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <>
                    <span className="font-bold uppercase tracking-wider text-xl">Save password</span>
                    <ArrowRight className="w-6 h-6 text-white" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Link Expired</h2>
            <p className="font-medium mb-8">
              This password reset link is invalid or has expired. Request a fresh one from the sign-in page.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-ink text-white border-4 border-ink p-4 flex items-center justify-center gap-3 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#1A1A1A] transition-all"
            >
              <span className="font-bold uppercase tracking-wider text-xl">Back to Sign In</span>
              <ArrowRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
