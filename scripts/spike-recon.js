/**
 * Spike — Etapa 1: Reconhecimento.
 *
 * Objetivo: abrir a página de entrada num navegador REAL e responder,
 * sem chutes e sem credenciais:
 *   - Que formulários e campos existem? (name/id/type)
 *   - Para onde e como o form envia? (action/method)
 *   - Há CAPTCHA ou 2º fator bloqueando a automação?
 *
 * As respostas aqui é que vão preencher src/login.js. Enquanto não rodarmos
 * isto, qualquer seletor no login é adivinhação.
 *
 * Uso: npm run recon
 */
import { chromium } from 'playwright';
import { config } from '../src/config.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const artifactsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'artifacts'
);

async function main() {
  console.log(`\n▶ Abrindo: ${config.entryUrl}`);
  console.log(`  Modo: ${config.headless ? 'headless' : 'headed (janela visível)'}\n`);

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.headless ? 0 : 250,
  });
  const context = await browser.newContext();

  // Trace ajuda a inspecionar depois: `npx playwright show-trace artifacts/recon-trace.zip`
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  try {
    await page.goto(config.entryUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // 1) Formulários e campos
    const forms = await page.$$eval('form', (fs) =>
      fs.map((f) => ({
        action: f.getAttribute('action'),
        method: (f.getAttribute('method') || 'GET').toUpperCase(),
        campos: Array.from(f.querySelectorAll('input, select, textarea')).map((el) => ({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          id: el.getAttribute('id'),
          placeholder: el.getAttribute('placeholder'),
        })),
        botoes: Array.from(f.querySelectorAll('button, input[type=submit]')).map(
          (b) => b.innerText || b.value || null
        ),
      }))
    );

    console.log('── Formulários encontrados ──');
    if (forms.length === 0) {
      console.log('  (nenhum <form> no HTML — login pode ser via JS/iframe/redirect)');
    } else {
      console.dir(forms, { depth: null });
    }

    // 2) Detecção de CAPTCHA / MFA — o maior risco da hipótese
    const antiBot = await page.evaluate(() => {
      const html = document.documentElement.outerHTML.toLowerCase();
      const frames = Array.from(document.querySelectorAll('iframe')).map(
        (i) => i.src || ''
      );
      return {
        recaptcha:
          html.includes('recaptcha') || frames.some((s) => s.includes('recaptcha')),
        hcaptcha: html.includes('hcaptcha') || frames.some((s) => s.includes('hcaptcha')),
        turnstile: html.includes('turnstile') || html.includes('challenges.cloudflare'),
        iframes: frames,
      };
    });

    console.log('\n── Sinais de anti-bot / MFA ──');
    console.log(`  reCAPTCHA:  ${antiBot.recaptcha ? '⚠️  SIM' : 'não'}`);
    console.log(`  hCaptcha:   ${antiBot.hcaptcha ? '⚠️  SIM' : 'não'}`);
    console.log(`  Turnstile:  ${antiBot.turnstile ? '⚠️  SIM' : 'não'}`);
    if (antiBot.iframes.length) {
      console.log('  iframes:', antiBot.iframes);
    }

    // 3) Onde paramos (redirects contam a história)
    console.log(`\n── Estado final ──`);
    console.log(`  URL atual: ${page.url()}`);
    console.log(`  Título:    ${await page.title()}`);

    const shot = path.join(artifactsDir, 'recon.png');
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`\n📸 Screenshot: ${shot}`);
  } catch (err) {
    console.error('\n❌ Falha na recon:', err.message);
    await page
      .screenshot({ path: path.join(artifactsDir, 'recon-erro.png'), fullPage: true })
      .catch(() => {});
    process.exitCode = 1;
  } finally {
    await context.tracing.stop({ path: path.join(artifactsDir, 'recon-trace.zip') });
    await browser.close();
    console.log('\n✓ Recon concluída. Use o que apareceu acima para preencher src/login.js.\n');
  }
}

main();
