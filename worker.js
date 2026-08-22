function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}

function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isMusicRoute =
      url.pathname === "/api/music/generate" ||
      url.pathname === "/api/generate-track" ||
      url.pathname === "/api/music/healthz";

    if (isMusicRoute) {
      if (request.method === "OPTIONS") {
        return optionsResponse();
      }
      return jsonResponse({ error: "music generation has been removed" }, 410);
    }

    return env.ASSETS.fetch(request);
  }
};
