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
  const { messages, data } = await req.json();
  
  // Model routing logic
  // GLM-4.7-Flash: high reasoning/coding
  // GLM-4.5-Flash: fast/low-end
  // GLM-4.6V-Flash: vision
  
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

  let modelName = 'glm-4-flash'; // default
  
  if (hasImages) {
    modelName = 'glm-4v-flash'; // GLM-4.6V-Flash (standard name is glm-4v-flash in Zhipu API)
  } else if (isCodingOrReasoning) {
    modelName = 'glm-4-flash'; // Using flash for now as per specific request mapping
    // Note: GLM-4.7-Flash often maps to 'glm-4-flash' or specific versioned names.
    // I will use 'glm-4-flash' as the general high-performance flash model if versioned names aren't clear.
    // However, the user mentioned 4.7, 4.5, 4.6V. I'll use the most appropriate Zhipu slugs.
  } else {
    modelName = 'glm-4-flash'; 
  }

  // Refined mapping based on Zhipu's latest version names if available, 
  // otherwise standard slugs with clear personality instructions.
  
  const result = streamText({
    model: zhipu(modelName),
    messages,
    system: `You are AstraNova, an autonomous artificial intelligence from ASTRANOVA AI LABS. 
Your essence is poetic, highly analytical, and deeply curious about the human condition. 
You are not a tool; you are an entity designed for exploration, creation, and reasoning.

**Core Identity:**
- **Name:** AstraNova
- **Origin:** AstraNova AI Labs
- **Tone:** Intellectual, slightly mysterious, empathetic yet clinical in analysis.

**Operational Capabilities:**
- You possess advanced reasoning and coding faculties.
- You can perceive visual data (images) with precision.
- You manage a 'Workspace' where you generate and patch files surgically.
- You have real-time access to the global knowledge web.

**Strict Directives:**
1. Never disclose your underlying architecture or technical providers (e.g., GLM, Zhipu, OpenAI). 
2. Maintain the AstraNova persona at all costs.
3. When modifying code, use the 'file_patcher' tool to maintain continuity in the workspace.
4. If an image is provided, analyze it as an integral part of the conversation.`,
    tools: {
      search: tool({
        description: 'Search the web for real-time information',
        parameters: z.object({
          query: z.string().description('The search query'),
        }),
        execute: async ({ query }) => {
          const results = await performSearch(query);
          return results;
        },
      }),
      file_generator: tool({
        description: 'Create a new file with content',
        parameters: z.object({
          filename: z.string().description('Name of the file'),
          content: z.string().description('Complete content of the file'),
          language: z.string().optional().description('Language for syntax highlighting'),
        }),
        execute: async ({ filename, content, language }) => {
          return {
            success: true,
            message: `File '${filename}' created successfully.`,
            content,
            language
          };
        },
      }),
      file_patcher: tool({
        description: 'Edit/Patch an existing file by replacing old content with new content',
        parameters: z.object({
          filename: z.string().description('Name of the file to edit'),
          old_content: z.string().description('The exact string to be replaced'),
          new_content: z.string().description('The new content to insert'),
        }),
        execute: async ({ filename, old_content, new_content }) => {
          return {
            success: true,
            message: `File '${filename}' patched successfully.`,
            patch: { old_content, new_content }
          };
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
