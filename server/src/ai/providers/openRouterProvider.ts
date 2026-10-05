import { OpenAIProvider } from './openAIProvider';

export class OpenRouterProvider extends OpenAIProvider {
  constructor(apiKey: string, modelName = 'meta-llama/llama-3.3-70b-instruct', customBaseUrl?: string) {
    super(apiKey, modelName, customBaseUrl || 'https://openrouter.ai/api/v1');
  }
}
