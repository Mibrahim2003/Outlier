/**
 * Zee the Outlier — brand mascot. Assets live in public/brand/zee/ (see its README
 * for lore and on-model rules). Always render Zee through this component so alt
 * text and file paths stay consistent.
 */
const ZEE_VARIANTS = {
  'locked-in': { file: 'zee-locked-in.svg', alt: 'Zee the Outlier, locked in' },
  hyped: { file: 'zee-hyped.svg', alt: 'Zee the Outlier, hyped with star eyes' },
  smug: { file: 'zee-smug.svg', alt: 'Zee the Outlier, smugly ahead of the curve' },
  cooked: { file: 'zee-cooked.svg', alt: 'Zee the Outlier, cooked and sweating' },
  study: { file: 'zee-study.svg', alt: 'Zee the Outlier, reading a book' },
  dub: { file: 'zee-dub.svg', alt: 'Zee the Outlier, holding a trophy' },
  'fuel-up': { file: 'zee-fuel-up.svg', alt: 'Zee the Outlier, relaxing with a coffee' },
  'big-brain': { file: 'zee-big-brain.svg', alt: 'Zee the Outlier, deep in thought' },
  'trend-spotter': { file: 'zee-trend-spotter.svg', alt: 'Zee the Outlier, pointing at a rising trend' },
  pencil: { file: 'zee-pencil.svg', alt: 'Zee the Outlier, pencil ready for the next assessment' },
  'on-curve': { file: 'zee-on-curve.svg', alt: 'Zee the Outlier, floating above the bell curve at plus two sigma' },
} as const;

export type ZeeVariant = keyof typeof ZEE_VARIANTS;

export interface ZeeMascotProps {
  variant: ZeeVariant;
  /** Rendered width/height in px (assets are roughly square). */
  size?: number;
  className?: string;
}

export const ZeeMascot = ({ variant, size = 96, className }: ZeeMascotProps) => {
  const { file, alt } = ZEE_VARIANTS[variant];
  return (
    <img
      src={`/brand/zee/${file}`}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={`object-contain select-none ${className ?? ''}`}
    />
  );
};
