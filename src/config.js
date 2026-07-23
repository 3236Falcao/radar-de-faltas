import 'dotenv/config';

/**
 * Configuração do spike, lida do .env.
 *
 * A validação é intencionalmente dividida:
 *  - `config` sempre carrega (a recon precisa só da URL de entrada);
 *  - `requireCredentials()` só é chamado pelo fluxo de login, falhando cedo
 *    e com mensagem clara caso usuário/senha não estejam preenchidos.
 */
export const config = {
  entryUrl:
    process.env.PO_ENTRY_URL ??
    'https://professor.brusque.sc.gov.br/pol/index.php?op=RUVGc2pBSkljNVNyZw==',
  cpf: process.env.PO_CPF ?? '',
  password: process.env.PO_PASSWORD ?? '',
  headless: process.env.HEADLESS === 'true',
};

/**
 * Garante que há credenciais antes de tentar autenticar.
 * O login do Professor Online é feito com CPF + senha.
 * @returns {{ cpf: string, password: string }}
 */
export function requireCredentials() {
  const faltando = [];
  if (!config.cpf) faltando.push('PO_CPF');
  if (!config.password) faltando.push('PO_PASSWORD');

  if (faltando.length > 0) {
    throw new Error(
      `Variáveis de ambiente ausentes: ${faltando.join(', ')}. ` +
        'Copie .env.example para .env e preencha as credenciais.'
    );
  }

  return { cpf: config.cpf, password: config.password };
}
