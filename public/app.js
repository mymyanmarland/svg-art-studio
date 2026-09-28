"use strict";
/* SVG Art Studio — frontend */

const I18N = {
  my: {
    tagline: "AI ပန်းချီစက်", promptLabel: "ပန်းချီဖော်ပြချက်",
    promptPh: "ဥပမာ — နေဝင်ချိန်မှာ ဘုရားစေတီတွေနဲ့ မီးပုံးပျံများ",
    styleLabel: "စတိုင်", aspectLabel: "အချိုး", modelLabel: "Model",
    generate: "ပန်းချီထုတ်မယ်", preview: "အစမ်းကြည့်ရန်",
    copyCode: "ကုဒ်ကူးမယ်", saveArt: "သိမ်းမယ်",
    emptyHint: "ဘယ်ဘက်မှာ ဖော်ပြချက်ရေးပြီး<br>ပန်းချီထုတ်ကြည့်လိုက်ပါ",
    gallery: "သိမ်းထားသော ပန်းချီများ", galleryEmpty: "မရှိသေးပါ — ကြိုက်တဲ့ပန်းချီကို “သိမ်းမယ်” နှိပ်ပါ",
    settings: "ဆက်တင်များ", baseUrlLabel: "Gateway URL", apiKeyLabel: "API Key",
    apiKeyPh: "key အသစ်ထည့်ရန် ဒီမှာရိုက်ပါ",
    apiKeyHint: "Key ကို server မှာပဲ လျှို့ဝှက်သိမ်းထားမယ်၊ browser ကို ဘယ်တော့မှ မပို့ဘူး။",
    modelLabel2: "Model", loadModels: "Models ခေါ်မယ်", testConn: "စမ်းသပ်မယ်", save: "သိမ်းမယ်",
    styles: { anime: "အန်နီမေး", watercolor: "ရေဆေး", artdeco: "အာ့တ် ဒီကို", cinematic: "ရုပ်ရှင်ဆန်", mingeo: "ဂျီဩမေတြီ", ghibli: "ဂီဘလီ", ukiyoe: "အုခိယို-အဲ" },
    aspects: { square: "စတုရန်း", landscape: "အလျား", portrait: "အနံ" },
    generating: "ပန်းချီရေးဆွဲနေသည်… ခဏစောင့်ပါ",
    needKey: "⚠ အရင် ⚙ ဆက်တင်မှာ API Key ထည့်ပေးပါ",
    errGen: "ထုတ်လုပ်ရာတွင် အမှားဖြစ်နေသည်", errNoSvg: "SVG မရခဲ့ပါ — ထပ်စမ်းကြည့်ပါ",
    saved: "✓ သိမ်းပြီးပြီ", copied: "✓ ကုဒ်ကူးပြီးပြီ",
    testOk: "✓ ချိတ်ဆက်မှုအောင်မြင်သည်", testFail: "✗ ချိတ်ဆက်မှုမအောင်မြင်ပါ",
    setSaved: "✓ သိမ်းပြီးပြီ", delConfirm: "ဖျက်မှာ သေချာလား？", deleted: "ဖျက်ပြီးပြီ",
    emptyPrompt: "ဖော်ပြချက် အရင်ရေးပေးပါ",
    ephemeralWarn: "⚠ APP_SECRET မရှိသေးလို့ server restart ရင် key ပြန်ထည့်ရမယ်။",
  },
  en: {
    tagline: "AI art machine", promptLabel: "Describe your artwork",
    promptPh: "e.g. — hot air balloons over Bagan temples at sunset",
    styleLabel: "Style", aspectLabel: "Aspect", modelLabel: "Model",
    generate: "Generate art", preview: "Preview",
    copyCode: "Copy code", saveArt: "Save",
    emptyHint: "Describe your art on the left<br>and hit generate",
    gallery: "Saved artworks", galleryEmpty: "Nothing yet — hit “Save” on an artwork you like",
    settings: "Settings", baseUrlLabel: "Gateway URL", apiKeyLabel: "API Key",
    apiKeyPh: "type a new key here to replace",
    apiKeyHint: "The key is stored encrypted on the server only — it never reaches the browser.",
    modelLabel2: "Model", loadModels: "Load models", testConn: "Test", save: "Save",
    styles: { anime: "Anime", watercolor: "Watercolor", artdeco: "Art Deco", cinematic: "Cinematic", mingeo: "Minimal Geo", ghibli: "Ghibli", ukiyoe: "Ukiyo-e" },
    aspects: { square: "Square", landscape: "Landscape", portrait: "Portrait" },
    generating: "Painting… please wait",
    needKey: "⚠ Please add your API key in ⚙ Settings first",
    errGen: "Generation failed", errNoSvg: "No SVG returned — try again",
    saved: "✓ Saved", copied: "✓ Code copied",
    testOk: "✓ Connection works", testFail: "✗ Connection failed",
    setSaved: "✓ Saved", delConfirm: "Delete this artwork?", deleted: "Deleted",
    emptyPrompt: "Please describe your artwork first",
    ephemeralWarn: "⚠ No APP_SECRET set — the saved key will be lost on server restart. Set APP_SECRET env for persistence.",
  },
};

