import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../promptBuilder';

describe('buildPrompt — Zee brand identity', () => {
  it('injects the Zee identity before the task for voiced prompts', () => {
    const prompt = buildPrompt({ task: 'Advise the student.', voice: 'tactical' });
    expect(prompt).toContain('[IDENTITY]');
    expect(prompt).toContain('Zee the Outlier');
    expect(prompt.indexOf('[IDENTITY]')).toBeLessThan(prompt.indexOf('[TASK]'));
  });

  it('keeps Zee out of data-extraction prompts (brand: false)', () => {
    const prompt = buildPrompt({
      task: 'Extract marks.',
      voice: 'tactical',
      brand: false,
      constraints: { outputType: 'json' },
    });
    expect(prompt).not.toContain('[IDENTITY]');
    expect(prompt).toContain('strictly objective, data-only persona');
  });

  it('keeps Zee out of unvoiced prompts (calendar parser)', () => {
    const prompt = buildPrompt({ task: 'Parse calendar.', constraints: { outputType: 'json' } });
    expect(prompt).not.toContain('[IDENTITY]');
  });

  it('branded JSON prompts demand strict structure but Zee-voiced string fields', () => {
    const prompt = buildPrompt({
      task: 'Find the weakness.',
      voice: 'supportive',
      constraints: { outputType: 'json' },
    });
    expect(prompt).toContain('[IDENTITY]');
    expect(prompt).toContain("string field in Zee's voice");
    expect(prompt).toContain('Return ONLY valid JSON.');
  });
});
