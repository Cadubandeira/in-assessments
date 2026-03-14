# Deploy do PDF (Vercel) — usando o MESMO projeto

Este projeto agora gera PDF no servidor usando Puppeteer no endpoint:
- /api/generate-assessment-pdf

## Importante antes de começar

Você **não precisa criar outro projeto** na Vercel.

Use o mesmo projeto já existente e faça apenas:
1. subir o código novo,
2. configurar variável de ambiente,
3. redeploy.

> Observação: a feature de PDF não funciona em gh-pages, porque lá não existe backend para /api.

## 1) Atualizar o mesmo projeto já existente

1. Faça commit/push destas mudanças para a branch conectada na Vercel.
2. Aguarde o deploy automático da Vercel (ou clique em Redeploy).

## 2) Configurar variável no projeto atual

    No painel da Vercel do seu projeto atual:
    1. Settings > Environment Variables.
    2. Adicione:
    - PDF_RENDER_BASE_URL = URL pública do próprio projeto (ex.: https://seu-projeto.vercel.app)
3. Salve.
4. Faça Redeploy para aplicar a variável.

Opcional:
- APP_BASE_URL = mesma URL pública (não obrigatório).

## 3) O que já está pronto no código

- Endpoint serverless: api/generate-assessment-pdf.js
- Timeout da função no vercel.json:
  - maxDuration: 60s
- Controle de custo:
  - rate limit por IP
  - cache em memória com TTL
  - deduplicação de requisições concorrentes

## 4) Teste rápido (2 minutos)

1. Acesse sua URL da Vercel (não a do gh-pages).
2. Abra um resultado em Results (logado) e clique Download.
3. Abra um link em PublicResults e clique Download.
4. Valide no PDF:
   - accordions e textos expandidos
   - sem header/nav do site
   - sem seção Atividades a seguir
   - sem seção Próximos Passos

Teste técnico extra (opcional):
- Abra https://SEU-DOMINIO/api/generate-assessment-pdf no navegador.
- Se aparecer 405/erro de método em vez de 404, a function existe e está publicada.

## 5) Como acompanhar custo no mesmo projeto

No painel da Vercel:
- Functions > invocations/duration
- Usage > bandwidth

No endpoint, headers úteis:
- X-PDF-Cache: HIT | MISS | IN-FLIGHT
- X-RateLimit-Remaining: contador da janela atual

## 6) Problemas comuns

### 404 no /api/generate-assessment-pdf
Causa provável: você está abrindo a URL do gh-pages, não da Vercel.
Solução: testar e usar sempre a URL da Vercel.

### Download não acontece
1. Confirmar que o deploy da branch mais recente terminou com sucesso.
2. Confirmar variável PDF_RENDER_BASE_URL configurada.
3. Fazer Redeploy após salvar variável.

### Timeout ao gerar PDF
1. Confirmar maxDuration no vercel.json.
2. Tentar novamente (cache pode ajudar nas próximas requisições).

### PDF sem conteúdo esperado
1. Confirmar render em /#/public-results/:id com query de modo PDF.
2. Confirmar que o id de assessment_event existe e está acessível.

## 7) Fluxo daqui pra frente

Sempre que houver mudança:
1. git push na branch conectada.
2. Vercel faz deploy automático.
3. Testar os dois botões de Download.
