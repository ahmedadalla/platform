import { IAIProvider, AIProviderConfig } from './types';
import { GeminiProvider } from './providers/geminiProvider';
import { OpenAIProvider } from './providers/openAIProvider';
import { OpenRouterProvider } from './providers/openRouterProvider';
import { config } from '../config';

export class AIRouter {
  static getProvider(companyConfig: {
    aiProvider: string;
    aiApiKey?: string | null;
    aiModel?: string | null;
    aiCustomBaseUrl?: string | null;
  }): IAIProvider {
    const providerType = (companyConfig.aiProvider || 'gemini').toLowerCase();
    
    // Determine which API key to use (Company-specific override or System Default)
    let apiKey = companyConfig.aiApiKey;
    if (!apiKey) {
      if (providerType === 'gemini') {
        apiKey = config.systemDefaultAI.geminiKey;
      } else if (providerType === 'openai') {
        apiKey = config.systemDefaultAI.openaiKey;
      } else if (providerType === 'openrouter') {
        apiKey = config.systemDefaultAI.openrouterKey;
      }
    }

    if (!apiKey) {
      console.warn(`[AIRouter] No API key found for provider '${providerType}'. Returning Mock/Demo provider.`);
      return new DemoFallbackProvider();
    }

    switch (providerType) {
      case 'openai':
        return new OpenAIProvider(apiKey, companyConfig.aiModel || 'gpt-4o-mini');
      case 'openrouter':
        return new OpenRouterProvider(
          apiKey, 
          companyConfig.aiModel || 'meta-llama/llama-3.3-70b-instruct',
          companyConfig.aiCustomBaseUrl || undefined
        );
      case 'gemini':
      default:
        return new GeminiProvider(apiKey, companyConfig.aiModel || 'gemini-1.5-flash');
    }
  }
}

/**
 * Fallback provider when no live API key is set yet,
 * enabling immediate testing and simulated order placing.
 */
class DemoFallbackProvider implements IAIProvider {
  async chat(messages: any[], tools?: any[]): Promise<any> {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content?.toLowerCase() || '';
    
    // Check if user is asking to order something
    if (lastUserMessage.includes('order') || lastUserMessage.includes('want') || lastUserMessage.includes('pizza') || lastUserMessage.includes('burger')) {
      return {
        text: "I would be happy to place that order for you! Let me confirm the details and create your order ticket.",
        toolCalls: [
          {
            name: 'create_order',
            args: {
              items: [{ name: 'Margherita Pizza', quantity: 1, price: 12.99 }],
              customerName: 'Valued Customer',
              deliveryAddress: '123 Main Street',
              notes: 'Simulated Order'
            }
          }
        ]
      };
    }

    return {
      text: "👋 Hello! Welcome to our store. How can I assist you today? You can ask about our menu, delivery options, or place an order directly with me!"
    };
  }
}
