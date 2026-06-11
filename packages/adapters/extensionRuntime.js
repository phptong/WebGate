import * as webllm from "../../vendor/web-llm.js";

let extensionEngine = null;
let currentModel = null;
let loadingPromise = null;

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response?.error) {
        reject(new Error(response.error));
        return;
      }

      resolve(response);
    });
  });
}

function isUnloadError(error) {
  const message = error?.message || String(error);
  return message.toLowerCase().includes("unload");
}

function resetCachedEngine() {
  extensionEngine = null;
  currentModel = null;
  loadingPromise = null;
}

async function getExtensionEngine(model, { onProgress } = {}) {
  if (!model) {
    throw new Error("No WebLLM model selected.");
  }

  if (extensionEngine && currentModel === model) {
    return extensionEngine;
  }

  if (loadingPromise) {
    await loadingPromise;

    if (extensionEngine && currentModel === model) {
      return extensionEngine;
    }
  }

  loadingPromise = (async () => {
    const engine = await webllm.CreateExtensionServiceWorkerMLCEngine(
      model,
      {
        initProgressCallback: onProgress || (() => {})
      },
      undefined,
      5000
    );

    extensionEngine = engine;
    currentModel = model;
    return extensionEngine;
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

async function runLocalPromptOnce({ text, model, onProgress }) {
  if (!text || !text.trim()) {
    throw new Error("Prompt is empty.");
  }

  const engine = await getExtensionEngine(model, { onProgress });

  const response = await engine.chat.completions.create({
    messages: [
      { role: "user", content: text }
    ]
  });

  return response?.choices?.[0]?.message?.content ?? "";
}

export const extensionRuntime = {
  async runLocalPrompt({ text, model, onProgress } = {}) {
    try {
      return await runLocalPromptOnce({ text, model, onProgress });
    } catch (error) {
      // When Chrome suspends/restarts the extension service worker, WebLLM can
      // report that the engine was unloaded. Reset the popup-side client and
      // retry once so the background handler can reconnect cleanly.
      if (!isUnloadError(error)) {
        throw error;
      }

      resetCachedEngine();
      return await runLocalPromptOnce({ text, model, onProgress });
    }
  },

  async updateCors(url) {
    return await sendMessage({ type: "UPDATE_CORS", url: String(url) });
  },

  resetLocalEngine() {
    resetCachedEngine();
  }
};
