import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_URL = 'http://127.0.0.1:4173/';
const OUT_DIR = path.resolve(process.cwd(), 'public/captures');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }

  async call(method, params = {}) {
    await this.ready;
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.call('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  async screenshot(filename) {
    const { data } = await this.call('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log('Saved screenshot:', outPath);
  }

  close() {
    this.ws.close();
  }
}

async function clickByText(cdp, selector, textIncludes) {
  return cdp.eval(`(() => {
    const q = ${JSON.stringify(textIncludes.toLowerCase())};
    const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const target = els.find((el) => (el.textContent || '').toLowerCase().includes(q));
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  })()`);
}

async function main() {
  const userDataDir = `/tmp/chrome-cdp-vitrineiq-${Date.now()}`;
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9231',
      `--user-data-dir=${userDataDir}`,
      '--use-gl=angle',
      '--use-angle=metal',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp;
  try {
    let target;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9231/json/list');
        const list = await res.json();
        target = list.find((t) => t.type === 'page');
        if (target?.webSocketDebuggerUrl) break;
      } catch {}
      await sleep(250);
    }
    if (!target) throw new Error('Chrome CDP target not ready');

    cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await cdp.call('Page.navigate', { url: APP_URL });
    await sleep(2000);

    // 1. Login -> Modo Demonstração
    const loggedDemo = await clickByText(cdp, 'button', 'demonstra');
    console.log('Logged demo:', loggedDemo);
    await sleep(2000);
    await cdp.screenshot('ui_01_cockpit.png');

    // Cockpit Vitrine Radar + Abrir Crowd-Drop modal
    const clickedCrowd = await clickByText(cdp, 'button', 'crowd-drop');
    console.log('Crowd-Drop clicked:', clickedCrowd);
    if (clickedCrowd) {
      await sleep(1000);
      await cdp.screenshot('ui_02_crowddrop.png');
      await cdp.eval(`(() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('fechar') || (b.textContent || '').toLowerCase().includes('fechar'));
        closeBtn?.click();
      })()`);
      await sleep(500);
    }

    // 2. Shopping 3D L1
    await clickByText(cdp, 'aside nav button', 'shopping 3d');
    await sleep(2800);
    await cdp.eval('window.scrollTo(0, 120)');
    await sleep(1200);
    await cdp.screenshot('ui_03_map3d_l1.png');

    // 2º Piso L2
    await clickByText(cdp, 'button', '2º piso');
    await sleep(1600);
    await cdp.screenshot('ui_04_map3d_l2.png');

    // 3. Sensor Vitrine + Raio-X Vitrine
    await clickByText(cdp, 'aside nav button', 'sensor');
    await sleep(1600);
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(600);
    await cdp.screenshot('ui_05_sensor_lgpd.png');

    // 4. Modo Balcão + Voz 4s
    await clickByText(cdp, 'aside nav button', 'balcão');
    await sleep(1400);
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(400);
    await cdp.screenshot('ui_06_balcao_voz.png');

    // 5. Stories (Roleta) modal no topo
    const clickedStories = await clickByText(cdp, 'header button', 'stories');
    console.log('Stories clicked:', clickedStories);
    if (clickedStories) {
      await sleep(800);
      await cdp.screenshot('ui_07_stories_modal.png');
      await cdp.eval(`document.querySelector('dialog button[aria-label*="Fechar"]')?.click()`);
      await sleep(400);
    }

    // 6. LGPD e Auditoria
    await clickByText(cdp, 'aside nav button', 'lgpd');
    await sleep(1300);
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(400);
    await cdp.screenshot('ui_08_lgpd_auditoria.png');

    // 7. Lojistas Multi-Tenant
    await clickByText(cdp, 'aside nav button', 'lojistas');
    await sleep(1200);
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(400);
    await cdp.screenshot('ui_10_lojistas.png');

    // 8. Concierge QR em viewport Mobile iPhone 390x844 @ 2x
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.call('Page.navigate', { url: `${APP_URL}?tela=concierge` });
    await sleep(1800);
    await cdp.screenshot('ui_09_concierge_mobile.png');
  } finally {
    cdp?.close();
    chrome.kill('SIGKILL');
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
