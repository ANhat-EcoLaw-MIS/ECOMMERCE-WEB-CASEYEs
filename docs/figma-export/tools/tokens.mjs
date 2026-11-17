// Build tokens.json (W3C DTCG, importable by Tokens Studio / Figma variables plugins) + tokens.html sheet from tokens.css
import { readFileSync, writeFileSync } from 'node:fs';
const [src, outDir] = process.argv.slice(2);
const css = readFileSync(src, 'utf8');
const theme = css.slice(css.indexOf('@theme'), css.indexOf('@keyframes'));
const vars = [...theme.matchAll(/--([\w-]+):\s*([^;]+);(?:[ \t]*\/\*[ \t]*(.*?)[ \t]*\*\/)?/g)].map(m => ({ name: m[1], value: m[2].trim(), note: m[3] || '' }));
const grads = [...css.slice(css.indexOf(':root')).matchAll(/--(grad-[\w-]+):\s*([^;]+);/g)].map(m => ({ name: m[1], value: m[2].trim() }));

const group = (p) => vars.filter(v => v.name.startsWith(p) && !v.name.startsWith('animate'));
const colors = group('color-'), spacing = group('spacing-'), fonts = group('font-'), radius = group('radius-'), shadows = group('shadow-');
const remPx = (v) => v.endsWith('rem') ? `${parseFloat(v) * 16}px` : v;

const dtcg = { color: {}, spacing: {}, radius: {}, font: {}, shadow: {}, gradient: {} };
for (const c of colors) dtcg.color[c.name.replace('color-', '')] = { $type: 'color', $value: c.value, ...(c.note && { $description: c.note }) };
for (const s of spacing) dtcg.spacing[s.name.replace('spacing-', '')] = { $type: 'dimension', $value: remPx(s.value) };
for (const r of radius) dtcg.radius[r.name.replace('radius-', '')] = { $type: 'dimension', $value: remPx(r.value) };
for (const f of fonts) dtcg.font[f.name.replace('font-', '')] = { $type: 'fontFamily', $value: f.value.split(',').map(s => s.trim().replace(/"/g, '')) };
for (const s of shadows) dtcg.shadow[s.name.replace('shadow-', '')] = { $type: 'string', $value: s.value };
for (const g of grads) dtcg.gradient[g.name.replace('grad-', '')] = { $type: 'string', $value: g.value };
writeFileSync(`${outDir}/tokens.json`, JSON.stringify(dtcg, null, 2));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const swatch = (c) => `<div class="sw"><div class="chip" style="background:${c.value}"></div><b>${c.name.replace('color-', '')}</b><code>${c.value}</code>${c.note ? `<i>${esc(c.note)}</i>` : ''}</div>`;
const sections = [
  ['Brand', colors.filter(c => /brand|primary|secondary/.test(c.name))],
  ['Surface & Ink', colors.filter(c => /surface|ink|line|outline|on-surface/.test(c.name))],
  ['Trạng thái', colors.filter(c => /state|danger|success/.test(c.name))],
  ['Onboarding (nền tối)', colors.filter(c => /onboarding/.test(c.name))],
];
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>CasEYE's — Design tokens</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:48px;background:#FAFAFA;font-family:Inter,system-ui,sans-serif;color:#0A0A0A;width:1344px}
h1{font:800 40px 'Plus Jakarta Sans';margin:0 0 4px;color:#2a1d4d} h2{font:700 22px 'Plus Jakarta Sans';margin:40px 0 16px;color:#433075}
p.sub{color:#52525b;margin:0 0 8px}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}
.sw{background:#fff;border:1px solid #e8e6ef;border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:4px;font-size:12px}
.chip{height:72px;border-radius:12px;border:1px solid #0000000d;margin-bottom:6px}
.sw code{color:#52525b}.sw i{color:#7a7581;font-size:11px}
.row{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-end}
.box{background:#fff;border:1px solid #e8e6ef;padding:16px;font-size:12px;display:flex;flex-direction:column;gap:6px}
.type div{margin-bottom:14px}.type small{display:block;color:#7a7581;font:12px Inter}
</style></head><body>
<h1>CasEYE's — Design tokens</h1><p class="sub">Nguồn: src/styles/tokens.css (Tailwind v4 @theme), import trong src/styles.scss.</p>
${sections.map(([t, list]) => `<h2>Màu — ${t}</h2><div class="grid">${list.map(swatch).join('')}</div>`).join('')}
<h2>Gradient</h2><div class="grid">${grads.map(g => `<div class="sw"><div class="chip" style="background:${g.value}"></div><b>${g.name}</b><code>${esc(g.value)}</code></div>`).join('')}</div>
<h2>Chữ</h2><div class="type">
<div style="font:800 56px/1.1 'Plus Jakarta Sans'">Biến ý tưởng thành ốp lưng<small>Display — Plus Jakarta Sans 800 · 56px (hero)</small></div>
<div style="font:700 32px/1.2 'Plus Jakarta Sans'">Tiêu đề mục<small>Display — Plus Jakarta Sans 700 · 32px</small></div>
<div style="font:600 18px/1.4 Inter">Tiêu đề thẻ / nút<small>Body — Inter 600 · 18px</small></div>
<div style="font:400 16px/1.6 Inter">Design và sắm ốp lưng theo phong cách riêng của bạn.<small>Body — Inter 400 · 16px</small></div>
<div style="font:600 12px/1.4 Inter;letter-spacing:.12em;text-transform:uppercase;color:#52525b">Nhãn mục<small style="text-transform:none;letter-spacing:0">Eyebrow — Inter 600 · 12px · tracking 0.12em</small></div>
${fonts.map(f => `<p class="sub"><b>--${f.name}</b>: <code>${esc(f.value)}</code></p>`).join('')}</div>
<h2>Bo góc</h2><div class="row">${[...radius, { name: 'tailwind rounded-xl', value: '0.75rem' }, { name: 'tailwind rounded-2xl', value: '1rem' }].map(r => `<div class="box" style="border-radius:${r.value};width:160px;height:100px"><b>${r.name}</b><code>${r.value} (${remPx(r.value)})</code></div>`).join('')}</div>
<h2>Khoảng cách</h2><div class="row">${spacing.map(s => `<div class="box" style="border-radius:12px"><div style="background:#a58cf4;height:16px;width:${s.value}"></div><b>${s.name.replace('spacing-', '')}</b><code>${s.value} = ${remPx(s.value)}</code></div>`).join('')}</div>
<h2>Đổ bóng (tím, không xám)</h2><div class="row">${shadows.map(s => `<div class="box" style="border-radius:20px;width:220px;height:110px;box-shadow:${s.value};border:none"><b>${s.name}</b><code>${esc(s.value)}</code></div>`).join('')}</div>
</body></html>`;
writeFileSync(`${outDir}/tokens.html`, html);
console.log(colors.length, 'colors', spacing.length, 'spacing', radius.length, 'radius', shadows.length, 'shadows', grads.length, 'grads');
