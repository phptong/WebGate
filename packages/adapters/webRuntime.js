import {
  initWebLLM,
  isWebGPUSupported,
  runLocalPrompt,
  runLocalPromptStream
} from "../local-llm/webllmClient.js";

export const webRuntime = {
  isLocalLLMSupported() {
    return isWebGPUSupported();
  },

  async initLocalModel({ model, onProgress } = {}) {
    return await initWebLLM(model, {
      initProgressCallback: onProgress
    });
  },

  async runLocalPrompt({ text, model, onProgress } = {}) {
    return await runLocalPrompt(text, model, {
      initProgressCallback: onProgress
    });
  },

  async runLocalPromptStream({ text, model, onProgress } = {}) {
    return await runLocalPromptStream(text, model, {
      initProgressCallback: onProgress
    });
  },

  async updateCors() {
    // A normal web page cannot bypass CORS with declarativeNetRequest.
    return null;
  }
};
