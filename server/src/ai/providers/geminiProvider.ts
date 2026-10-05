import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider, ChatMessage, AIToolDefinition, AIChatResponse } from '../types';

export class GeminiProvider implements IAIProvider {
  private genAI: GoogleGenerativeAI;
  private primaryModel: string;
  private fallbackModels: string[] = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  constructor(apiKey: string, modelName = 'gemini-3.1-flash-lite') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.primaryModel = this.normalizeModelName(modelName);
  }

  private normalizeModelName(name?: string | null): string {
    if (!name) return 'gemini-3.1-flash-lite';
    const trimmed = name.trim();
    // Normalize deprecated or mistyped model names
    if (trimmed.includes('2.8') || trimmed.includes('1.5') || trimmed.includes('2.0') || trimmed.includes('2.5')) {
      return 'gemini-3.1-flash-lite';
    }
    return trimmed;
  }

  async chat(messages: ChatMessage[], tools?: AIToolDefinition[]): Promise<AIChatResponse> {
    const modelsToTry = [this.primaryModel, ...this.fallbackModels.filter(m => m !== this.primaryModel)];
    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      try {
        return await this.executeChat(currentModel, messages, tools);
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiProvider] Model '${currentModel}' failed (${err.message}). Trying fallback if available...`);
      }
    }

    throw new Error(`All Gemini models failed: ${lastError?.message || 'Unknown error'}`);
  }

  private async executeChat(modelName: string, messages: ChatMessage[], tools?: AIToolDefinition[]): Promise<AIChatResponse> {
    const systemMessage = messages.find(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    const geminiTools = tools && tools.length > 0 ? [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters as any,
      }))
    }] : undefined;

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemMessage ? systemMessage.content : undefined,
      tools: geminiTools,
    });

    // Convert history for Gemini
    const contents = nonSystemMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const result = await model.generateContent({ contents });
    const response = result.response;

    let textContent: string | undefined;
    try {
      textContent = response.text();
    } catch {
      textContent = undefined;
    }

    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      return {
        text: textContent,
        toolCalls: functionCalls.map(fc => ({
          name: fc.name,
          args: fc.args,
        })),
      };
    }

    return {
      text: textContent,
    };
  }
}
