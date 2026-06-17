import axios from 'axios';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function performSearch(query: string) {
  if (!TAVILY_API_KEY) {
    console.warn("Tavily search skipped: API key not found.");
    return null;
  }
  try {
    const response = await axios.post("https://api.tavily.com/search", {
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5
    });
    return response.data;
  } catch (error) {
    console.error("Tavily search failed:", error);
    return null;
  }
}
