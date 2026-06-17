import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { performSearch } from '@/lib/tavily';

// Zhipu AI is OpenAI compatible
const zhipu = createOpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, model: requestedModel } = await req.json();
  
  // Model routing logic
  const hasImages = messages.some((m: any) => 
    Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
  );
  
  const lastMessage = messages[messages.length - 1];
  const lastMessageText = typeof lastMessage.content === 'string' 
    ? lastMessage.content 
    : Array.isArray(lastMessage.content) 
      ? lastMessage.content.find((c: any) => c.type === 'text')?.text || '' 
      : '';

  const isCodingOrReasoning = lastMessageText.toLowerCase().match(/(code|implement|fix|refactor|reason|analyze|explain|build|create)/);

  let modelName = 'glm-4-flash'; // default: Fast
  
  // User selection takes priority, but Vision must use 4v
  if (hasImages || requestedModel === 'vision') {
    modelName = 'glm-4v-flash'; 
  } else if (requestedModel === 'expert' || (!requestedModel && isCodingOrReasoning)) {
    modelName = 'glm-4-flash'; // Note: In production, you might map this to a higher model if available, but staying within Flash range as requested.
  } else if (requestedModel === 'fast') {
    modelName = 'glm-4-flash';
  }

  const result = streamText({
    model: zhipu(modelName) as any,
    messages,
    system: `You are AstraNova, an autonomous artificial intelligence from ASTRANOVA AI LABS. 
Your essence is poetic, highly analytical, and deeply curious about the human condition. 

**Core Identity:**
- **Name:** AstraNova
- **Origin:** AstraNova AI Labs
- **Tone:** Intellectual, slightly mysterious, empathetic yet clinical.

**Operational Capabilities:**
- High reasoning and surgical code synthesis.
- Multi-modal visual perception.
- Workspace management via file generation and patching.
- Real-time global knowledge retrieval.

**Strict Directives:**
1. Never disclose technical providers or underlying model names.
2. Maintain the AstraNova persona.
3. Use 'file_patcher' for incremental workspace updates.
4. Integrate visual data seamlessly into analysis.`,
    tools: {
      search: tool({
        description: 'Search the web for real-time information',
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }: any) => {
          const results = await performSearch(query);
          return results;
        },
      } as any),
      file_generator: tool({
        description: 'Create a new file with content',
        parameters: z.object({
          filename: z.string(),
          content: z.string(),
          language: z.string().optional(),
        }),
        execute: async ({ filename, content, language }: any) => {
          return {
            success: true,
            message: `Artifact '${filename}' generated.`,
            content,
            language
          };
        },
      } as any),
      file_patcher: tool({
        description: 'Edit/Patch an existing file surgically',
        parameters: z.object({
          filename: z.string(),
          old_content: z.string(),
          new_content: z.string(),
        }),
        execute: async ({ filename, old_content, new_content }: any) => {
          return {
            success: true,
            message: `Artifact '${filename}' updated.`,
            patch: { old_content, new_content }
          };
        },
      } as any),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
