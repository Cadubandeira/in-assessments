# Deploy do PDF (Vercel) — guia rápido

Este projeto agora gera PDF no servidor usando Puppeteer via endpoint:
- /api/generate-assessment-pdf

## Importante antes de começar

A feature de PDF **não funciona no GitHub Pages** (gh-pages), porque lá não existe backend para /api.

Para funcionar, o app precisa rodar na Vercel (ou outro host com funções Node).

## 1) Publicar na Vercel (primeira vez)

1. Crie conta em https://vercel.com.
2. Clique em Add New > Project.
3. Importe o repositório Cadubandeira/in-assessments.
4. Framework: Vite (detecção automática).
5. Build Command: npm run build.
6. Output Directory: dist.
7. Deploy.

## 2) Variáveis de ambiente

No projeto da Vercel, vá em Settings > Environment Variables.

Adicione (recomendado):
- PDF_RENDER_BASE_URL = URL pública do app em produção (ex.: https://seu-projeto.vercel.app)

Opcional (somente se quiser URL custom para render):
- APP_BASE_URL = mesma URL pública

Observação:
- Se não configurar essas variáveis, o endpoint tenta inferir a URL automaticamente pelo host da requisição.

## 3) Configuração já aplicada no código

- Endpoint serverless: api/generate-assessment-pdf.js
- Controle de custo:
  - rate limit por IP
  - cache em memória com TTL
  - deduplicação de requisições concorrentes
- Timeout da função configurado no vercel.json:
  - maxDuration: 60s

## 4) Teste manual após deploy

1. Abra Results (logado) e clique em Download.
2. Abra PublicResults (link público) e clique em Download.
3. Verifique no PDF:
   - accordions e textos expandidos
   - sem header/nav do site
   - sem seção Atividades a seguir
   - sem seção Próximos Passos

## 5) Como acompanhar custo

No painel da Vercel:
- Functions > invocations/duration
- Usage > bandwidth

No endpoint, os headers ajudam no diagnóstico:
- X-PDF-Cache: HIT | MISS | IN-FLIGHT
- X-RateLimit-Remaining: contador da janela atual

## 6) Problemas comuns

### 404 no /api/generate-assessment-pdf
Causa provável: app rodando via gh-pages.
Solução: usar URL da Vercel.

### Timeout ao gerar PDF
1. Confirmar maxDuration no vercel.json.
2. Reduzir tamanho visual da página (se necessário).
3. Tentar novamente (cache pode ajudar na próxima chamada).

### PDF sem conteúdo esperado
1. Confirmar que a rota renderizada é /#/public-results/:id com query de modo PDF.
2. Confirmar que o id do assessment_event existe e está acessível para página pública.

## 7) Fluxo de deploy daqui pra frente

Sempre que subir mudanças:
1. git push para a branch conectada na Vercel.
2. A Vercel faz deploy automático.
3. Testar os dois botões de Download.

Pronto. Se quiser, na sequência eu posso te entregar um checklist de smoke test de 2 minutos para você executar a cada release.
