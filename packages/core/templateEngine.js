export function safeJSONParse(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function applyTemplate(template, vars = {}) {
  if (template === undefined || template === null) return template;

  let serialized = JSON.stringify(template);

  for (const [key, value] of Object.entries(vars)) {
    serialized = serialized.replaceAll(`{{${key}}}`, value ?? "");
  }

  return JSON.parse(serialized);
}
