// Runs inside the rendered page. Returns a self-contained HTML string:
// every element gets its computed style inlined (media queries resolved),
// pseudo-elements materialized, images inlined as data URIs, scripts/stylesheets dropped.
(async ({ width, keepFixed }) => {
  const SKIP = new Set(['SCRIPT', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'STYLE', 'BASE', 'TITLE', 'HEAD']);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const defaults = new Map();
  const defaultFor = (tag) => {
    if (defaults.has(tag)) return defaults.get(tag);
    const el = fdoc.createElement(tag); fdoc.body.appendChild(el);
    const cs = getComputedStyle(el); const o = {};
    for (const p of cs) o[p] = cs.getPropertyValue(p);
    el.remove(); defaults.set(tag, o); return o;
  };
  const SKIP_PROPS = /^(transition|animation|will-change|cursor|pointer-events|user-select|-webkit-user|caret|scroll-|overscroll|touch-action|outline|view-transition|anchor|interpolate|counter-|speak|-webkit-tap|-webkit-locale|inset-block|inset-inline|block-size|inline-size|min-block|min-inline|max-block|max-inline|margin-block|margin-inline|padding-block|padding-inline|border-block|border-inline|border-start|border-end|overflow-block|overflow-inline|contain-intrinsic|-webkit-border|-webkit-text-fill|-webkit-text-stroke-width|perspective-origin|transform-origin|text-size-adjust|-webkit-rtl|unicode-bidi|tab-size|orphans|widows|hyphenate|math-|ruby|text-emphasis|x$|y$|r$|rx|ry|cx|cy|d$)/;
  const ALWAYS = new Set(['box-sizing','display','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','font-family','font-size','font-weight','line-height','color','list-style-type','text-decoration-line']);
  const styleText = (cs, base) => {
    let s = '';
    for (const p of cs) {
      if (SKIP_PROPS.test(p)) continue;
      const v = cs.getPropertyValue(p);
      if (v !== base[p] || ALWAYS.has(p)) s += `${p}:${v.replace(/"/g, "'")};`;
    }
    return s;
  };
  const cache = new Map();
  const toData = async (url) => {
    if (!url || url.startsWith('data:')) return url;
    if (cache.has(url)) return cache.get(url);
    const p = (async () => {
      try {
        const r = await fetch(url); const b = await r.blob();
        return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
      } catch { return url; }
    })();
    cache.set(url, p); return p;
  };
  const sized = new Map();
  const toDataSized = async (url, w, h) => {
    const key = url + '|' + Math.round(w) + 'x' + Math.round(h);
    if (sized.has(key)) return sized.get(key);
    const p = (async () => {
      try {
        if (url.startsWith('data:image/svg') || /\.svg(\?|$)/.test(url)) return await toData(url);
        const b = await (await fetch(url)).blob();
        const bmp = await createImageBitmap(b);
        const scale = Math.min(1, (2 * Math.max(w, 1)) / bmp.width, (2 * Math.max(h, 1)) / bmp.height);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(bmp.width * scale)); c.height = Math.max(1, Math.round(bmp.height * scale));
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        return c.toDataURL('image/webp', 0.85);
      } catch { return await toData(url); }
    })();
    sized.set(key, p); return p;
  };
  const urlRe = /url\((['"]?)(.*?)\1\)/g;
  const inlineUrls = async (s) => {
    const urls = [...s.matchAll(urlRe)].map((m) => m[2]);
    for (const u of urls) { const d = await toData(new URL(u, location.href).href); s = s.split(u).join(d); }
    return s;
  };
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const attrEsc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const KEEP_ATTR = new Set(['src', 'alt', 'href', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'points', 'transform', 'xmlns', 'fill-rule', 'clip-rule', 'opacity', 'offset', 'stop-color', 'stop-opacity', 'id', 'gradientUnits', 'gradientTransform', 'preserveAspectRatio', 'type', 'value', 'placeholder', 'aria-label', 'role', 'data-name']);

  const ser = async (el, inSvg) => {
    if (el.nodeType === 3) return esc(el.textContent);
    if (el.nodeType !== 1 || SKIP.has(el.tagName) || el === frame) return '';
    const tag = el.tagName.toLowerCase();
    const svg = inSvg || tag === 'svg';
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return '';
    let style = svg && tag !== 'svg' ? '' : styleText(cs, defaultFor(svg ? 'span' : (tag.includes('-') ? 'div' : tag)));
    if (svg && tag === 'svg') { const r = el.getBoundingClientRect(); style += `width:${r.width}px;height:${r.height}px;color:${cs.color};`; }
    if (!keepFixed && cs.position === 'fixed') style += 'position:absolute;';
    if (!svg && [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) {
      const r = el.getBoundingClientRect();
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
      if (r.height < lh * 1.5) style += 'white-space:nowrap;';
      else if (cs.display !== 'inline') style += `width:${Math.ceil(r.width)}px;max-width:none;flex-shrink:0;`;
    }
    if (style.includes('url(')) { const r = el.getBoundingClientRect(); for (const m of [...style.matchAll(urlRe)]) { const d = await toDataSized(new URL(m[2], location.href).href, r.width, r.height); style = style.split(m[2]).join(d); } }
    const outTag = tag.includes('-') ? 'div' : tag;
    let attrs = '';
    for (const a of el.attributes) {
      if (!KEEP_ATTR.has(a.name)) continue;
      let v = a.value;
      if (a.name === 'src' && tag === 'img') { const r = el.getBoundingClientRect(); v = await toDataSized(el.currentSrc || el.src, r.width, r.height); }
      if (a.name === 'href' && !svg) continue;
      attrs += ` ${a.name}="${attrEsc(v)}"`;
    }
    if (tag === 'input' || tag === 'textarea') attrs += ` value="${attrEsc(el.value || '')}"`;
    const name = el.getAttribute('aria-label') || (tag.includes('-') ? tag : '');
    if (name) attrs += ` data-figma-name="${attrEsc(name)}"`;
    const pseudo = async (which) => {
      if (svg) return '';
      const ps = getComputedStyle(el, which); const c = ps.content;
      if (!c || c === 'none' || c === 'normal') return '';
      let s = styleText(ps, defaultFor('span'));
      if (s.includes('url(')) s = await inlineUrls(s);
      const text = c.startsWith('"') || c.startsWith("'") ? c.slice(1, -1) : '';
      return `<span style="${attrEsc(s)}">${esc(text)}</span>`;
    };
    let inner = await pseudo('::before');
    if (tag === 'textarea') inner += esc(el.value || '');
    else for (const ch of el.childNodes) inner += await ser(ch, svg);
    inner += await pseudo('::after');
    if (['img', 'input', 'br', 'hr'].includes(outTag)) return `<${outTag}${attrs} style="${attrEsc(style)}">`;
    return `<${outTag}${attrs} style="${attrEsc(style)}">${inner}</${outTag}>`;
  };
  const htmlCs = getComputedStyle(document.documentElement);
  const bodyHtml = await ser(document.body, false);
  frame.remove();
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(document.title)}</title><style>html,body{margin:0;padding:0}html{width:${width}px;font-family:${htmlCs.fontFamily.replace(/"/g, "'")}}</style></head>${bodyHtml.replace(/^<body/, `<body data-w="${width}"`)}</html>`;
})
