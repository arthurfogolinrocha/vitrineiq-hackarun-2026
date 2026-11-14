#!/usr/bin/env node
/**
 * E2E Smoke & Auditoria WCAG DOM para o VitrineIQ.
 *
 * Variáveis de ambiente suportadas:
 *   BASE_URL        URL do frontend (padrão: http://127.0.0.1:4173)
 *   API_URL         URL da API FastAPI (padrão: http://127.0.0.1:8000)
 *   E2E_USER        Usuário para login (fallback: ADMIN_USUARIO)
 *   E2E_PASS        Senha para login (fallback: ADMIN_SENHA)
 *   E2E_ALLOW_DEMO  "1" permite fallback para o botão de demonstração se E2E_PASS não estiver definido
 *   PLAYWRIGHT_PATH Caminho opcional para entrypoint do playwright / playwright-core
 *   CHROME_PATH     Caminho opcional para binário Chrome/Chromium local
 *   HEADLESS        "false" abre o navegador visível (padrão: "true")
 *   E2E_AXE_STRICT  "1" falha em qualquer violação axe-core WCAG 2A/2AA além das estruturais
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const API_URL = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const E2E_USER = process.env.E2E_USER || process.env.ADMIN_USUARIO || '';
const E2E_PASS = process.env.E2E_PASS || process.env.ADMIN_SENHA || '';
const E2E_ALLOW_DEMO = process.env.E2E_ALLOW_DEMO === '1';
const HEADLESS = process.env.HEADLESS !== 'false';
const AXE_STRICT = process.env.E2E_AXE_STRICT === '1';

const CHROMIUM_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

function findLocalChrome() {
  return CHROMIUM_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

async function loadPlaywright() {
  const customPath = process.env.PLAYWRIGHT_PATH;
  if (customPath) {
    const resolved = path.resolve(customPath);
    const mod = await import(pathToFileURL(resolved).href);
    return { chromium: mod.chromium ?? mod.default?.chromium, isCore: resolved.includes('playwright-core') };
  }

  for (const pkg of ['playwright', 'playwright-core']) {
    try {
      const mod = await import(pkg);
      return { chromium: mod.chromium ?? mod.default?.chromium, isCore: pkg === 'playwright-core' };
    } catch {
      // tenta o próximo pacote
    }
  }

  throw new Error(
    'Playwright não encontrado. Instale via `npx playwright` / `npm install --no-save playwright` ou defina PLAYWRIGHT_PATH.'
  );
}

function resolveAxeSource() {
  const require = createRequire(import.meta.url);
  const searchPaths = [process.cwd()];
  if (process.env.PLAYWRIGHT_PATH) {
    searchPaths.push(path.dirname(path.resolve(process.env.PLAYWRIGHT_PATH)));
  }
  for (const base of searchPaths) {
    try {
      const axeEntry = require.resolve('axe-core', { paths: [base] });
      return fs.readFileSync(axeEntry, 'utf8');
    } catch {
      // axe-core opcional
    }
  }
  return null;
}

async function checkApiHealth() {
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} em ${API_URL}/api/health`);
    }
    return true;
  } catch (err) {
    if (E2E_ALLOW_DEMO) {
      console.warn(`[e2e-smoke] API indisponível (${err.message}); seguindo com modo demonstração.`);
      return false;
    }
    throw new Error(`API inacessível em ${API_URL}/api/health: ${err.message}`);
  }
}

function attachErrorListeners(page, label) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const loc = msg.location()?.url ? ` (${msg.location().url})` : '';
      consoleErrors.push(`[${label}] console.error: ${msg.text()}${loc}`);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(`[${label}] pageerror: ${err.message}`);
  });

  return { consoleErrors, pageErrors };
}

async function waitForSuspenseSettled(page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Carregando módulo VitrineIQ…'),
    { timeout: 10000 }
  );
}

async function runDomAudit(page, label, { axeSource, checkOverflow = true } = {}) {
  await page.waitForLoadState('domcontentloaded');
  await waitForSuspenseSettled(page);

  const report = await page.evaluate((shouldCheckOverflow) => {
    const htmlLang = document.documentElement.getAttribute('lang') || '';
    const title = (document.title || '').trim();
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const hasOverflow = shouldCheckOverflow && scrollWidth > clientWidth + 1;

    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const unlabeledControls = [];
    for (const el of document.querySelectorAll('input, select, textarea')) {
      if (el instanceof HTMLInputElement && el.type === 'hidden') continue;
      if (!isVisible(el)) continue;
      const ariaLabel = (el.getAttribute('aria-label') || '').trim();
      const ariaLabelledBy = (el.getAttribute('aria-labelledby') || '').trim();
      const hasForLabel = 'labels' in el && el.labels && el.labels.length > 0;
      const hasWrappingLabel = Boolean(el.closest('label'));
      if (!ariaLabel && !ariaLabelledBy && !hasForLabel && !hasWrappingLabel) {
        unlabeledControls.push(el.outerHTML.slice(0, 120));
      }
    }

    const emptyButtons = [];
    for (const btn of document.querySelectorAll('button')) {
      if (!isVisible(btn)) continue;
      const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      const ariaLabel = (btn.getAttribute('aria-label') || '').trim();
      const ariaLabelledBy = (btn.getAttribute('aria-labelledby') || '').trim();
      const titleAttr = (btn.getAttribute('title') || '').trim();
      if (!text && !ariaLabel && !ariaLabelledBy && !titleAttr) {
        emptyButtons.push(btn.outerHTML.slice(0, 120));
      }
    }

    const brokenImages = [];
    for (const img of document.querySelectorAll('img')) {
      if (img.complete && img.naturalWidth === 0) {
        brokenImages.push(img.getAttribute('src') || img.outerHTML.slice(0, 120));
      }
    }

    return {
      htmlLang,
      title,
      scrollWidth,
      clientWidth,
      hasOverflow,
      unlabeledControls,
      emptyButtons,
      brokenImages,
    };
  }, checkOverflow);

  const failures = [];
  if (report.htmlLang.toLowerCase() !== 'pt-br') {
    failures.push(`lang esperado "pt-BR", encontrado "${report.htmlLang}"`);
  }
  if (!report.title) {
    failures.push('<title> vazio');
  }
  if (report.hasOverflow) {
    failures.push(`overflow horizontal detectado (${report.scrollWidth}px > ${report.clientWidth}px)`);
  }
  if (report.unlabeledControls.length > 0) {
    failures.push(`controles sem label (${report.unlabeledControls.length}): ${report.unlabeledControls.join(' | ')}`);
  }
  if (report.emptyButtons.length > 0) {
    failures.push(`botões sem nome acessível (${report.emptyButtons.length}): ${report.emptyButtons.join(' | ')}`);
  }
  if (report.brokenImages.length > 0) {
    failures.push(`imagens quebradas (${report.brokenImages.length}): ${report.brokenImages.join(' | ')}`);
  }

  if (axeSource) {
    const hasAxe = await page.evaluate(() => Boolean(window.axe));
    if (!hasAxe) {
      await page.addScriptTag({ content: axeSource });
    }
    const axeResults = await page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      });
    });
    const structuralRules = new Set(['label', 'button-name', 'image-alt', 'html-has-lang', 'document-title']);
    for (const v of axeResults.violations) {
      const msg = `axe [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nós)`;
      if (AXE_STRICT || structuralRules.has(v.id)) {
        failures.push(msg);
      } else {
        console.warn(`[e2e-smoke] (${label}) aviso ${msg}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`[${label}] Falha na auditoria WCAG/DOM:\n - ${failures.join('\n - ')}`);
  }

  console.log(
    `[e2e-smoke] OK ${label} | lang=${report.htmlLang} | viewport=${report.clientWidth}px (scroll=${report.scrollWidth}px)`
  );
}

async function runPublicConciergeFlow(browser, axeSource) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = attachErrorListeners(page, 'Concierge 390x844');

  try {
    await page.goto(`${BASE_URL}/?tela=concierge`, { waitUntil: 'networkidle' });
    await page.locator('#qr-query').waitFor({ state: 'visible', timeout: 10000 });
    await runDomAudit(page, 'Concierge Público (390x844)', { axeSource, checkOverflow: true });

    await page.fill('#qr-query', 'Presente masculino até R$ 150');
    const submitBtn = page.locator('form button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(400);
    await runDomAudit(page, 'Concierge Pós-Busca (390x844)', { axeSource, checkOverflow: true });

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error([...consoleErrors, ...pageErrors].join('\n'));
    }
  } finally {
    await context.close();
  }
}

async function runAuthenticatedDesktopFlow(browser, axeSource, apiAvailable) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = attachErrorListeners(page, 'Desktop 1440x900');

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.locator('#login-usuario').waitFor({ state: 'visible', timeout: 10000 });
    await runDomAudit(page, 'Login (1440x900)', { axeSource, checkOverflow: true });

    if (apiAvailable && E2E_USER && E2E_PASS) {
      await page.fill('#login-usuario', E2E_USER);
      await page.fill('#login-senha', E2E_PASS);
      await page.click('form button[type="submit"]');
    } else if (E2E_ALLOW_DEMO) {
      await page.locator('button:has-text("demonstração")').first().click();
    } else {
      throw new Error(
        'Credenciais ausentes para o fluxo autenticado. Defina E2E_USER/E2E_PASS (ou ADMIN_USUARIO/ADMIN_SENHA), ou use E2E_ALLOW_DEMO=1.'
      );
    }

    const desktopNav = page.locator('nav[aria-label="Módulos do VitrineIQ"]');
    await desktopNav.waitFor({ state: 'visible', timeout: 15000 });
    await runDomAudit(page, 'Aba Inicial Cockpit (1440x900)', { axeSource, checkOverflow: true });

    // Verifica <dialog> nativo fechando com Escape
    const openModalBtn = page.locator('button:has-text("Criar")').first();
    await openModalBtn.waitFor({ state: 'visible', timeout: 10000 });
    await openModalBtn.click();
    await page.locator('dialog[open]').waitFor({ state: 'visible', timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 0, {
      timeout: 5000,
    });
    console.log('[e2e-smoke] OK <dialog> fechado corretamente com Escape');

    // Navega por todas as abas visíveis no menu desktop
    const tabButtons = desktopNav.locator('button');
    const tabCount = await tabButtons.count();
    for (let i = 0; i < tabCount; i++) {
      const btn = tabButtons.nth(i);
      const label = (await btn.innerText()).replace(/\s+/g, ' ').trim();
      await btn.click();
      await waitForSuspenseSettled(page);
      await page.waitForTimeout(250);
      await runDomAudit(page, `Aba "${label}" (1440x900)`, { axeSource, checkOverflow: true });

      if (label.includes('LGPD')) {
        await page.locator('text=Controles Ativos').first().waitFor({ state: 'visible', timeout: 5000 });
      }
    }

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error([...consoleErrors, ...pageErrors].join('\n'));
    }
  } finally {
    await context.close();
  }
}

async function main() {
  console.log(`[e2e-smoke] BASE_URL=${BASE_URL} | API_URL=${API_URL}`);
  const apiAvailable = await checkApiHealth();
  const { chromium, isCore } = await loadPlaywright();
  const axeSource = resolveAxeSource();
  console.log(
    `[e2e-smoke] Playwright carregado | axe-core=${axeSource ? 'ativo' : 'fallback DOM WCAG'}`
  );

  const launchOptions = {
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  };

  if (process.env.CHROME_PATH) {
    launchOptions.executablePath = process.env.CHROME_PATH;
  } else if (isCore) {
    const localChrome = findLocalChrome();
    if (!localChrome) {
      throw new Error('playwright-core requer CHROME_PATH ou Chrome/Chromium instalado no sistema.');
    }
    launchOptions.executablePath = localChrome;
  }

  let browser;
  try {
    browser = await chromium.launch(launchOptions);
    await runPublicConciergeFlow(browser, axeSource);
    await runAuthenticatedDesktopFlow(browser, axeSource, apiAvailable);
    console.log('[e2e-smoke] Todos os fluxos E2E e verificações WCAG passaram com sucesso.');
  } finally {
    await browser?.close();
  }
}

main().catch((err) => {
  console.error('[e2e-smoke] FALHA:', err?.stack || err?.message || err);
  process.exit(1);
});
