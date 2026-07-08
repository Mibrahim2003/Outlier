import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

// ponytail: 3-tier heuristic (length + character variety), not a crypto strength
// library. Enough to nudge users off "123456"; upgrade to zxcvbn only if product
// wants real entropy scoring.
function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 6) return 0;
  let variety = 0;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) variety++;
  if (/\d/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  if (pw.length >= 12) variety++;
  return Math.min(3, variety) as 0 | 1 | 2 | 3;
}

const STRENGTH = [
  { label: 'Too short', color: '#a8275a' },
  { label: 'Weak', color: '#a8275a' },
  { label: 'Fair', color: '#6c5a00' },
  { label: 'Strong', color: '#006761' },
] as const;

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Render a live strength meter beneath the field (use on new passwords, not login). */
  showStrength?: boolean;
  autoComplete?: string;
}

/**
 * Password field with a show/hide toggle and an optional strength meter,
 * styled to match the neo-brutalist auth inputs. Defaults to type="password".
 */
export function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  showStrength = false,
  autoComplete,
}: PasswordInputProps) {
  const [reveal, setReveal] = useState(false);
  const score = scorePassword(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-ink" />
        </div>
        <input
          type={reveal ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-white border-4 border-ink p-3 pl-12 pr-12 font-medium focus:outline-none focus:bg-background focus:shadow-[4px_4px_0px_#A8275A] transition-all"
          placeholder={placeholder}
          required
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-ink hover:opacity-70"
        >
          {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      {showStrength && value && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3].map((tier) => (
              <div
                key={tier}
                className="h-2 flex-1 border-2 border-ink"
                style={{ background: score >= tier ? STRENGTH[score].color : 'transparent' }}
              />
            ))}
          </div>
          <span
            className="text-xs font-bold uppercase tracking-wider w-16 text-right"
            style={{ color: STRENGTH[score].color }}
          >
            {STRENGTH[score].label}
          </span>
        </div>
      )}
    </div>
  );
}
