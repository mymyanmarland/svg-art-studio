"use strict";
const express = require("express");
const path = require("path");
const store = require("./store");
const gw = require("./gateway");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

function creds() {
  return {
    baseUrl: store.getSetting("gateway_base_url") || gw.DEFAULT_BASE_URL,
    apiKey: store.getSecret("gateway_api_key"),
    model: store.getSetting("gateway_model") || "claude-sonnet-5",
  };
}

app.get("/api/status", (req, res) => {
  const c = creds();
  res.json({
    gatewayConfigured: Boolean(c.apiKey),
    ephemeralKey: store.isEphemeralKey(),
    baseUrl: c.baseUrl,
    model: c.model,
    styles: Object.keys(gw.STYLES),
    aspects: Object.keys(gw.ASPECTS),
  });
});

app.get("/api/settings", (req, res) => {
  const c = creds();
  res.json({ baseUrl: c.baseUrl, model: c.model, hasKey: Boolean(c.apiKey) });
});

app.post("/api/settings", (req, res) => {
  const { baseUrl, apiKey, model } = req.body || {};
  if (baseUrl) store.setSetting("gateway_base_url", String(baseUrl).trim());
  if (apiKey) store.setSecret("gateway_api_key", String(apiKey));
  if (model) store.setSetting("gateway_model", String(model));
  res.json({ ok: true, hasKey: Boolean(creds().apiKey) });
});

app.post("/api/settings/test", async (req, res) => {
  try {
    const c = creds();
    if (!c.apiKey) return res.status(400).json({ ok: false, error: "no-key" });
    const models = await gw.listModels(c.baseUrl, c.apiKey);
    res.json({ ok: true, count: models.length });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e).slice(0, 300) });
  }
});

app.get("/api/models", async (req, res) => {
  try {
    const c = creds();
    if (!c.apiKey) return res.status(400).json({ error: "no-key" });
    res.json({ models: await gw.listModels(c.baseUrl, c.apiKey) });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e).slice(0, 300) });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, style, aspect, model } = req.body || {};
    if (!prompt || !String(prompt).trim())
      return res.status(400).json({ error: "empty-prompt" });
    const c = creds();
    if (!c.apiKey) return res.status(400).json({ error: "no-key" });

    const styleKey = gw.STYLES[style] ? style : gw.DEFAULT_STYLE;
    const dims = gw.ASPECTS[aspect] || gw.ASPECTS.square;
    const useModel = model || c.model;

    const raw = await gw.chatCompletion(
      c.baseUrl,
      c.apiKey,
      useModel,
      gw.systemPrompt(String(prompt).trim(), styleKey, dims.w, dims.h),
      String(prompt).trim()
    );
    let svg = gw.extractSvg(raw);
    if (!svg) return res.status(502).json({ error: "no-svg", detail: raw.slice(0, 300) });
    svg = gw.ensureXmlns(gw.sanitizeSvg(svg), dims.w, dims.h);
    res.json({ svg, style: styleKey, aspect: aspect || "square", model: useModel });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e).slice(0, 300) });
  }
});

app.get("/api/gallery", (req, res) => {
  res.json({ items: store.listArtworks() });
});

app.post("/api/gallery", (req, res) => {
  const { prompt, style, model, svg } = req.body || {};
  if (!svg || !svg.includes("<svg"))
    return res.status(400).json({ error: "bad-svg" });
  const id = store.saveArtwork({
    prompt: String(prompt || "").slice(0, 500),
    style: String(style || ""),
    model: String(model || ""),
    svg: gw.sanitizeSvg(String(svg)).slice(0, 400000),
  });
  res.json({ ok: true, id });
});

app.delete("/api/gallery/:id", (req, res) => {
  const ok = store.deleteArtwork(Number(req.params.id));
  res.json({ ok });
});

const PORT = process.env.PORT || 3101;
app.listen(PORT, () => console.log(`svg-art-generator listening on :${PORT}`));
