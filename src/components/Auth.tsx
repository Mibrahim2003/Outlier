import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { playSound } from '../utils/sound';

export function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/post-auth` }
    });
    
    if (error) {
      setAuthError(error.message);
      playSound('error');
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    
    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
      
    if (error) {
      setAuthError(error.message);
      playSound('error');
      setIsLoading(false);
    } else {
      setIsLoading(false);
      navigate('/post-auth');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-space">
      
      {/* Left Column: Branding (Hot Pink) */}
      <div className="w-full lg:w-1/2 bg-[#A8275A] border-b-4 lg:border-b-0 lg:border-r-4 border-black flex flex-col justify-center p-8 lg:p-20 relative overflow-hidden h-[30vh] lg:h-auto">
        <div className="absolute top-8 left-8">
          <button 
            onClick={() => navigate('/')}
            className="text-white hover:opacity-80 transition-opacity font-bold tracking-tight uppercase border-b-2 border-white"
          >
            ← Back to Origin
          </button>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-6xl lg:text-9xl font-black text-white leading-[0.85] tracking-tighter uppercase break-words">
            Join<br />Outlier
          </h1>
          <p className="mt-6 text-white text-lg lg:text-2xl font-bold uppercase tracking-widest opacity-80 max-w-md">
            The Industrial Archive for Academic Dominance.
          </p>
        </div>
        
        {/* Subtle grid pattern overlay for raw technical texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Right Column: Auth Form (Electric Yellow) */}
      <div className="w-full lg:w-1/2 bg-[#FFDE59] flex items-center justify-center p-6 lg:p-20 min-h-[70vh] lg:min-h-screen relative">
        <div className="w-full max-w-md bg-white border-4 border-black p-8 shadow-[8px_8px_0px_#1A1A1A]">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">
            {isLogin ? 'Initiate Session' : 'Establish Record'}
          </h2>

          {authError && (
            <div className="mb-6 p-4 bg-[#b02500] text-[#ffefec] border-4 border-black font-bold uppercase tracking-wider text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{authError}</p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border-4 border-black p-4 mb-6 flex items-center justify-center gap-3 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#1A1A1A] transition-all disabled:opacity-50 disabled:hover:transform-none disabled:hover:shadow-none"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="font-bold uppercase tracking-wider text-black">Sign in with Google</span>
          </button>

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t-4 border-black"></div>
            <span className="shrink-0 px-4 font-black uppercase text-xl">OR</span>
            <div className="flex-grow border-t-4 border-black"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase tracking-wider">Operator Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-black" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border-4 border-black p-3 pl-12 font-medium focus:outline-none focus:bg-[#FFF6E3] focus:shadow-[4px_4px_0px_#A8275A] transition-all"
                  placeholder="ID@outlier.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold uppercase tracking-wider">Access Code</label>
                {isLogin && (
                  <button type="button" className="text-xs font-bold uppercase tracking-wider text-[#A8275A] hover:underline">
                    Forgot Key?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-black" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border-4 border-black p-3 pl-12 font-medium focus:outline-none focus:bg-[#FFF6E3] focus:shadow-[4px_4px_0px_#A8275A] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white border-4 border-black p-4 mt-8 flex items-center justify-center gap-3 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#1A1A1A] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : (
                <>
                  <span className="font-bold uppercase tracking-wider text-xl">Enter Forge</span>
                  <ArrowRight className="w-6 h-6 text-white" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold uppercase tracking-wider hover:underline"
            >
              {isLogin ? "No record? Create one." : "Already an operator? Log in."}
            </button>
          </div>
        </div>
        
        {/* Decorative blueprint lines */}
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <p className="font-black uppercase text-[#A8275A] text-opacity-30 tracking-widest text-sm text-right">SEC-01<br/>AUTH PROTOCOL</p>
        </div>
      </div>
    </div>
  );
}
