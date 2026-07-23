/**
 * Fase 2 — Avisos do quadro de laudos referentes às turmas 2º A e 2º B.
 *
 * Estrutura real confirmada pelo HTML pós-login:
 *   - a tabela de avisos tem id `#showAvisos204`;
 *   - cada linha do <tbody> é um aviso;
 *   - a 2ª coluna (<td> índice 1) contém o texto do aviso.
 *
 * O login da Fase 1 é reaproveitado por quem chama (a `page` chega autenticada).
 */

/**
 * Termos que identificam as turmas de interesse, já na forma normalizada.
 * Todas as variações ("2º A", "2°A", "2° A", …) colapsam para "2A" / "2B".
 */
export const TERMOS_TURMAS = ['2A', '2B'];

/**
 * Normaliza o texto de um aviso para comparação:
 *   maiúsculas → remove º e ° → remove espaços.
 * Ex.: "2º A", "2°A", "2° A" → "2A".
 * @param {string} texto
 * @returns {string}
 */
export function normalizar(texto) {
  return (texto ?? '')
    .toUpperCase()
    .replaceAll('º', '')
    .replaceAll('°', '')
    .replaceAll(' ', '');
}

/**
 * Lê a tabela #showAvisos204 por completo (a tabela é um DataTable paginado)
 * e devolve o texto da 2ª coluna de TODAS as linhas, em todas as páginas.
 *
 * Estratégia: usa a API do DataTables (que mantém todas as linhas em memória,
 * independente da paginação). Se a API não estiver disponível, cai no fallback
 * que navega pelo botão "Próximo" até a última página.
 *
 * @param {import('playwright').Page} page  já autenticada
 * @returns {Promise<string[]>} textos dos avisos, na ordem da tabela
 */
export async function extrairAvisos(page) {
  await page.waitForSelector('#showAvisos204', { timeout: 15_000 });

  // 1) Caminho preferido: API do DataTables → todas as páginas de uma vez.
  const viaApi = await page.evaluate(() => {
    const jq = window.jQuery || window.$;
    if (!jq || !jq.fn || !jq.fn.dataTable || !jq.fn.dataTable.isDataTable('#showAvisos204')) {
      return null; // API indisponível → usar fallback
    }
    const dt = jq('#showAvisos204').DataTable();
    // nodes() de rows() traz os <tr> de todas as páginas (mesmo as ocultas);
    // textContent funciona em nós desanexados do DOM (innerText não).
    return dt
      .rows()
      .nodes()
      .toArray()
      .map((tr) => {
        const celulas = tr.querySelectorAll('td');
        return celulas[1] ? celulas[1].textContent.trim() : '';
      });
  });

  const textos = viaApi ?? (await extrairViaPaginacao(page));
  return textos.filter((t) => t.length > 0);
}

/**
 * Fallback: percorre as páginas clicando no botão "Próximo" do DataTables,
 * lendo a 2ª coluna do tbody visível em cada página até o botão desabilitar.
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
async function extrairViaPaginacao(page) {
  const acumulado = [];
  // Garante começar na primeira página, se o botão existir.
  const primeiro = await page.$('#showAvisos204_first');
  if (primeiro && !(await primeiro.evaluate((el) => el.classList.contains('disabled')))) {
    await primeiro.click();
    await page.waitForTimeout(300);
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pagina = await page.$$eval('#showAvisos204 tbody tr', (linhas) =>
      linhas.map((tr) => {
        const celulas = tr.querySelectorAll('td');
        return celulas[1] ? celulas[1].innerText.trim() : '';
      })
    );
    acumulado.push(...pagina);

    const proximo = await page.$('#showAvisos204_next');
    if (!proximo) break;
    const desabilitado = await proximo.evaluate((el) => el.classList.contains('disabled'));
    if (desabilitado) break;

    await proximo.click();
    await page.waitForTimeout(300); // aguarda o redraw do DataTables
  }

  return acumulado;
}

/**
 * Filtra os avisos que citam alguma das turmas-alvo. Função pura.
 * Normaliza cada aviso e usa `String.includes` (sem regex) para cada termo.
 * @param {string[]} avisos
 * @param {string[]} termos  termos já normalizados
 * @returns {string[]}
 */
export function filtrarAvisosDasTurmas(avisos, termos = TERMOS_TURMAS) {
  return avisos.filter((aviso) => {
    const normalizado = normalizar(aviso);
    return termos.some((termo) => normalizado.includes(termo));
  });
}
