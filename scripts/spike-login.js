/**
 * Fase 1 — Login.
 *
 * Autentica no Professor Online usando o fluxo de src/login.js e as
 * credenciais do .env, reportando sucesso/falha.
 *
 * Uso: npm run login
 */
import { chromium } from 'playwright';
import { config, requireCredentials } from '../src/config.js';
import { login } from '../src/login.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const artifactsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'artifacts'
);

async function main() {
  const credentials = requireCredentials(); // falha cedo se faltar .env

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.headless ? 0 : 250,
  });
  const context = await browser.newContext();
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  try {
    await page.goto(config.entryUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    const ok = await login(page, credentials);

    console.log(ok ? '\n✅ Autenticado com sucesso.' : '\n❌ Autenticação falhou.');
    await page.screenshot({
      path: path.join(artifactsDir, `login-${ok ? 'ok' : 'falha'}.png`),
      fullPage: true,
    });
    process.exitCode = ok ? 0 : 1;
  } catch (err) {
    console.error('\n❌ Erro no login:', err.message);
    await page
      .screenshot({ path: path.join(artifactsDir, 'login-erro.png'), fullPage: true })
      .catch(() => {});
    process.exitCode = 1;
  } finally {
    await context.tracing.stop({ path: path.join(artifactsDir, 'login-trace.zip') });
    await browser.close();
  }
}

main();
