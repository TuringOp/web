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

async function parseUpstreamJson(response) {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return {
      ok: false,
      nonJson: true,
      status: response.status,
      detail: text.slice(0, 400)
    };
  }
  try {
    return { ok: true, payload: await response.json() };
  } catch (error) {
    return {
      ok: false,
      nonJson: true,
      status: response.status,
      detail: `invalid upstream json: ${String(error && error.message ? error.message : error)}`
    };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isGenerateRoute = url.pathname === "/api/music/generate" || url.pathname === "/api/generate-track";
    if (isGenerateRoute) {
      if (!env.MUSIC_JEPA_API_URL) {
        return jsonResponse({ error: "MUSIC_JEPA_API_URL is not configured" }, 500);
      }

      if (request.method === "OPTIONS") {
        return optionsResponse();
      }

      if (request.method !== "POST") {
        return jsonResponse({ error: "method not allowed" }, 405);
      }

      const bodyText = await request.text();

      let apiResponse;
      try {
        apiResponse = await fetch(`${env.MUSIC_JEPA_API_URL}/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: bodyText,
          signal: AbortSignal.timeout(120000)
        });
      } catch (error) {
        return jsonResponse(
          {
            error: "upstream unreachable",
            detail: String(error && error.message ? error.message : error)
          },
          502
        );
      }

      const parsed = await parseUpstreamJson(apiResponse);
      if (!parsed.ok) {
        return jsonResponse(
          {
            error: `upstream non-json (status ${parsed.status})`,
            upstream_status: parsed.status,
            detail: parsed.detail
          },
          502
        );
      }

      return jsonResponse(parsed.payload, apiResponse.status);
    }

    if (url.pathname === "/api/music/healthz") {
      if (request.method === "OPTIONS") {
        return optionsResponse();
      }
      if (request.method !== "GET") {
        return jsonResponse({ error: "method not allowed" }, 405);
      }
      if (!env.MUSIC_JEPA_API_URL) {
        return jsonResponse({ ok: false, error: "MUSIC_JEPA_API_URL is not configured" }, 503);
      }

      try {
        const upstream = await fetch(`${env.MUSIC_JEPA_API_URL}/healthz`, {
          signal: AbortSignal.timeout(5000)
        });
        const parsed = await parseUpstreamJson(upstream);
        if (!parsed.ok) {
          return jsonResponse(
            {
              ok: false,
              error: `upstream non-json (status ${parsed.status})`,
              upstream_status: parsed.status,
              detail: parsed.detail
            },
            503
          );
        }
        if (!upstream.ok) {
          return jsonResponse({ ok: false, upstream: parsed.payload }, 503);
        }
        return jsonResponse({ ok: true, upstream: parsed.payload }, 200);
      } catch (error) {
        return jsonResponse(
          {
            ok: false,
            error: "upstream unreachable",
            detail: String(error && error.message ? error.message : error)
          },
          503
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};

