# Radar de Faltas

Protótipo para validar hipóteses rapidamente.

**Fase atual:** descobrir se é possível autenticar automaticamente no
[Professor Online (Brusque/SC)](https://professor.brusque.sc.gov.br/pol/) usando
Node.js + Playwright.

## Setup

```bash
npm install
npx playwright install chromium   # baixa o navegador
cp .env.example .env              # e preencha as credenciais
```

## Spike em duas etapas

O spike é dividido de propósito: primeiro descobrir como a página funciona,
só depois tentar logar.

```bash
npm run recon   # etapa 1: abre o portal e faz dump dos campos + detecção de CAPTCHA
npm run login   # etapa 2: tenta autenticar de fato (precisa dos seletores da recon)
```

1. **`recon`** não precisa de credenciais. Roda num navegador visível, imprime
   os formulários/campos reais e avisa se há reCAPTCHA/MFA — o maior risco da
   hipótese.
2. Com o resultado da recon, preenche-se os seletores e o critério de sucesso em
   [`src/login.js`](src/login.js).
3. **`login`** usa as credenciais do `.env` e responde a pergunta da fase.

Screenshots e traces de cada execução caem em `artifacts/` (não versionado).
Para inspecionar um trace:

```bash
npx playwright show-trace artifacts/recon-trace.zip
```

## Estrutura

| Caminho | Papel |
| --- | --- |
| `src/config.js` | Lê e valida o `.env` |
| `src/login.js` | Fluxo de login, reutilizável na próxima fase (raspar faltas) |
| `scripts/spike-recon.js` | Reconhecimento da página de login |
| `scripts/spike-login.js` | Tentativa de autenticação |
