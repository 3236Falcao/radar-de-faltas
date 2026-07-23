/**
 * Diagnóstico da Fase 2 — SEM filtro.
 *
 * Objetivo: descobrir onde está o problema, distinguindo três cenários:
 *   1. a tabela #showAvisos204 não é localizada;
 *   2. a tabela existe mas o tbody não tem linhas;
 *   3. as linhas são lidas normalmente (aí o problema seria só no filtro).
 *
 * Reaproveita o login da Fase 1 e imprime, numerada, a 2ª coluna de cada linha.
 *
 * Uso: npm run diagnostico
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
      console.error('\n❌ Login falhou — o diagnóstico depende de autenticação.');
      process.exitCode = 1;
      return;
    }
    console.log('✅ Autenticado.');

    // Cenário 1: a tabela existe? (breve espera para evitar falso negativo por
    // renderização tardia)
    const tabelaExiste = await page
      .waitForSelector('#showAvisos204', { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!tabelaExiste) {
      console.log('\n⚠️  Tabela #showAvisos204 NÃO localizada na página atual.');
      console.log('    → problema na LOCALIZAÇÃO (a tabela pode exigir navegação até a turma).');
      console.log('\n0 linhas encontradas em #showAvisos204');
      await page.screenshot({
        path: path.join(artifactsDir, 'diagnostico-sem-tabela.png'),
        fullPage: true,
      });
      return;
    }
    console.log('✅ Tabela #showAvisos204 localizada.');

    // Lê a 2ª coluna de cada linha do tbody (sem descartar vazios, para o
    // diagnóstico refletir a quantidade real de linhas).
    const linhas = await page.$$eval('#showAvisos204 tbody tr', (trs) =>
      trs.map((tr) => {
        const tds = tr.querySelectorAll('td');
        return tds[1] ? tds[1].innerText.trim() : '';
      })
    );

    // Cenário 2: tabela existe, mas sem linhas.
    if (linhas.length === 0) {
      console.log('    → problema na LEITURA DO TBODY (tabela achada, zero linhas).');
      console.log('\n0 linhas encontradas em #showAvisos204');
      return;
    }

    // Cenário 3: linhas lidas — imprime o conteúdo bruto da 2ª coluna.
    console.log(`\n── Conteúdo da 2ª coluna (${linhas.length} linha(s)) ──`);
    linhas.forEach((texto, i) => {
      console.log(`[${i + 1}] ${texto}`);
    });
  } catch (err) {
    console.error('\n❌ Erro no diagnóstico:', err.message);
    await page
      .screenshot({ path: path.join(artifactsDir, 'diagnostico-erro.png'), fullPage: true })
      .catch(() => {});
    process.exitCode = 1;
  } finally {
    await context.tracing.stop({ path: path.join(artifactsDir, 'diagnostico-trace.zip') });
    await browser.close();
  }
}

main();
