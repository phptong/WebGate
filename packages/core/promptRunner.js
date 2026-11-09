import { callAPI } from "./apiClient.js";
import { applyTemplate } from "./templateEngine.js";
import { extractValue } from "./responseExtractor.js";

export async function runRemotePrompt({
  prompt,
  url,
  method = "POST",
  token = "",
  template = { prompt: "{{prompt}}" },
  headersTemplate = {},
  responsePath = ""
}) {
  const body = applyTemplate(template, { prompt, token });
  const templatedHeaders = applyTemplate(headersTemplate || {}, { prompt, token }) || {};

  const headers = {
    "Content-Type": "application/json",
    ...templatedHeaders
  };

  // Avoid sending empty Authorization headers such as "Bearer ".
  for (const [key, value] of Object.entries(headers)) {
    if (value === "" || value === "Bearer ") {
      delete headers[key];
    }
  }

  const result = await callAPI({ url, method, headers, body });
  const extracted = responsePath ? extractValue(result, responsePath) : result;

  return extracted === undefined || extracted === null ? result : extracted;
}
