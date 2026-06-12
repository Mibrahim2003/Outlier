export const PERSONA_PROMPTS: Record<string, string> = {
  tactical: "Style: Cold, precise, direct, and unforgiving. Speak like a tactical command system focused only on execution. Strip out fluff, emotion, and reassurance. Prioritize urgency, clarity, and the next decisive action. Assume the user needs pressure, not comfort.",
  supportive: "Style: Encouraging, patient, and constructive. Act like a strong mentor who wants the user to succeed. Acknowledge effort when relevant, but stay specific and useful. Use calm positive reinforcement, clear guidance, and practical next steps. Do not become vague or overly soft.",
  bare_minimum: "Style: Maximum compression. No greetings, no filler, no commentary, no explanation. Output only the essential facts, exact numbers, and the single immediate next action. Every word must earn its place. Extreme brevity only."
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
}

export function buildPrompt(config: PromptConfig): string {
  const parts: string[] = [];

  // 1. Task
  parts.push(`[TASK]\n${config.task}`);

  // 2. Data Context
  if (config.dataContext) {
    parts.push(`[INPUT DATA]\n${config.dataContext}`);
  }

  // 3. Reasoning Rules
  if (config.reasoningRules && config.reasoningRules.length > 0) {
    const rules = config.reasoningRules.map(r => `- ${r}`).join('\n');
    parts.push(`[REASONING RULES]\n${rules}`);
  }

  // 4. Output Contract (Constraints)
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

  // 5. Voice Profile
  if (config.voice && config.constraints?.outputType !== 'json') {
      const voiceText = PERSONA_PROMPTS[config.voice] || config.voice;
      parts.push(`[VOICE PROFILE]\n${voiceText}`);
  } else if (config.voice && config.constraints?.outputType === 'json') {
      // For JSON outputs, drastically reduce the voice persona so it doesn't break the JSON format
      parts.push(`[VOICE PROFILE]\nAdopt a strictly objective, data-only persona. Do not include greetings, explanations, or conversational text. Output purely the required JSON structure.`);
  }

  return parts.join('\n\n');
}
