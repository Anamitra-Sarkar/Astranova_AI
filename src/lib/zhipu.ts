import axios from 'axios';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;

export async function chatStream(messages: any[]) {
  if (!ZHIPU_API_KEY) {
    throw new Error("ZHIPU_API_KEY is not set.");
  }

  // Zhipu AI API endpoint (v4)
  const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  try {
    const response = await axios.post(url, {
      model: "glm-4",
      messages: messages,
      stream: true,
    }, {
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    return response.data;
  } catch (error) {
    console.error("Zhipu AI chat error:", error);
    throw error;
  }
}

// Non-streaming version for titles etc.
export async function chatCompletion(messages: any[]) {
  if (!ZHIPU_API_KEY) {
    throw new Error("ZHIPU_API_KEY is not set.");
  }

  const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  try {
    const response = await axios.post(url, {
      model: "glm-4",
      messages: messages,
      stream: false,
    }, {
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Zhipu AI chat error:", error);
    throw error;
  }
}

export async function generateTitle(firstMessage: string) {
  const prompt = [
    { role: 'system', content: 'Create a concise, poetic, and intriguing title (3-5 words max) for the user\'s query. Respond with ONLY the title.' },
    { role: 'user', content: firstMessage }
  ];
  return await chatCompletion(prompt);
}
