/**
 * Centralized utility for mapping course impact levels to Neo-Brutalist Tailwind styles.
 */

export type ImpactLevel = 'heavy' | 'standard' | 'minimal';

/** Derive a course's impact level from its credit hours. */
export const getImpactLevelForCredits = (credits: number): ImpactLevel => {
  if (credits >= 4) return 'heavy';
  if (credits === 3) return 'standard';
  return 'minimal';
};

export const getImpactStyles = (impactLevel: ImpactLevel = 'standard'): string => {
  if (impactLevel === 'heavy') return 'bg-secondary-container text-white border-on-background';
  if (impactLevel === 'standard') return 'bg-primary-container text-on-background border-on-background';
  return 'bg-white text-on-background border-on-background';
};

export type ThemeColor = 'blue' | 'yellow' | 'purple' | 'pink' | 'green';

export const getThemeBgClass = (theme?: ThemeColor): string => {
  switch (theme) {
    case 'blue': return 'bg-[#a2d9f9]';
    case 'yellow': return 'bg-[#fff1c9]';
    case 'purple': return 'bg-[#d7bcf5]';
    case 'pink': return 'bg-[#f5c3bb]';
    case 'green': return 'bg-[#daf5bc]';
    default: return 'bg-[#fff1c9]';
  }
};

export const getThemeTextClass = (_theme?: ThemeColor): string => {
  return 'text-ink';
};

export const getThemeBorderClass = (theme?: ThemeColor): string => {
  switch (theme) {
    case 'blue': return 'border-[#a2d9f9]';
    case 'yellow': return 'border-[#fff1c9]';
    case 'purple': return 'border-[#d7bcf5]';
    case 'pink': return 'border-[#f5c3bb]';
    case 'green': return 'border-[#daf5bc]';
    default: return 'border-[#fff1c9]';
  }
};

export const getThemeBottomBorderClass = (theme?: ThemeColor): string => {
  switch (theme) {
    case 'blue': return 'border-b-[#a2d9f9]';
    case 'yellow': return 'border-b-[#fff1c9]';
    case 'purple': return 'border-b-[#d7bcf5]';
    case 'pink': return 'border-b-[#f5c3bb]';
    case 'green': return 'border-b-[#daf5bc]';
    default: return 'border-b-[#fff1c9]';
  }
};
