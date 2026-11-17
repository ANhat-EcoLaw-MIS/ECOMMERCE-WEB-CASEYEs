// Full-page screenshots via Chrome DevTools Protocol. Usage: node shoot.mjs <outDir>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4200';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;

const screens = [
  { id: '01-trang-chu', path: '/' },
  { id: '02-shop', path: '/shop' },
  { id: '03-chi-tiet-san-pham', path: '/shop/lilac-dream' },
  { id: '04-design-studio-kho-mau', path: '/design-studio/templates', wait: 15000 },
  { id: '05-lop-phu-tim-kiem', path: '/', overlay: true },
  { id: '06-trang-tim-kiem', path: '/tim-kiem?q=t%C3%ADm' },
  { id: '07-chinh-sach-don-hang', path: '/order-tracking/chinh-sach' },
];
const viewports = [
  { tag: 'desktop', width: 1440, height: 900, mobile: false, dpr: 1 },
  { tag: 'mobile', width: 390, height: 844, mobile: true, dpr: 2 },
];

const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws;
for (let i = 0; i < 30; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const page = list.find((t) => t.type === 'page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    break;
  } catch { await sleep(500); }
}
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.enable'); await send('Runtime.enable');
for (const vp of viewports) {
  for (const s of screens.filter(x => !process.argv[3] || process.argv[3].split(',').includes(x.id))) {
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, mobile: vp.mobile });
    await send('Page.navigate', { url: BASE + s.path });
    await sleep(s.wait ?? 6000);
    if (s.overlay) {
      await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true})); true`);
      await sleep(1500);
    }
    // scroll through to trigger lazy content, then back to top
    await evalJs(`(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}scrollTo(0,0);return true})()`);
    await sleep(1200);
    const h = s.overlay ? vp.height : Math.min(await evalJs('document.documentElement.scrollHeight'), 12000);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !s.overlay, clip: { x: 0, y: 0, width: vp.width, height: h, scale: 1 } });
    const file = join(OUT, `${s.id}--${vp.tag}.png`);
    writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
    console.log(file, vp.width + 'x' + h);
  }
}
chrome.kill();
process.exit(0);
