import OpenAI from 'openai';
import { IAIProvider, ChatMessage, AIToolDefinition, AIChatResponse } from '../types';

export class OpenAIProvider implements IAIProvider {
  protected client: OpenAI;
  protected modelName: string;

  constructor(apiKey: string, modelName = 'gpt-4o-mini', baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined,
    });
    this.modelName = modelName;
  }

  async chat(messages: ChatMessage[], tools?: AIToolDefinition[]): Promise<AIChatResponse> {
    try {
      const openAiMessages = messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      const openAiTools = tools && tools.length > 0 ? tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })) : undefined;

      const completion = await this.client.chat.completions.create({
        model: this.modelName,
        messages: openAiMessages,
        tools: openAiTools,
        tool_choice: openAiTools ? 'auto' : undefined,
      });

      const choice = completion.choices[0];
      const message = choice?.message;

      const toolCalls = message?.tool_calls?.map(tc => {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments);
        } catch {
          parsedArgs = {};
        }
        return {
          name: tc.function.name,
          args: parsedArgs,
        };
      });

      return {
        text: message?.content || undefined,
        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (err: any) {
      console.error('[OpenAIProvider] Error generating response:', err.message);
      throw new Error(`OpenAI Error: ${err.message}`);
    }
  }
}
