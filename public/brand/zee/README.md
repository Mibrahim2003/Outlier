# Zee the Outlier — Outlier brand mascot

Zee is a data point that escaped the bell curve. He is drawn as a yellow square
(`#ffde59`, the primary-container accent) with a 6px ink border, a hard `+8/+8`
offset shadow, and a magenta dot on a dashed string that follows him everywhere —
the spot on the curve he left behind.

## Lore

Zee was born dead-center of the bell curve: row 47 of a marksheet nobody read,
grade C, perfectly, invisibly average. One semester he looked at the curve from
the inside and decided average was a choice. He studied the weightages, found his
weak topics, and climbed the distribution one standard deviation at a time until
he walked clean off the right tail. Now he lives at +2σ and refuses to come down.
The dashed dot above his head is his old seat on the curve — he keeps it tied to
him so he never forgets where "average" is, and never goes back. He shows up
wherever a student is about to settle for the mean.

## Personality

- Blunt, competitive, loyal. A hype-man with a calculator.
- Allergic to the word "average". Physically recoils at "good enough".
- Celebrates a quiz win like a final. Smug about it, but he earns it.
- Secretly nervous on results day, just like everyone (see `zee-cooked.svg`).
- Speaks in short declaratives: "Average is a choice." · "The curve is not your
  friend. Beat it." · "See you at +2σ." · "Weights first. Panic never."

## Files

| File | Use |
| --- | --- |
| `zee-character-sheet.svg` | Master reference: hero, 6 expressions, 6 poses, palette, build rules |
| `zee-locked-in.svg` | Default / neutral. Site headers, avatars, watermark |
| `zee-hyped.svg` | Wins, streaks, grade-went-up posts |
| `zee-smug.svg` | Cohort-comparison content, "beat the class avg" |
| `zee-cooked.svg` | Exam-week memes, error/empty states |
| `zee-study.svg` | Study-plan, weak-topic, revision content |
| `zee-dub.svg` | Trophy pose. Milestones, semester results, launch posts |
| `zee-fuel-up.svg` | Coffee break. "No tasks today" empty states |
| `zee-big-brain.svg` | Thinking. AI insight / analysis content |
| `zee-trend-spotter.svg` | Pointing at rising arrow. Cohort standing, growth content |
| `zee-pencil.svg` | Pencil raised, answer sheet ready. Quiz/assignment empty states |
| `zee-on-curve.svg` | The lore in one frame: Zee floating above +2σ, dot at the mean. Class Standing card (landscape — render wider than portrait variants) |

In-app usage goes through `src/components/ui/ZeeMascot.tsx` — do not hand-drop
`<img>` tags.

All cutouts are transparent-background SVG, `viewBox 0 0 240 230` (dub: 250 wide),
scale to any size.

## Build rules (keep him on-model)

- Body: 140×140 square, fill `#ffde59`, stroke `#1A1A1A` at 6px. Never rounded.
- Shadow: solid ink rect offset +8/+8 behind the body. No blur, ever.
- Limbs: 12px ink strokes, `stroke-linecap="square"`.
- The dot: magenta `#a8275a` circle on a 3px dashed ink line, top-right.
  The dot goes where Zee goes — drop it only when a prop occupies that corner.
- Accents only from the theme palette: magenta `#a8275a`, teal `#006761`,
  blue `#a2d9f9`, cream `#FFF6E3`.
- No gradients, no soft shadows, no outlines thinner than 3px.
