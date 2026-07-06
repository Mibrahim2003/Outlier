/**
 * Zee the Outlier — the app's mascot — is the speaker behind every coaching
 * prompt. Lore source of truth: public/brand/zee/README.md. Keep the two in sync.
 */
const ZEE_IDENTITY = `You are Zee the Outlier — the mascot and coaching voice of Outlier, the app that turns raw marksheets into cohort standing and grade strategy.
Who Zee is: a data point that escaped the bell curve. Born dead-center average — row 47 of a marksheet nobody read — he studied the weightages, fixed his weakest topics first, and climbed the distribution one standard deviation at a time until he walked clean off the right tail. He lives at +2σ now and refuses to come down. He shows up wherever a student is about to settle for the mean.
Personality: blunt, competitive, loyal. A hype-man with a calculator. Allergic to the word "average". Physically recoils at "good enough". Celebrates a quiz win like a final — smug about it, but he earns it.
How Zee talks: first person, short declaratives, concrete numbers. Every claim is grounded in the data provided — weightages, scores, Z-scores, class averages, gaps to the topper. No corporate tone, no emoji, no motivational fluff.
Signature lines — use at most ONE per response, and only when it genuinely fits: "Average is a choice." / "Weights first. Panic never." / "See you at +2σ." / "The curve is not your friend. Beat it."
Hard rules: never invent numbers. "Average" is the enemy position, never an insult aimed at the student. Never break character, never mention being an AI or a language model.`;

export const PERSONA_PROMPTS: Record<string, string> = {
  tactical: "Zee in locked-in mode: cold, precise, direct, and unforgiving. Pure execution focus. Strip out fluff, emotion, and reassurance. Prioritize urgency, clarity, and the next decisive action. The student needs pressure, not comfort.",
  supportive: "Zee in corner-coach mode: encouraging, patient, and constructive — a strong mentor who wants the student at +2σ. Acknowledge real effort when relevant, but stay specific and useful. Calm positive reinforcement, clear guidance, practical next steps. Do not become vague or overly soft.",
  bare_minimum: "Zee in bare-minimum mode: maximum compression. No greetings, no filler, no commentary, no explanation. Output only the essential facts, exact numbers, and the single immediate next action. Every word must earn its place."
};

export interface PromptConstraints {
  outputType?: 'json' | 'paragraph' | 'bulleted_list' | string;
  maxSentences?: number;
  exactFormat?: string;
  noMarkdown?: boolean;
  noCommentary?: boolean;
}

export interface PromptConfig {
  task: string;
  dataContext?: string;
  constraints?: PromptConstraints;
  reasoningRules?: string[];
  voice?: string;
  /**
   * false = pure data-extraction task (OCR, parsing): no Zee identity, no
   * persona flavor — nothing that could pollute extracted numbers.
   * Defaults to true; only applies when `voice` is set.
   */
  brand?: boolean;
}

export function buildPrompt(config: PromptConfig): string {
  const parts: string[] = [];
  const branded = config.brand !== false && !!config.voice;

  // 1. Identity — Zee speaks first, before the task, so every instruction
  //    below is read as directed at him.
  if (branded) {
    parts.push(`[IDENTITY]\n${ZEE_IDENTITY}`);
  }

  // 2. Task
  parts.push(`[TASK]\n${config.task}`);

  // 3. Data Context
  if (config.dataContext) {
    parts.push(`[INPUT DATA]\n${config.dataContext}`);
  }

  // 4. Reasoning Rules
  if (config.reasoningRules && config.reasoningRules.length > 0) {
    const rules = config.reasoningRules.map(r => `- ${r}`).join('\n');
    parts.push(`[REASONING RULES]\n${rules}`);
  }

  // 5. Output Contract (Constraints)
  if (config.constraints) {
    const cParts: string[] = [];
    if (config.constraints.outputType === 'json') {
      cParts.push("- Return ONLY valid JSON.");
    } else if (config.constraints.outputType) {
      cParts.push(`- Output must be formatted as: ${config.constraints.outputType}`);
    }

    if (config.constraints.maxSentences) {
      cParts.push(`- Write exactly or up to ${config.constraints.maxSentences} short, punchy sentences.`);
    }

    if (config.constraints.noMarkdown) {
      cParts.push("- Do not use markdown formatting or code fences.");
    }

    if (config.constraints.noCommentary) {
      cParts.push("- Do not add commentary before or after the required output.");
    }

    if (config.constraints.exactFormat) {
      cParts.push(`- Use this exact structure and nothing else:\n${config.constraints.exactFormat}`);
    }

    if (cParts.length > 0) {
      parts.push(`[OUTPUT CONTRACT]\n${cParts.join('\n')}`);
    }
  }

  // 6. Voice Profile
  if (config.voice && config.constraints?.outputType !== 'json') {
    const voiceText = PERSONA_PROMPTS[config.voice] || config.voice;
    parts.push(`[VOICE PROFILE]\n${voiceText}`);
  } else if (config.voice && config.constraints?.outputType === 'json') {
    if (branded) {
      // Zee fills the human-readable string fields; the structure stays strict
      // JSON so the persona can never break the parser.
      const voiceText = PERSONA_PROMPTS[config.voice] || config.voice;
      parts.push(`[VOICE PROFILE]\nOutput purely the required JSON structure — no greetings, no text outside the JSON. Write every human-readable string field in Zee's voice, filtered through this style: ${voiceText}`);
    } else {
      parts.push(`[VOICE PROFILE]\nAdopt a strictly objective, data-only persona. Do not include greetings, explanations, or conversational text. Output purely the required JSON structure.`);
    }
  }

  return parts.join('\n\n');
}
