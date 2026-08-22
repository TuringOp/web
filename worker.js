function inferControls(prompt) {
  const text = (prompt || "").toLowerCase();
  let style = "classical";
  let mood = "calm";
  let tempo = "medium";

  if (text.includes("metal") || text.includes("heavy")) {
    style = "romantic";
    mood = "dramatic";
    tempo = "fast";
  } else if (text.includes("tokyo") || text.includes("drift") || text.includes("synth")) {
    style = "baroque";
    mood = "bright";
    tempo = "fast";
  }

  if (text.includes("slow") || text.includes("ambient")) {
    tempo = "slow";
  }
  const bpm = tempo === "fast" ? 132 : tempo === "slow" ? 72 : 100;
  return { style, mood, tempo, bpm };
}

function hashPrompt(prompt) {
  let h = 2166136261;
  for (let i = 0; i < prompt.length; i++) {
    h ^= prompt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeFallbackWavBase64(prompt, bpm) {
  const sampleRate = 22050;
  const noteDurSec = 60 / bpm;
  const noteCount = 16;
  const totalSec = noteDurSec * noteCount + 0.2;
  const totalSamples = Math.floor(totalSec * sampleRate);
  const pcm = new Int16Array(totalSamples);

  const scales = {
    calm: [60, 62, 64, 67, 69],
    dramatic: [48, 50, 53, 55, 57],
    bright: [64, 67, 69, 71, 72]
  };
  const seed = hashPrompt(prompt || "world model");
  const moodKey = (prompt || "").toLowerCase().includes("dark") ? "dramatic" : "bright";
  const scale = scales[moodKey];

  for (let n = 0; n < noteCount; n++) {
    const idx = (seed + n * 13) % scale.length;
    const pitch = scale[idx];
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const start = Math.floor(n * noteDurSec * sampleRate);
    const end = Math.min(totalSamples, Math.floor((n + 1) * noteDurSec * sampleRate));
    const fade = Math.floor(0.01 * sampleRate);
    for (let i = start; i < end; i++) {
      const t = (i - start) / sampleRate;
      let env = 1;
      if (i - start < fade) env = (i - start) / Math.max(1, fade);
      if (end - i < fade) env = (end - i) / Math.max(1, fade);
      const s = Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(2 * Math.PI * freq * 2 * t);
      const v = Math.max(-1, Math.min(1, s * env * 0.25));
      pcm[i] = Math.max(-32768, Math.min(32767, pcm[i] + Math.floor(v * 32767)));
    }
  }

  const byteLength = 44 + pcm.length * 2;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, pcm[i], true);

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fallbackPayload(prompt) {
  const controls = inferControls(prompt);
  return {
    prompt,
    model: {
      checkpoint: "worker-fallback-v1",
      config: "worker-fallback",
      device: "edge"
    },
    controls,
    audio_wav_base64: makeFallbackWavBase64(prompt, controls.bpm),
    midi_base64: "",
    token_count: 0
  };
}

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

      const bodyText = await request.text();
      let prompt = "";
      try {
        const parsed = JSON.parse(bodyText || "{}");
        prompt = String(parsed.prompt || "").trim();
      } catch {
        // Ignore parse errors and allow backend to validate.
      }

      let apiResponse;
      try {
        apiResponse = await fetch(`${env.MUSIC_JEPA_API_URL}/generate-track`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: bodyText
        });
      } catch {
        return new Response(JSON.stringify(fallbackPayload(prompt)), {
          status: 200,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }

      const upstreamType = (apiResponse.headers.get("content-type") || "").toLowerCase();
      if (!upstreamType.includes("application/json")) {
        const upstreamText = await apiResponse.text();
        return new Response(
          JSON.stringify({
            ...fallbackPayload(prompt),
            model: {
              checkpoint: "worker-fallback-v1",
              config: `fallback-after-upstream-${apiResponse.status}`,
              device: "edge"
            },
            upstream: upstreamText.slice(0, 400)
          }),
          {
            status: 200,
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

