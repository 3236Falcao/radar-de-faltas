/**
 * Fluxo de autenticação no Professor Online (Brusque/SC).
 *
 * Campos do formulário de login:
 *   - #fmcpf    (text)     → CPF
 *   - #fmsenha  (password) → senha
 *   - #FUenviar (submit)   → botão "Acessar"
 *   - #fmstatus (hidden)   → enviado pelo próprio form (por isso submetemos
 *                            nativamente, sem montar o POST na mão)
 *
 * Recebe uma `page` já criada (não gerencia o browser) para ser reutilizável
 * em outras fases sem reescrever o login.
 *
 * @param {import('playwright').Page} page  página já em config.entryUrl
 * @param {{ cpf: string, password: string }} credentials
 * @returns {Promise<boolean>} true se autenticou com sucesso
 */
export async function login(page, credentials) {
  await page.fill('#fmcpf', credentials.cpf);
  await page.fill('#fmsenha', credentials.password);

  // Submete o form nativamente para que os campos ocultos (fmstatus) sigam
  // como o site espera. A submissão faz POST na própria URL, então esperamos
  // a navegação resultante.
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 30_000 }),
    page.click('#FUenviar'),
  ]);

  return await isAuthenticated(page);
}

/**
 * Critério de sucesso: se o campo de CPF (#fmcpf) sumiu, saímos da tela de
 * login → autenticado. Se ele continua presente, o login foi recusado (o form
 * recarrega na mesma URL em caso de erro).
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function isAuthenticated(page) {
  const loginVisivel = await page.locator('#fmcpf').count();
  return loginVisivel === 0;
}
