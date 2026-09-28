"use strict";
// Client for the user's OpenAI-compatible gateway + SVG extraction/sanitizing.

const DEFAULT_BASE_URL = "https://claude-n-codex.com:8443/v1";

const STYLES = {
  flat: "flat vector illustration, bold clean shapes, limited harmonious palette, subtle shadows",
  gradient:
    "modern gradient artwork, smooth vivid color transitions, soft glows, dreamy atmosphere",
  line: "elegant line art, refined thin strokes, generous whitespace, minimal and graceful",
  geometric: "geometric low-poly artwork, faceted polygonal shapes, crisp edges",
  kawaii: "cute kawaii style, soft rounded shapes, pastel colors, cheerful and playful",
  logo: "minimal logo mark, one strong concept, clean silhouette, balanced composition, works at small sizes",
};

const ASPECTS = {
  square: { w: 1024, h: 1024 },
  landscape: { w: 1280, h: 720 },
  portrait: { w: 720, h: 1280 },
};

function systemPrompt(styleKey, w, h) {
  const style = STYLES[styleKey] || STYLES.flat;
  return [
    "You are an expert vector illustrator. Create an original, high-quality SVG illustration for the user's description.",
    "STRICT OUTPUT RULES:",
    "- Output ONLY raw SVG markup. No markdown fences, no explanations, no preamble, no other text.",
    `- Exactly one <svg> element with xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 ${w} ${h}".`,
    "- Fully self-contained: no external images, fonts, scripts, or links. Inline all styles.",
    "- No raster images, no base64 blobs.",
    `- Artistic style: ${style}.`,
    "- Compose a complete, polished, professional scene — not a sketch, not placeholder shapes.",
  ].join("\n");
}

async function chatCompletion(baseUrl, apiKey, model, system, user, timeoutMs = 300000) {
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.8,
        max_tokens: 6000,
      }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`gateway HTTP ${res.status}: ${text.slice(0, 300)}`);
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("gateway returned no content");
    return content;
  } finally {
    clearTimeout(t);
  }
}

async function listModels(baseUrl, apiKey, timeoutMs = 30000) {
  const url = baseUrl.replace(/\/+$/, "") + "/models";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + apiKey },
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`gateway HTTP ${res.status}: ${text.slice(0, 300)}`);
    const data = JSON.parse(text);
    return (data.data || []).map((m) => m.id).filter(Boolean).sort();
  } finally {
    clearTimeout(t);
  }
}

// Pull the <svg>…</svg> out of a model reply (handles fenced code blocks too).
function extractSvg(text) {
  const fence = text.match(/```(?:svg|xml)?\s*([\s\S]*?)```/i);
  const cand = fence ? fence[1] : text;
  const m = cand.match(/<svg[\s\S]*?<\/svg>/i);
  return m ? m[0].trim() : null;
}

// Strip anything executable from the SVG before we store/render it.
function sanitizeSvg(svg) {
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*["']\s*javascript:/gi, 'href="blocked:');
}

function ensureXmlns(svg, w, h) {
  let out = svg;
  if (!/xmlns=/.test(out)) {
    out = out.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/viewBox=/.test(out)) {
    out = out.replace(/<svg/i, `<svg viewBox="0 0 ${w} ${h}"`);
  }
  return out;
}

module.exports = {
  DEFAULT_BASE_URL,
  STYLES,
  ASPECTS,
  systemPrompt,
  chatCompletion,
  listModels,
  extractSvg,
  sanitizeSvg,
  ensureXmlns,
};
