export async function callAPI({ url, method = "POST", headers = {}, body = undefined }) {
  const normalizedMethod = method.toUpperCase();

  const response = await fetch(String(url), {
    method: normalizedMethod,
    headers,
    body: normalizedMethod === "GET" ? null : JSON.stringify(body)
  });

  const text = await response.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || response.statusText || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
