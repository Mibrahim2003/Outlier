/**
 * Centralized utility for mapping course impact levels to Neo-Brutalist Tailwind styles.
 */

export type ImpactLevel = 'heavy' | 'standard' | 'minimal';

export const getImpactStyles = (impactLevel: ImpactLevel = 'standard'): string => {
  if (impactLevel === 'heavy') return 'bg-secondary-container text-white border-on-background';
  if (impactLevel === 'standard') return 'bg-primary-container text-on-background border-on-background';
  return 'bg-white text-on-background border-on-background';
};

export type ThemeColor = 'yellow' | 'pink' | 'green' | 'blue';

export const getThemeBgClass = (theme?: ThemeColor): string => {
  switch (theme) {
    case 'pink': return 'bg-secondary';
    case 'green': return 'bg-tertiary';
    case 'blue': return 'bg-[#2563EB]';
    case 'yellow':
    default:
      return 'bg-primary-container';
  }
};

export const getThemeTextClass = (theme?: ThemeColor): string => {
  switch (theme) {
    case 'pink': 
    case 'green': 
    case 'blue': 
      return 'text-white';
    case 'yellow':
    default:
      return 'text-ink';
  }
};

export const getThemeBorderClass = (theme?: ThemeColor): string => {
  switch (theme) {
    case 'pink': return 'border-secondary';
    case 'green': return 'border-tertiary';
    case 'blue': return 'border-[#2563EB]';
    case 'yellow':
    default:
      return 'border-primary-container';
  }
};

export const getThemeBottomBorderClass = (theme?: ThemeColor): string => {
  switch (theme) {
    case 'pink': return 'border-b-secondary';
    case 'green': return 'border-b-tertiary';
    case 'blue': return 'border-b-[#2563EB]';
    case 'yellow':
    default:
      return 'border-b-primary-container';
  }
};
