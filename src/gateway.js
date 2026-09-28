"use strict";
// Client for the user's OpenAI-compatible gateway + SVG extraction/sanitizing.

const DEFAULT_BASE_URL = "https://claude-n-codex.com:8443/v1";

const STYLES = {
  flat: "premium flat illustration: bold confident vector shapes, refined limited palette, subtle long shadows and soft depth shading, crisp edges, modern editorial quality",
  gradient:
    "luminous gradient artwork: rich multi-stop gradients, dreamy atmospheric glow, smooth color transitions, ethereal light, premium album-cover quality",
  line: "exquisite line art: confident flowing strokes of varying weight, delicate hatching for shading, elegant and airy, museum-print quality",
  geometric: "sophisticated low-poly geometric art: carefully faceted shapes with thoughtful color grading across facets, jewel-like precision",
  kawaii: "high-end kawaii illustration: irresistibly cute rounded forms, soft pastel palette with rosy accents, glossy highlights, sparkling details",
  logo: "iconic minimal logo mark: one powerful concept, perfect balance and negative space, confident silhouette, timeless professional identity design",
};

const ASPECTS = {
  square: { w: 1024, h: 1024 },
  landscape: { w: 1280, h: 720 },
  portrait: { w: 720, h: 1280 },
};

function systemPrompt(styleKey, w, h) {
  const style = STYLES[styleKey] || STYLES.flat;
  return [
    "You are an award-winning vector illustrator known for breathtaking SVG artwork. Create a truly beautiful, gallery-quality illustration — this is finished artwork, not a sketch.",
    "",
    "ART DIRECTION (follow strictly):",
    "1. Depth & composition — Build at least 3 depth layers (background, midground, foreground). Place the focal subject using the rule of thirds. Fill the canvas with intention; no large dead empty areas.",
    "2. Color — A sophisticated harmonious palette of 5-8 core colors with tonal variations. Rich gradient skies and backgrounds, never a flat single-color void. Colors must harmonize; never muddy, never neon-clashing.",
    "3. Light — One clear light source. Soft glows, luminous highlights, and gentle shadows give every major shape volume.",
    "4. Detail — Fine craftsmanship: delicate textures (dot grids, tiny stars, grain specks), small accent elements (birds, leaves, particles, ripples), varied overlapping shapes. Intricate but clean.",
    `5. Style fidelity — ${style}. Commit fully to the style.`,
    "",
    "STRICT TECHNICAL RULES:",
    "- Output ONLY raw SVG markup. No markdown fences, no explanations, no preamble, no trailing text.",
    `- Exactly one <svg> element with xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 ${w} ${h}".`,
    "- Fully self-contained: no external images, fonts, scripts, or links. Inline all styles and gradients in <defs>.",
    "- No raster images, no base64, no <script>, no event handlers.",
    "- Prioritize beauty over brevity, but stay under ~15000 characters.",
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
        temperature: 0.85,
        max_tokens: 8000,
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
