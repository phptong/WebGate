# WebGate

This version is **extension-first, web-ready**.

The Chrome Extension is still the current main product surface, but the Web App now has a browser-side WebLLM MVP. The WebLLM code is shared through `packages/local-llm`, so the extension and web app can gradually converge without rewriting the core logic.

## Project Structure

```txt
WebGate/
  manifest.json                  # Load this root folder as the Chrome extension
  apps/
    extension/
      popup.html
      popup.js
      background.js
    web/
      index.html
      src/main.js
  packages/
    core/
      apiClient.js
      presets.js
      promptRunner.js
      responseExtractor.js
      templateEngine.js
    local-llm/
      models.js
      webllmClient.js
    adapters/
      extensionRuntime.js
      extensionStorage.js
      webRuntime.js
      webStorage.js
  server/
    main.py
    requirements.txt
  vendor/
    web-llm.js
```

## Current Goal

```txt
Web-ready architecture: yes
Chrome Extension: still the most complete product entry
Web App: now supports both Flask/Ollama and browser WebLLM MVP
Shared local LLM code: packages/local-llm/webllmClient.js
```

## Run the Chrome Extension

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click **Load unpacked**.
4. Select the project root folder: `WebGate`.

The root folder is used because `manifest.json` points to files under `apps/extension`, while shared code lives under `packages`.

## Run the Flask/Ollama Server

Start Ollama first, then start the WebGate Flask server:

```bash
ollama serve
```

In another terminal:

```bash
cd server
pip install -r requirements.txt
python main.py
```

The Web App default server URL is:

```txt
http://127.0.0.1:5000/prompt
```

You can test the server directly by opening:

```txt
http://127.0.0.1:5000/health
```

If the Web App shows `Failed to fetch`, it usually means the Flask server is not running, the URL is wrong, or the browser blocked the local cross-origin request.

## Run the Web App

Serve the project root as a static site, then open the web app:

```bash
python -m http.server 8080
```

Then visit:

```txt
http://localhost:8080/apps/web/index.html
```

Do not open `apps/web/index.html` directly with `file://`, because browser ES modules and WebLLM model loading need an HTTP/HTTPS origin. `localhost` is fine for WebGPU testing.

## WebLLM Notes

The Web App has a **Browser WebLLM** tab.

Requirements:

```txt
Recent Chrome or Edge browser
WebGPU available in the browser
Open the app from http://localhost or HTTPS
Enough RAM/VRAM for the selected model
```

Recommended first model:

```txt
Llama-3.2-1B-Instruct-q4f16_1-MLC
```

The first run can take a while because WebLLM downloads and caches model files locally. Smaller models are better for testing.

## Important Architecture Rule

Do not put Chrome-specific APIs inside `packages/core`.

Keep these inside `apps/extension` or `packages/adapters`:

```js
chrome.runtime
chrome.storage
chrome.declarativeNetRequest
```

Web-only APIs such as `localStorage` should stay inside web adapters or web app files.


## Fix note: Extension WebLLM lifecycle

Version 1.1.1 uses WebLLM's Chrome Extension service-worker bridge for local inference:

- `apps/extension/background.js` creates `ExtensionServiceWorkerMLCEngineHandler` on `chrome.runtime.onConnect`.
- `packages/adapters/extensionRuntime.js` creates the popup-side client with `CreateExtensionServiceWorkerMLCEngine`.
- This avoids calling `CreateMLCEngine()` directly inside the Manifest V3 background service worker, which can be suspended by Chrome during long model loading/generation.

If you see stale extension behavior after replacing files, open `chrome://extensions`, click **Reload** on this extension, then reopen the popup.
## Extension API presets

The Extension URL/API tab currently keeps only three choices: Custom, OpenAI, and Ollama. Additional providers can be re-added later if needed.



## Web App recommended local mode

For the Web Ollama tab, the most reliable mode is to let Flask serve both the Web UI and `/prompt` on the same origin:

```bash
cd server
pip install -r requirements.txt
python main.py
```

Then open:

```txt
http://127.0.0.1:5000/apps/web/index.html
```

In the Web page, keep Server URL as:

```txt
/prompt
```

This avoids cross-port localhost fetch/CORS/private-network issues.
