import * as webllm from "../../vendor/web-llm.js";

let engine = null;
let currentModel = null;
let engineLoadingPromise = null;

export function isWebGPUSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.gpu);
}

export function getCurrentWebLLMModel() {
  return currentModel;
}

export async function resetWebLLM() {
  engine = null;
  currentModel = null;
  engineLoadingPromise = null;
}

export async function initWebLLM(model, options = {}) {
  if (!model) {
    throw new Error("No WebLLM model selected.");
  }

  if (!isWebGPUSupported()) {
    throw new Error(
      "WebGPU is not available in this browser. Use a recent Chrome/Edge browser and open the page from http://localhost or https."
    );
  }

  if (engine && currentModel === model) {
    return engine;
  }

  if (engineLoadingPromise) {
    await engineLoadingPromise;

    if (engine && currentModel === model) {
      return engine;
    }
  }

  engineLoadingPromise = (async () => {
    engine = null;
    currentModel = null;

    const createdEngine = await webllm.CreateMLCEngine(model, {
      initProgressCallback: options.initProgressCallback
    });

    if (!createdEngine || !createdEngine.chat) {
      throw new Error("WebLLM engine failed to initialize.");
    }

    engine = createdEngine;
    currentModel = model;

    return engine;
  })();

  try {
    return await engineLoadingPromise;
  } finally {
    engineLoadingPromise = null;
  }
}

export async function runLocalPrompt(text, model, options = {}) {
  if (!text || !text.trim()) {
    throw new Error("Prompt is empty.");
  }

  const activeEngine = await initWebLLM(model, options);

  const response = await activeEngine.chat.completions.create({
    messages: [
      { role: "user", content: text }
    ]
  });

  return response?.choices?.[0]?.message?.content ?? "";
}

export async function runLocalPromptStream(text, model, options = {}) {
  if (!text || !text.trim()) {
    throw new Error("Prompt is empty.");
  }

  const activeEngine = await initWebLLM(model, options);

  return await activeEngine.chat.completions.create({
    messages: [
      { role: "user", content: text }
    ],
    stream: true
  });
}
