export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: {
    type: string;
    properties?: Record<string, AIToolProperty>;
    required?: string[];
  };
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, AIToolProperty>;
    required?: string[];
  };
}

export interface AIToolCall {
  name: string;
  args: any;
}

export interface AIChatResponse {
  text?: string;
  toolCalls?: AIToolCall[];
}

export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'openrouter';
  apiKey?: string;
  model?: string;
  customBaseUrl?: string;
  temperature?: number;
}

export interface IAIProvider {
  chat(
    messages: ChatMessage[],
    tools?: AIToolDefinition[]
  ): Promise<AIChatResponse>;
}
