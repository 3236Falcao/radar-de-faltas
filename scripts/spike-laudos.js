/**
 * Spike — Fase 2: imprime os avisos das turmas 2º A e 2º B.
 *
 * Reaproveita o login da Fase 1, localiza a tabela #showAvisos204, lê a 2ª
 * coluna de cada linha e imprime apenas os avisos referentes às turmas-alvo.
 *
 * Uso: npm run laudos
 */
import { chromium } from 'playwright';
import { config, requireCredentials } from '../src/config.js';
import { login } from '../src/login.js';
import { extrairAvisos, filtrarAvisosDasTurmas, TERMOS_TURMAS } from '../src/laudos.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const artifactsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'artifacts'
);

async function main() {
  const credentials = requireCredentials();

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.headless ? 0 : 250,
  });
  const context = await browser.newContext();
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  try {
    await page.goto(config.entryUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    const autenticado = await login(page, credentials);
    if (!autenticado) {
      console.error('\n❌ Login falhou — a Fase 2 depende de autenticação.');
      process.exitCode = 1;
      return;
    }

    const avisos = await extrairAvisos(page);
    const daTurma = filtrarAvisosDasTurmas(avisos);

    console.log(`\n══ Avisos das turmas ${TERMOS_TURMAS.slice(0, 2).join(' / ')} … ══`);
    if (daTurma.length === 0) {
      console.log('  (nenhum aviso referente às turmas 2º A ou 2º B)');
    } else {
      for (const aviso of daTurma) {
        console.log(`  • ${aviso}`);
      }
      console.log(`\n  Total: ${daTurma.length} aviso(s).`);
    }
  } catch (err) {
    console.error('\n❌ Erro na Fase 2:', err.message);
    await page
      .screenshot({ path: path.join(artifactsDir, 'laudos-erro.png'), fullPage: true })
      .catch(() => {});
    process.exitCode = 1;
  } finally {
    await context.tracing.stop({ path: path.join(artifactsDir, 'laudos-trace.zip') });
    await browser.close();
  }
}

main();
