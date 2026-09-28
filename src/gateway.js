"use strict";
// Client for the user's OpenAI-compatible gateway + SVG extraction/sanitizing.

const DEFAULT_BASE_URL = "https://claude-n-codex.com:8443/v1";

const STYLES = {
  anime: "anime-inspired: cel shading, sharp clean lines, vibrant and expressive",
  watercolor: "watercolor-vector: soft edges, gentle color bleeds, delicate washes",
  artdeco: "art deco: geometric elegance, gold accents, symmetrical luxury",
  cinematic: "cinematic realism: dramatic lighting, painterly depth, film-still atmosphere",
  mingeo: "minimalist geometric: flat bold shapes, strong color blocks, refined simplicity",
  ghibli: "Studio Ghibli-inspired: whimsical, soft, storybook warmth, hand-crafted charm",
  ukiyoe: "ukiyo-e woodblock: flat planes of color, ink outlines, classic Japanese print grace",
  logo: "iconic minimal logo mark: one strong symbol, no text or letters, perfect balance with generous negative space, confident silhouette, timeless professional identity. For this style a centered, symmetric composition is correct — ignore the rule-of-thirds requirement",
};

const DEFAULT_STYLE = "ghibli";

const ASPECTS = {
  square: { w: 1024, h: 1024 },
  landscape: { w: 1280, h: 720 },
  portrait: { w: 720, h: 1280 },
};

function systemPrompt(subject, styleKey, w, h) {
  const style = STYLES[styleKey] || STYLES[DEFAULT_STYLE];
  const cleanSubject = String(subject || "").trim().slice(0, 500);
  return [
    "You are an award-winning vector illustrator known for breathtaking SVG artwork.",
    "Create a truly beautiful, gallery-quality illustration — this is finished artwork, not a sketch.",
    "",
    "═══════════════════════════════════════════════════════",
    "SUBJECT & SCENE",
    "═══════════════════════════════════════════════════════",
    `Subject: ${cleanSubject}`,
    "Setting / Mood / Time: infer the most fitting setting, mood, and time of day from the subject above.",
    "",
    "═══════════════════════════════════════════════════════",
    "STYLE",
    "═══════════════════════════════════════════════════════",
    `${style}. Commit fully to this style.`,
    "",
    "═══════════════════════════════════════════════════════",
    "COMPOSITION",
    "═══════════════════════════════════════════════════════",
    "• Three depth layers (background / midground / foreground), all visible.",
    "• Hero subject placed at a rule-of-thirds intersection (upper-left or upper-right). NEVER dead-center.",
    "• ~70% filled with elements, ~30% intentional negative space for breathing room — no large empty corner zones.",
    "• Eye-path: foreground detail → midground subject → background atmosphere, using size, contrast, and clarity gradients.",
    "",
    "═══════════════════════════════════════════════════════",
    "COLOR & LIGHT",
    "═══════════════════════════════════════════════════════",
    "• Define the palette BEFORE drawing: 5–8 harmonious colors —",
    "  Primary (hero color), Secondary (support), Accent-1 (glow), Accent-2 (rim light),",
    "  plus 2–3 desaturated neutrals for atmosphere.",
    "• Every major shape — and always the sky, background, and ground — must use",
    "  <linearGradient> or <radialGradient>. NEVER a flat single-color fill on large surfaces.",
    "• ONE primary light source with a fixed direction. Apply to every shape:",
    "  – Highlight side: lighter tint + soft glow",
    "  – Shadow side: darker shade + soft drop shadow",
    "  – Rim light: thin lighter edge on the shadow side",
    "",
    "═══════════════════════════════════════════════════════",
    "DETAILS (include AT LEAST 4 of these)",
    "═══════════════════════════════════════════════════════",
    "□ Floating particles (dust, pollen, embers, snow, sparkles)",
    "□ Atmospheric layer (fog, mist, god-rays, lens flare)",
    "□ Distant life (birds, fish, drifting leaves)",
    "□ Texture pattern (stippling, hatching, scales)",
    "□ Reflective surface (water, glass, metal sheen)",
    "□ Tiny narrative element (a small figure or object that adds story)",
    "",
    "═══════════════════════════════════════════════════════",
    "TECHNICAL RULES (strict)",
    "═══════════════════════════════════════════════════════",
    "• Output: SVG code only. No explanations, no markdown fences.",
    `• Single <svg> element with xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 ${w} ${h}".`,
    "• Self-contained: no external images / fonts / scripts. All gradients, filters, patterns inside <defs>.",
    "• Use <filter> with feGaussianBlur for glow effects; use <pattern> for repeated textures.",
    "• Character count: minimum 4000, maximum 15000.",
    "• Masterpiece quality, highly detailed, professional finish.",
    "",
    "═══════════════════════════════════════════════════════",
    "AVOID",
    "═══════════════════════════════════════════════════════",
    "✗ Flat single-color backgrounds",
    "✗ Dead-center subjects",
    "✗ Any text, watermark, signature, or logo",
    "✗ Photorealism — keep it stylized",
    "✗ Generic clip-art look",
    "✗ Empty corners",
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
  DEFAULT_STYLE,
  STYLES,
  ASPECTS,
  systemPrompt,
  chatCompletion,
  listModels,
  extractSvg,
  sanitizeSvg,
  ensureXmlns,
};
