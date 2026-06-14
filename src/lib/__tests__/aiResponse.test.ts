import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseAIResponse, extractJsonSnippet } from '../aiResponse';

// Mirrors the real project-feature schemas (scope analysis + milestones).
const ScopeSchema = z.object({ feedback: z.string() }).passthrough();
const MilestoneSchema = z.array(
  z.object({ title: z.string(), daysFromNow: z.number() }).passthrough(),
);

describe('extractJsonSnippet', () => {
  it('pulls a JSON object out of surrounding prose', () => {
    expect(
      extractJsonSnippet('Here is the analysis: {"feedback":"cut scope"} hope it helps'),
    ).toBe('{"feedback":"cut scope"}');
  });

  it('pulls a JSON array out of surrounding prose', () => {
    expect(
      extractJsonSnippet('Sure!\n[{"title":"Design","daysFromNow":3}]\nDone'),
    ).toBe('[{"title":"Design","daysFromNow":3}]');
  });

  it('ignores brackets that appear inside string values', () => {
    const s = '{"feedback":"use [arrays] and nested {objects} carefully"}';
    expect(extractJsonSnippet(s)).toBe(s);
  });

  it('returns null when there is no JSON present', () => {
    expect(extractJsonSnippet('the model refused to answer')).toBeNull();
  });
});

describe('parseAIResponse', () => {
  it('parses a clean JSON object', () => {
    expect(parseAIResponse('{"feedback":"x"}', ScopeSchema)).toEqual({ feedback: 'x' });
  });

  it('parses fenced JSON', () => {
    expect(parseAIResponse('```json\n{"feedback":"x"}\n```', ScopeSchema)).toEqual({ feedback: 'x' });
  });

  // The exact failure the user hit: the project prompts are "talkative", so the
  // model prepends a sentence before the JSON and the old naive JSON.parse threw.
  it('parses JSON wrapped in commentary', () => {
    const res = 'Here is your brutal scope analysis:\n```json\n{"feedback":"cut the extras"}\n```';
    expect(parseAIResponse(res, ScopeSchema)).toEqual({ feedback: 'cut the extras' });
  });

  it('parses a milestone array wrapped in prose', () => {
    const res =
      'Sure, here are 4 milestones: [{"title":"Design","daysFromNow":3},{"title":"Build","daysFromNow":7}]';
    expect(parseAIResponse(res, MilestoneSchema)).toEqual([
      { title: 'Design', daysFromNow: 3 },
      { title: 'Build', daysFromNow: 7 },
    ]);
  });

  it('throws a clear, retryable error on an empty response', () => {
    expect(() => parseAIResponse('', ScopeSchema)).toThrow(/empty response/i);
    expect(() => parseAIResponse('   ', ScopeSchema)).toThrow(/empty response/i);
  });

  it('throws a clear error when the response contains no JSON', () => {
    expect(() => parseAIResponse('the model refused', ScopeSchema)).toThrow(/not valid JSON/i);
  });

  it('throws a clear error when the JSON does not match the schema', () => {
    expect(() => parseAIResponse('{"wrong":"shape"}', MilestoneSchema)).toThrow(/expected format/i);
  });
});