const state = {
  lang: localStorage.getItem("svgart-lang") || "my",
  style: "ghibli", aspect: "square", model: "",
  current: null, // {svg, prompt, style, model}
};

const $ = (id) => document.getElementById(id);
const t = (k) => (I18N[state.lang] && I18N[state.lang][k]) ?? I18N.en[k] ?? k;

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = t(el.dataset.i18n);
    if (typeof v === "string") el.innerHTML = v;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  $("langMy").classList.toggle("active", state.lang === "my");
  $("langEn").classList.toggle("active", state.lang === "en");
  renderStylePills(); renderAspectSeg(); renderGalleryLabels();
}

function renderStylePills() {
  const box = $("stylePills"); box.innerHTML = "";
  for (const key of ["anime", "watercolor", "artdeco", "cinematic", "mingeo", "ghibli", "ukiyoe"]) {
    const b = document.createElement("button");
    b.className = "pill" + (state.style === key ? " active" : "");
    b.textContent = I18N[state.lang].styles[key];
    b.onclick = () => { state.style = key; renderStylePills(); };
    box.appendChild(b);
  }
}
function renderAspectSeg() {
  const box = $("aspectSeg"); box.innerHTML = "";
  for (const key of ["square", "landscape", "portrait"]) {
    const b = document.createElement("button");
    b.className = state.aspect === key ? "active" : "";
    b.textContent = I18N[state.lang].aspects[key];
    b.onclick = () => { state.aspect = key; renderAspectSeg(); };
    box.appendChild(b);
  }
}
function renderGalleryLabels() { loadGallery(); }

function setStatus(msg, kind = "") {
  const el = $("genStatus");
  el.textContent = msg; el.className = "status " + kind;
}

function showPreviewLoading() {
  const box = $("previewBox");
  box.classList.remove("empty"); box.innerHTML = "";
  const d = document.createElement("div");
  d.className = "spin"; d.innerHTML = `<span class="spinner"></span><span>${t("generating")}</span>`;
  box.appendChild(d);
}

function showPreviewSvg(svg) {
  const box = $("previewBox");
  box.classList.remove("empty"); box.innerHTML = svg;
  $("previewActions").hidden = false;
}

function currentSvgNode() {
  return $("previewBox").querySelector("svg");
}

function download(filename, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function svgWithSize(svgText, w, h) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;
  svg.setAttribute("width", w); svg.setAttribute("height", h);
  return new XMLSerializer().serializeToString(svg);
}

function downloadSvg(svgText, name) {
  download(name + ".svg", new Blob([svgText], { type: "image/svg+xml" }));
}

function downloadPng(svgText, name, w = 1024, h = 1024) {
  const sized = svgWithSize(svgText, w * 2, h * 2);
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = w * 2; c.height = h * 2;
    c.getContext("2d").drawImage(img, 0, 0, w * 2, h * 2);
    URL.revokeObjectURL(url);
    c.toBlob((b) => download(name + ".png", b), "image/png");
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

// ---------- generate ----------
$("generateBtn").onclick = async () => {
  const prompt = $("prompt").value.trim();
  if (!prompt) { setStatus(t("emptyPrompt"), "error"); return; }
  const btn = $("generateBtn"); btn.disabled = true;
  setStatus(""); showPreviewLoading();
  try {
    const st = await api("/api/status");
    if (!st.gatewayConfigured) { setStatus(t("needKey"), "error"); $("previewBox").classList.add("empty"); return; }
    const out = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, style: state.style, aspect: state.aspect, model: $("modelSelect").value || undefined }),
    });
    state.current = { svg: out.svg, prompt, style: out.style, model: out.model };
    showPreviewSvg(out.svg);
    setStatus(t("saved").replace("✓ ", "✓ "), "ok");
    setStatus("", "");
  } catch (e) {
    const msg = String(e.message || e);
    setStatus((msg.includes("no-svg") ? t("errNoSvg") : t("errGen")) + ": " + msg.slice(0, 120), "error");
  } finally {
    btn.disabled = false;
  }
};

$("dlSvg").onclick = () => state.current && downloadSvg(state.current.svg, "artwork");
$("dlPng").onclick = () => state.current && downloadPng(state.current.svg, "artwork");
$("copyCode").onclick = async () => {
  if (!state.current) return;
  await navigator.clipboard.writeText(state.current.svg);
  setStatus(t("copied"), "ok");
};
$("saveArt").onclick = async () => {
  if (!state.current) return;
  await api("/api/gallery", { method: "POST", body: JSON.stringify(state.current) });
  setStatus(t("saved"), "ok");
  loadGallery();
};

