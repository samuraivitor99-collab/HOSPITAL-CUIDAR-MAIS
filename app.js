async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    console.error("Resposta inesperada:", text);

    throw new Error(
      `Servidor não retornou JSON (${response.status})`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Erro no servidor"
    );
  }

  return data;
}
