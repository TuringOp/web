export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/generate-track") {
      if (!env.MUSIC_JEPA_API_URL) {
        return new Response(JSON.stringify({ error: "MUSIC_JEPA_API_URL is not configured" }), {
          status: 500,
          headers: { "content-type": "application/json" }
        });
      }

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type"
          }
        });
      }

      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "method not allowed" }), {
          status: 405,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }

      let apiResponse;
      try {
        apiResponse = await fetch(`${env.MUSIC_JEPA_API_URL}/generate-track`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: await request.text()
        });
      } catch {
        return new Response(JSON.stringify({ error: "music generation backend is unavailable" }), {
          status: 502,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }

      const upstreamType = (apiResponse.headers.get("content-type") || "").toLowerCase();
      if (!upstreamType.includes("application/json")) {
        const upstreamText = await apiResponse.text();
        return new Response(
          JSON.stringify({
            error: `upstream backend returned non-JSON response (status ${apiResponse.status})`,
            upstream: upstreamText.slice(0, 400)
          }),
          {
            status: apiResponse.status,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          }
        );
      }

      return new Response(apiResponse.body, {
        status: apiResponse.status,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};

