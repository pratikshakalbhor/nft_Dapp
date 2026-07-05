/**
 * AI Service — Direct fetch to Anthropic Claude API
 * No SDK needed — avoids Node.js module issues in browser/webpack.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function callClaude(prompt, maxTokens = 500) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    throw new Error("Anthropic API key not configured. Add REACT_APP_ANTHROPIC_API_KEY to your .env file.");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `API request failed with status ${response.status}`
    );
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