// ---------- gallery ----------
async function loadGallery() {
  const { items } = await api("/api/gallery");
  const grid = $("galleryGrid"); grid.innerHTML = "";
  $("galleryCount").textContent = items.length;
  $("galleryEmpty").style.display = items.length ? "none" : "block";
  for (const it of items) {
    const card = document.createElement("div");
    card.className = "gcard";
    card.innerHTML = `<div class="thumb">${it.svg}</div>
      <div class="meta"><p title="${escapeHtml(it.prompt)}">${escapeHtml(it.prompt) || "—"}</p>
      <div class="row">
        <button class="mini dl">⬇ SVG</button>
        <button class="mini del">✕</button>
      </div></div>`;
    card.querySelector(".thumb").onclick = () => openLightbox(it);
    card.querySelector(".dl").onclick = (e) => { e.stopPropagation(); downloadSvg(it.svg, "artwork-" + it.id); };
    card.querySelector(".del").onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(t("delConfirm"))) return;
      await api("/api/gallery/" + it.id, { method: "DELETE" });
      loadGallery();
    };
    grid.appendChild(card);
  }
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let lbItem = null;
function openLightbox(it) {
  lbItem = it;
  $("lbTitle").textContent = it.prompt || "—";
  $("lbBody").innerHTML = it.svg;
  $("lightbox").hidden = false;
}
$("closeLb").onclick = () => ($("lightbox").hidden = true);
$("lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") $("lightbox").hidden = true; });
$("lbDlSvg").onclick = () => lbItem && downloadSvg(lbItem.svg, "artwork-" + lbItem.id);
$("lbDlPng").onclick = () => lbItem && downloadPng(lbItem.svg, "artwork-" + lbItem.id);

// ---------- settings ----------
$("openSettings").onclick = async () => {
  const s = await api("/api/settings");
  $("setBaseUrl").value = s.baseUrl || "";
  $("setApiKey").value = "";
  $("setApiKey").placeholder = t("apiKeyPh") + (s.hasKey ? " (✓)" : "");
  const st = $("setStatus");
  try {
    const st0 = await api("/api/status");
    if (st0.ephemeralKey) { st.textContent = t("ephemeralWarn"); st.className = "status error"; }
    else { st.textContent = ""; st.className = "status"; }
  } catch { st.textContent = ""; }
  fillModelSelect($("setModel"), s.model);
  $("settingsModal").hidden = false;
};
$("closeSettings").onclick = () => ($("settingsModal").hidden = true);
$("settingsModal").addEventListener("click", (e) => { if (e.target.id === "settingsModal") $("settingsModal").hidden = true; });

function fillModelSelect(sel, current) {
  sel.innerHTML = "";
  const models = ["claude-sonnet-5", "claude-opus-5", "claude-fable-5.1", "claude-fable-5"];
  for (const m of models) {
    const o = document.createElement("option");
    o.value = m; o.textContent = m;
    if (m === current) o.selected = true;
    sel.appendChild(o);
  }
  if (current && !models.includes(current)) {
    const o = document.createElement("option");
    o.value = current; o.textContent = current; o.selected = true;
    sel.appendChild(o);
  }
}

$("loadModels").onclick = async () => {
  const st = $("setStatus");
  st.textContent = "…"; st.className = "status";
  try {
    // save first so /api/models can use the key
    await api("/api/settings", { method: "POST", body: JSON.stringify({ baseUrl: $("setBaseUrl").value.trim() }) });
    const { models } = await api("/api/models");
    const sel = $("setModel"); sel.innerHTML = "";
    for (const m of models) {
      const o = document.createElement("option"); o.value = m; o.textContent = m;
      sel.appendChild(o);
    }
    st.textContent = t("testOk") + ` (${models.length})`; st.className = "status ok";
  } catch (e) { st.textContent = t("testFail") + ": " + String(e.message).slice(0, 120); st.className = "status error"; }
};

$("testConn").onclick = async () => {
  const st = $("setStatus");
  st.textContent = "…"; st.className = "status";
  try {
    await api("/api/settings", {
      method: "POST",
      body: JSON.stringify({
        baseUrl: $("setBaseUrl").value.trim(),
        ...($("setApiKey").value ? { apiKey: $("setApiKey").value } : {}),
      }),
    });
    const r = await api("/api/settings/test", { method: "POST" });
    st.textContent = r.ok ? t("testOk") : t("testFail");
    st.className = "status " + (r.ok ? "ok" : "error");
  } catch (e) { st.textContent = t("testFail") + ": " + String(e.message).slice(0, 120); st.className = "status error"; }
};

$("saveSettings").onclick = async () => {
  const body = { baseUrl: $("setBaseUrl").value.trim(), model: $("setModel").value };
  if ($("setApiKey").value) body.apiKey = $("setApiKey").value;
  await api("/api/settings", { method: "POST", body: JSON.stringify(body) });
  const st = $("setStatus");
  st.textContent = t("setSaved"); st.className = "status ok";
  initModelSelect();
  setTimeout(() => ($("settingsModal").hidden = true), 700);
};

// ---------- lang ----------
$("langMy").onclick = () => { state.lang = "my"; localStorage.setItem("svgart-lang", "my"); applyLang(); };
$("langEn").onclick = () => { state.lang = "en"; localStorage.setItem("svgart-lang", "en"); applyLang(); };

async function initModelSelect() {
  try {
    const s = await api("/api/settings");
    fillModelSelect($("modelSelect"), s.model);
  } catch { fillModelSelect($("modelSelect"), "claude-sonnet-5"); }
}

applyLang();
initModelSelect();
loadGallery();
