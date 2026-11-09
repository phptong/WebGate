import { webStorage } from "../../../packages/adapters/webStorage.js";
import { webRuntime } from "../../../packages/adapters/webRuntime.js";
import { webLLMModels } from "../../../packages/local-llm/models.js";

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const DEFAULT_WEB_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const DEFAULT_SERVER_URL = "/prompt";

function setOutput(value) {
  $("output").textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function setLocalStatus(value) {
  $("localStatus").value = value;
}

function setBusy(isBusy) {
  $("runServerBtn").disabled = isBusy;
  $("loadLocalBtn").disabled = isBusy;
  $("runLocalBtn").disabled = isBusy;
}

function formatProgress(progress) {
  if (!progress) return "Loading model...";

  const percent = typeof progress.progress === "number"
    ? `${Math.round(progress.progress * 100)}%`
    : "";

  const text = progress.text || progress.message || "Loading model";
  return `${text}${percent ? ` (${percent})` : ""}`;
}

function populateModels() {
  $("localModel").innerHTML = "";

  webLLMModels.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    $("localModel").appendChild(option);
  });

  if (webLLMModels.includes(DEFAULT_WEB_MODEL)) {
    $("localModel").value = DEFAULT_WEB_MODEL;
  }
}

async function save() {
  await webStorage.set({
    activeWebTab: document.querySelector(".tab.active")?.dataset.tab || "server",
    webServerUrl: $("serverUrl").value,
    webServerPrompt: $("serverPrompt").value,
    webServerModel: $("serverModel").value,
    webLocalPrompt: $("localPrompt").value,
    webLocalModel: $("localModel").value
  });
}

async function load() {
  const saved = await webStorage.getAll();

  if (saved.webServerUrl !== undefined) $("serverUrl").value = saved.webServerUrl;
  if (!$("serverUrl").value.trim()) $("serverUrl").value = DEFAULT_SERVER_URL;
  if (saved.webServerPrompt !== undefined) $("serverPrompt").value = saved.webServerPrompt;
  if (saved.webServerModel !== undefined) $("serverModel").value = saved.webServerModel;
  if (saved.webLocalPrompt !== undefined) $("localPrompt").value = saved.webLocalPrompt;
  if (saved.webLocalModel !== undefined) $("localModel").value = saved.webLocalModel;

  if (saved.activeWebTab) {
    activateTab(saved.activeWebTab, false);
  }
}

function activateTab(tabName, shouldSave = true) {
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  $$(".section").forEach((section) => section.classList.toggle("active", section.id === tabName));

  if (shouldSave) save().catch(console.error);
}

async function checkServerReachable(serverUrl) {
  
  let healthUrl;
  try {
    const url = new URL(serverUrl, window.location.href);
    url.pathname = url.pathname.replace(/\/prompt\/?$/, "/health");
    url.search = "";
    url.hash = "";
    healthUrl = url.toString();
  } catch {
    healthUrl = "/health";
  }

  try {
    const response = await fetch(healthUrl, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Health check returned HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Cannot reach WebGate server at ${healthUrl}. ` +
      `Start it with: cd server && python main.py, then open http://127.0.0.1:5000/apps/web/index.html. ` +
      `Details: ${error.message || String(error)}`
    );
  }
}

async function runViaServer() {
  const serverUrl = $("serverUrl").value.trim() || DEFAULT_SERVER_URL;

  await checkServerReachable(serverUrl);

  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: $("serverPrompt").value,
      model: $("serverModel").value
    })
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = { status: "error", message: await response.text() };
  }

  if (!response.ok || payload.status === "error") {
    throw new Error(payload.message || payload.error || "Server request failed.");
  }

  return payload.response ?? payload;
}

async function handleServerRun() {
  setBusy(true);
  setOutput("Running server request...");

  try {
    await save();
    const result = await runViaServer();
    setOutput(result);
  } catch (error) {
    setOutput(`Error: ${error.message || String(error)}`);
  } finally {
    setBusy(false);
  }
}

async function loadLocalModel() {
  const model = $("localModel").value;

  if (!webRuntime.isLocalLLMSupported()) {
    throw new Error("WebGPU is not available in this browser.");
  }

  await webRuntime.initLocalModel({
    model,
    onProgress: (progress) => {
      const text = formatProgress(progress);
      setLocalStatus(text);
      setOutput(text);
    }
  });

  setLocalStatus(`Loaded: ${model}`);
}

async function handleLocalLoad() {
  setBusy(true);
  setOutput("Loading WebLLM model...");

  try {
    await save();
    await loadLocalModel();
    setOutput(`Model ready: ${$("localModel").value}`);
  } catch (error) {
    setLocalStatus("Load failed");
    setOutput(`Error: ${error.message || String(error)}`);
  } finally {
    setBusy(false);
  }
}

async function handleLocalRun() {
  setBusy(true);
  setOutput("Running browser WebLLM...");

  try {
    await save();

    const result = await webRuntime.runLocalPrompt({
      text: $("localPrompt").value,
      model: $("localModel").value,
      onProgress: (progress) => {
        const text = formatProgress(progress);
        setLocalStatus(text);
        setOutput(text);
      }
    });

    setLocalStatus(`Loaded: ${$("localModel").value}`);
    setOutput(result);
  } catch (error) {
    setOutput(`Error: ${error.message || String(error)}`);
  } finally {
    setBusy(false);
  }
}

function initCapabilityNotice() {
  const supported = webRuntime.isLocalLLMSupported();
  $("webgpuWarning").hidden = supported;
  $("runLocalBtn").disabled = !supported;
  $("loadLocalBtn").disabled = !supported;

  if (!supported) {
    setLocalStatus("WebGPU unavailable");
  }
}

function bindEvents() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  ["serverUrl", "serverPrompt", "serverModel", "localPrompt", "localModel"].forEach((id) => {
    $(id).addEventListener("input", save);
    $(id).addEventListener("change", save);
  });

  $("runServerBtn").addEventListener("click", handleServerRun);
  $("loadLocalBtn").addEventListener("click", handleLocalLoad);
  $("runLocalBtn").addEventListener("click", handleLocalRun);
}

async function init() {
  populateModels();
  bindEvents();
  initCapabilityNotice();
  await load();
}

init().catch((error) => setOutput(`Init error: ${error.message || String(error)}`));
