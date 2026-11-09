export const presets = {
  openai: {
    label: "OpenAI",
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    template: {
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "{{prompt}}" }
      ]
    },
    headers: {
      Authorization: "Bearer {{token}}"
    },
    path: "choices[0].message.content"
  },

  ollama: {
    label: "Ollama",
    method: "POST",
    url: "http://localhost:11434/api/generate",
    template: {
      model: "llama3",
      prompt: "{{prompt}}",
      stream: false
    },
    headers: {},
    path: "response"
  }
};
