export function extractValue(source, path) {
  if (!path) return source;

  try {
    return path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .filter(Boolean)
      .reduce((current, key) => current?.[key], source);
  } catch {
    return undefined;
  }
}
