import { presets } from "../../packages/core/presets.js";
import { safeJSONParse } from "../../packages/core/templateEngine.js";
import { runRemotePrompt } from "../../packages/core/promptRunner.js";
import { webLLMModels } from "../../packages/local-llm/models.js";
import { extensionRuntime } from "../../packages/adapters/extensionRuntime.js";
import { extensionStorage } from "../../packages/adapters/extensionStorage.js";

const trackedInputs = [
  "localPrompt",
  "modelSelect",
  "urlPrompt",
  "urlField",
  "method",
  "tokenField",
  "templateField",
  "headersField",
  "responsePath",
  "preset"
];

const $ = (id) => document.getElementById(id);

function setOutput(value) {
  const output = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  $("output").textContent = output;
}

function formatWebLLMProgress(progress) {
  if (!progress) return "Loading WebLLM model...";

  const percentage = typeof progress.progress === "number"
    ? ` ${(progress.progress * 100).toFixed(1)}%`
    : "";

  return `${progress.text || "Loading WebLLM model..."}${percentage}`.trim();
}

function setActiveTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  document.querySelectorAll(".section").forEach((section) => {
    section.classList.toggle("active", section.id === tabName);
  });
}

async function saveSettings() {
  const data = {};

  for (const id of trackedInputs) {
    const element = $(id);
    if (element) data[id] = element.value;
  }

  data.activeTab = document.querySelector(".tab.active")?.dataset.tab || "url";
  await extensionStorage.set(data);
}

async function loadSettings() {
  const saved = await extensionStorage.getAll();

  for (const id of trackedInputs) {
    if (saved[id] !== undefined && $(id)) {
      $(id).value = saved[id];
    }
  }

  setActiveTab(saved.activeTab || "url");
}

function populateModels() {
  const select = $("modelSelect");
  select.innerHTML = "";

  for (const model of webLLMModels) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    select.appendChild(option);
  }
}

function applyPreset(presetKey) {
  const preset = presets[presetKey];
  if (!preset) return;

  $("method").value = preset.method || "POST";
  $("urlField").value = preset.url || "";
  $("templateField").value = JSON.stringify(preset.template || {}, null, 2);
  $("headersField").value = JSON.stringify(preset.headers || {}, null, 2);
  $("responsePath").value = preset.path || "";
}

function normalizeUrl(input) {
  const raw = input.trim();

  if (!raw) {
    throw new Error("URL is required.");
  }

  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `http://${raw}`;

  return new URL(withProtocol).toString();
}

function getUrlModeConfig() {
  const template = safeJSONParse($("templateField").value);
  if (!template) {
    throw new Error("Body Template is not valid JSON.");
  }

  const headersTemplate = safeJSONParse($("headersField").value, {});
  if (!headersTemplate) {
    throw new Error("Headers is not valid JSON.");
  }

  return {
    prompt: $("urlPrompt").value,
    url: normalizeUrl($("urlField").value),
    method: $("method").value,
    token: $("tokenField").value,
    template,
    headersTemplate,
    responsePath: $("responsePath").value.trim()
  };
}

async function runUrlMode() {
  const config = getUrlModeConfig();

  // Extension-only capability. Web app should use server/proxy instead.
  await extensionRuntime.updateCors(config.url);

  return await runRemotePrompt(config);
}

async function runLocalMode() {
  return await extensionRuntime.runLocalPrompt({
    text: $("localPrompt").value,
    model: $("modelSelect").value,
    onProgress: (progress) => {
      setOutput(formatWebLLMProgress(progress));
    }
  });
}

async function handleRun() {
  const runButton = $("runBtn");
  const activeTab = document.querySelector(".tab.active")?.dataset.tab || "url";
  const startTime = performance.now();

  runButton.disabled = true;
  setOutput("Running...");

  try {
    const result = activeTab === "local" ? await runLocalMode() : await runUrlMode();
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    setOutput(`${typeof result === "string" ? result : JSON.stringify(result, null, 2)}\n\n[${activeTab} execution time: ${elapsed}s]`);
  } catch (error) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.error(error);
    setOutput(`Error: ${error.message || String(error)}\n\n[${activeTab} execution time: ${elapsed}s]`);
  } finally {
    runButton.disabled = false;
  }
}

function bindEvents() {
  for (const id of trackedInputs) {
    const element = $(id);
    if (!element) continue;

    element.addEventListener("input", saveSettings);
    element.addEventListener("change", saveSettings);
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", async () => {
      setActiveTab(tab.dataset.tab);
      await saveSettings();
    });
  });

  $("preset").addEventListener("change", async (event) => {
    applyPreset(event.target.value);
    await saveSettings();
  });

  $("runBtn").addEventListener("click", handleRun);
}

async function init() {
  populateModels();
  bindEvents();
  await loadSettings();
}

init().catch((error) => {
  console.error(error);
  setOutput(`Init error: ${error.message || String(error)}`);
});
