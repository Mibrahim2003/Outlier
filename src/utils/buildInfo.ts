// Real build identity, injected by vite.config.ts at build time (see vite-env.d.ts).
// Replaces the old hand-typed fake version stamps ("v0.9.4", "INIT_SEQUENCE_v0.9").

export const GIT_SHA = __GIT_SHA__;
export const BUILD_DATE = __BUILD_DATE__;

/** e.g. "build a1b2c3d · Jul 2026" — updates every commit, never lies. */
export const buildLabel = (): string => {
  const when = new Date(BUILD_DATE);
  const month = isNaN(when.getTime())
    ? ''
    : ` · ${when.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  return `build ${GIT_SHA}${month}`;
};
