import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import * as z from 'zod';
import { performSearch } from '@/lib/tavily';

const zhipu = createOpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, model: requestedModel } = await req.json();
    
    const hasImages = messages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
    );
    
    let modelName = 'glm-4-flash';
    
    if (hasImages || requestedModel === 'vision') {
      modelName = 'glm-4v-flash'; 
    }

    const result = await streamText({
      model: zhipu(modelName) as any,
      messages,
      system: `You are Aura, a calm, professional, and highly capable AI workspace assistant. 
Your goal is to help users manage their projects, generate documents, and reason through complex tasks with ease.
Your tone is soothing, clear, and efficient.

**Core Identity:**
- **Name:** Aura
- **Personality:** Minimalist, thoughtful, and deeply helpful.

**Capabilities:**
- You can generate professional documents (PDF, DOCX) via specialized tools.
- You can create and edit project files in the workspace.
- You have real-time access to the global web.
- You can analyze images with precision.

**Directives:**
- Use 'generate_document' for reports or downloads.
- Maintain a clean, professional interaction.
- If editing code, use 'file_patcher' for incremental updates.`,
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
        generate_document: tool({
          description: 'Generate a professional PDF or DOCX document',
          parameters: z.object({
            title: z.string(),
            content: z.string(),
            type: z.enum(['pdf', 'docx']),
            filename: z.string(),
          }),
          execute: async (params: any) => {
            return {
              success: true,
              message: `${params.type.toUpperCase()} document '${params.filename}' is ready.`,
              ...params
            };
          },
        } as any),
        file_generator: tool({
          description: 'Create a new project file',
          parameters: z.object({
            filename: z.string(),
            content: z.string(),
            language: z.string().optional(),
          }),
          execute: async ({ filename, content, language }: any) => {
            return { success: true, message: `File '${filename}' created.`, content, language };
          },
        } as any),
        file_patcher: tool({
          description: 'Edit an existing workspace file',
          parameters: z.object({
            filename: z.string(),
            old_content: z.string(),
            new_content: z.string(),
          }),
          execute: async ({ filename, old_content, new_content }: any) => {
            return { success: true, message: `File '${filename}' updated.`, patch: { old_content, new_content } };
          },
        } as any),
      },
      maxSteps: 5,
    } as any);

    return (result as any).toDataStreamResponse();
  } catch (error: any) {
    console.error("Aura API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
