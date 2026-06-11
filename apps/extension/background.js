import { ExtensionServiceWorkerMLCEngineHandler } from "../../vendor/web-llm.js";

let webLLMHandler = null;

/**
 * WebLLM Chrome Extension bridge.
 *
 * Important:
 * Do not call CreateMLCEngine() directly inside a Manifest V3 background
 * service worker. MV3 service workers can be suspended by Chrome while the
 * model is loading or generating, which may leave the engine in an unloaded
 * state. WebLLM provides ExtensionServiceWorkerMLCEngineHandler specifically
 * for this environment.
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "web_llm_service_worker") {
    return;
  }

  if (!webLLMHandler) {
    webLLMHandler = new ExtensionServiceWorkerMLCEngineHandler(port);
  } else {
    webLLMHandler.setPort(port);
  }

  port.onMessage.addListener(webLLMHandler.onmessage.bind(webLLMHandler));
});

async function updateCorsBypass(userUrl) {
  if (!userUrl) {
    throw new Error("Missing URL for CORS update.");
  }

  const url = new URL(String(userUrl));
  const filter = `${url.origin}/*`;

  const rule = {
    id: 1001,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "origin", operation: "remove" }
      ],
      responseHeaders: [
        { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
        { header: "Access-Control-Allow-Methods", operation: "set", value: "GET, POST, OPTIONS" },
        { header: "Access-Control-Allow-Headers", operation: "set", value: "*" }
      ]
    },
    condition: {
      urlFilter: filter,
      resourceTypes: ["xmlhttprequest"]
    }
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1001],
    addRules: [rule]
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_CORS") {
    updateCorsBypass(message.url)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error("CORS update failed:", error);
        sendResponse({ error: error.message || String(error) });
      });

    return true;
  }

  if (message.type === "PING") {
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
