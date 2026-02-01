/**
 * LLM (Large Language Model) Configuration
 */

export interface LlmConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export const llmConfig: LlmConfig = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: '', // Set via settings
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: 'You are an interview assistant helping the candidate prepare responses.',
};
