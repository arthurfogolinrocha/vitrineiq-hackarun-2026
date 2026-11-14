import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_URL = process.env.CAPTURE_URL || 'https://vitrineiq-capim-dourado.vercel.app/';
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
    await sleep(2500);

    // 1. Login real como Admin para liberar todas as 7 abas (incluindo Contas de Lojistas)
    const loggedAdmin = await cdp.eval(`(() => {
      const userEl = document.querySelector('#login-usuario');
      const passEl = document.querySelector('#login-senha');
      const formBtn = document.querySelector('form button[type="submit"]');
      if (!userEl || !passEl || !formBtn) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(userEl, 'admin');
      userEl.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(passEl, 'VitrineIQ');
      passEl.dispatchEvent(new Event('input', { bubbles: true }));
      formBtn.click();
      return true;
    })()`);
    console.log('Admin login triggered:', loggedAdmin);
    await sleep(2600);
    const hasLojistas = await cdp.eval(`Array.from(document.querySelectorAll('aside nav button')).some(b => (b.textContent || '').toLowerCase().includes('lojistas'))`);
    if (!hasLojistas) {
      const loggedDemo = await clickByText(cdp, 'button', 'demonstra');
      console.log('Fallback demo login:', loggedDemo);
      await sleep(2200);
    }

    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(600);
    await cdp.screenshot('ui_01_cockpit.png');

    // Gráfico Horário de Pico + Ações do Cockpit
    await cdp.eval('window.scrollTo(0, 360)');
    await sleep(800);
    await cdp.screenshot('ui_12_cockpit_chart.png');
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(500);

    // Modal Gerar Cartaz (Stories 9:16) — rola até Campanhas Relâmpago ou ativa Minha Loja
    await cdp.eval('window.scrollTo(0, 950)');
    await sleep(600);
    let clickedCartaz = await clickByText(cdp, 'button', 'gerar cartaz');
    if (!clickedCartaz) {
      await clickByText(cdp, 'aside button', 'minha loja');
      await sleep(1000);
      await cdp.eval('window.scrollTo(0, 950)');
      await sleep(600);
      clickedCartaz = await clickByText(cdp, 'button', 'gerar cartaz');
    }
    console.log('Cartaz clicked:', clickedCartaz);
    if (clickedCartaz) {
      await sleep(900);
      await clickByText(cdp, 'button', 'stories 9:16');
      await sleep(900);
      await cdp.screenshot('ui_13_cartaz916.png');
      await cdp.eval(`(() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('fechar') || (b.textContent || '').toLowerCase().includes('fechar'));
        closeBtn?.click();
      })()`);
      await sleep(500);
    }
    await clickByText(cdp, 'aside button', 'admin geral');
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(400);

    // Cockpit Vitrine Radar + Abrir Crowd-Drop modal
    const clickedCrowd = await clickByText(cdp, 'button', 'crowd-drop');
    console.log('Crowd-Drop clicked:', clickedCrowd);
    if (clickedCrowd) {
      await sleep(1100);
      await cdp.screenshot('ui_02_crowddrop.png');
      await cdp.eval(`(() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('fechar') || (b.textContent || '').toLowerCase().includes('fechar'));
        closeBtn?.click();
      })()`);
      await sleep(500);
    }

    // 2. Shopping 3D L1
    await clickByText(cdp, 'aside nav button', 'shopping 3d');
    await sleep(3200);
    await cdp.eval('window.scrollTo(0, 120)');
    await sleep(1200);
    await cdp.screenshot('ui_03_map3d_l1.png');

    // 2º Piso L2
    await clickByText(cdp, 'button', '2º piso');
    await sleep(1800);
    await cdp.screenshot('ui_04_map3d_l2.png');

    // Subsolo 356 Vagas (ativa automaticamente Raio-X Subsolo)
    await clickByText(cdp, 'button', 'subsolo (356');
    await sleep(1800);
    await cdp.screenshot('ui_04b_map3d_subsolo.png');

    // 3. Sensor Vitrine + Raio-X Multimodal aberto
    await clickByText(cdp, 'aside nav button', 'sensor');
    await sleep(1800);
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(600);
    await cdp.screenshot('ui_05_sensor_lgpd.png');

    const clickedRaiox = await clickByText(cdp, 'button', 'raio-x multimodal');
    console.log('Raio-X modal clicked:', clickedRaiox);
    if (clickedRaiox) {
      for (let i = 0; i < 24; i++) {
        await sleep(500);
        const hasSec = await cdp.eval(`Boolean(document.querySelector('section[aria-label*="Raio-X Multimodal"]'))`);
        if (hasSec) {
          await cdp.eval(`document.querySelector('section[aria-label*="Raio-X Multimodal"]')?.scrollIntoView({ block: 'center' })`);
          break;
        }
      }
      await sleep(700);
      await cdp.screenshot('ui_11_raiox.png');
    }

    // 4. Modo Balcão + Voz 4s
    await clickByText(cdp, 'aside nav button', 'balcão');
    await sleep(1500);
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(500);
    await cdp.screenshot('ui_06_balcao_voz.png');

    // 5. Stories (Roleta) modal no topo
    const clickedStories = await clickByText(cdp, 'button', 'stories');
    console.log('Stories clicked:', clickedStories);
    if (clickedStories) {
      await sleep(900);
      await cdp.screenshot('ui_07_stories_modal.png');
      await cdp.eval(`(() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('fechar') || (b.textContent || '').toLowerCase().includes('fechar'));
        closeBtn?.click();
      })()`);
      await sleep(400);
    }

    // 6. LGPD e Auditoria + Transparência Artigo 6
    await clickByText(cdp, 'aside nav button', 'lgpd');
    await sleep(1500);
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(500);
    await cdp.screenshot('ui_08_lgpd_auditoria.png');
    await cdp.eval('window.scrollTo(0, 420)');
    await sleep(600);
    await cdp.screenshot('ui_14_artigo6.png');

    // 7. Lojistas Multi-Tenant (Real Admin tab!)
    const clickedLojistas = await clickByText(cdp, 'aside nav button', 'lojistas');
    console.log('Lojistas clicked:', clickedLojistas);
    await sleep(1400);
    await cdp.eval('window.scrollTo(0, 0)');
    await sleep(500);
    await cdp.screenshot('ui_10_lojistas.png');

    // 8. Concierge QR em viewport Mobile iPhone 390x844 @ 2x
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.call('Page.navigate', { url: `${APP_URL}?tela=concierge` });
    await sleep(2200);
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
