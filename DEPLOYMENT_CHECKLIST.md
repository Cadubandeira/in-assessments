# 🚀 Real Scenarios - Deployment Checklist

Use este checklist para garantir que tudo está funcionando após o deploy.

---

## ✅ Pre-Deploy

### Database Setup
- [ ] **Acessar Supabase Dashboard** → SQL Editor
- [ ] **Executar** `supabase/setup_real_scenarios.sql`
  - [ ] 4 tabelas criadas sem erros
  - [ ] RLS policies ativas
  - [ ] Functions criadas
- [ ] **Executar** `supabase/seed_scenario_conflict.sql`
  - [ ] 1 cenário inserido
  - [ ] 5+ nós criados
  - [ ] Nó de entrada marcado (`is_entry_node=true`)
- [ ] **Verificar dados:**
  ```sql
  SELECT * FROM scenario_simulations WHERE is_active = true;
  SELECT * FROM scenario_nodes WHERE is_entry_node = true;
  ```

### Code Review
- [ ] **Sem erros de compilação** (verificado via `get_errors`)
- [ ] **Imports corretos** em RealScenarios.jsx
- [ ] **Rota com parâmetro** adicionada em App.jsx
- [ ] **Build bem-sucedido:** `npm run build`

---

## ✅ Deploy

### Build & Push
- [ ] **Instalar dependências** (se necessário): `npm install`
- [ ] **Build de produção**: `npm run build`
- [ ] **Deploy** (dependendo da plataforma):
  ```bash
  npm run deploy
  # ou
  vercel --prod
  # ou
  netlify deploy --prod
  ```
- [ ] **Verificar deploy URL** (sem erros HTTP)

---

## ✅ Post-Deploy Validation

### 1. Acesso Básico
- [ ] **Login** como usuário regular
- [ ] **Navegar** para `/activities`
- [ ] **Ver** card "Situações Reais"
- [ ] **Clicar** "Abrir simulação"
- [ ] **URL muda** para `/activities/real-scenarios`

### 2. Lista de Cenários
- [ ] **Página carrega** sem loader infinito
- [ ] **Card do cenário** "Conflito de Equipe" aparece
- [ ] **Informações visíveis:** 
  - [ ] Título
  - [ ] Descrição
  - [ ] Duração (12 min)
  - [ ] Dificuldade (Medium)
  - [ ] Número de indicadores (3)
- [ ] **Botão "Iniciar"** presente

### 3. Intro Screen
- [ ] **Clicar** em "Iniciar" no card
- [ ] **URL muda** para `/activities/real-scenarios/:scenarioId`
- [ ] **Tela de intro** renderiza:
  - [ ] Título do cenário
  - [ ] Descrição
  - [ ] Contexto inicial (HTML formatado)
  - [ ] Metadados (duração, dificuldade, indicadores)
  - [ ] Botão "Iniciar Simulação"

### 4. Sessão de Decisão
- [ ] **Clicar** "Iniciar Simulação"
- [ ] **Nó inicial carrega** sem erro
- [ ] **Timer aparece** (se configurado)
- [ ] **Opções de decisão** renderizadas (A, B, C, D)
- [ ] **Clicar em opção**:
  - [ ] Opção fica destacada (bg azul)
  - [ ] Metadata form aparece (confiança, complexidade)
- [ ] **Preencher metadata** e **clicar "Confirmar"**
- [ ] **Transição** para próximo nó ou consequence screen

### 5. Consequence Screen
- [ ] **Consequence text** renderiza corretamente
- [ ] **Pressure indicators** aparecem (se houver)
- [ ] **Botão "Continuar"** funcional
- [ ] **Navegação** para próximo nó de decisão

### 6. Fluxo Completo
- [ ] **Percorrer** até nó final
- [ ] **Analysis screen** aparece:
  - [ ] Insights exibidos
  - [ ] Padrões cognitivos com scores
  - [ ] Indicadores impactados
  - [ ] Session metadata (tempo total, número de decisões)
- [ ] **Botão "Voltar para Atividades"** funcional

### 7. Database Verification
```sql
-- Verificar sessão criada
SELECT * FROM scenario_sessions WHERE user_id = 'SEU_USER_ID' ORDER BY started_at DESC LIMIT 1;

-- Verificar decisões registradas
SELECT * FROM scenario_decisions WHERE session_id = 'SESSION_ID_ACIMA';

-- Verificar indicadores atualizados
SELECT * FROM user_indicator_scores WHERE user_id = 'SEU_USER_ID';
```

- [ ] **Sessão** existe e status = 'completed'
- [ ] **Decisões** foram salvas (>= 1 row)
- [ ] **Indicator scores** foram atualizados
- [ ] **Cognitive patterns** preenchidos na sessão

---

## ✅ Edge Cases

### Abandono de Sessão
- [ ] **Iniciar** um cenário
- [ ] **Clicar** "Abandonar cenário" (durante decisão)
- [ ] **Verificar** que sessão tem status 'abandoned':
  ```sql
  SELECT status FROM scenario_sessions WHERE id = 'SESSION_ID';
  ```

### Timeout de Decisão
- [ ] **Nó com timer**
- [ ] **Não clicar** em nenhuma opção
- [ ] **Aguardar timer** chegar em 0
- [ ] **Verificar** comportamento (auto-submit ou erro)

### Segundo Cenário
- [ ] **Voltar** para `/activities/real-scenarios`
- [ ] **Tentar iniciar** o mesmo cenário novamente
- [ ] **Nova sessão** é criada (não reusa anterior)

### Usuário Não Autenticado
- [ ] **Logout**
- [ ] **Tentar acessar** `/activities/real-scenarios`
- [ ] **Redirect** para login funciona

---

## ✅ Performance

### Load Times
- [ ] **Lista de cenários** carrega em < 2s
- [ ] **Intro screen** carrega em < 1s
- [ ] **Nó de decisão** aparece em < 1s
- [ ] **Consequence** transição suave
- [ ] **Analysis** completa em < 3s

### Browser Compatibility
- [ ] **Chrome** (latest)
- [ ] **Firefox** (latest)
- [ ] **Safari** (latest)
- [ ] **Mobile** (responsive OK)

---

## ✅ Analytics (Opcional, mas recomendado)

### Setup Tracking
- [ ] **Eventos** instrumentados:
  - `scenario_started`
  - `decision_made`
  - `scenario_completed`
  - `scenario_abandoned`
- [ ] **Propriedades** capturadas:
  - `scenario_id`
  - `decision_time`
  - `cognitive_patterns`
  - `completion_rate`

---

## 🐛 Se Algo Falhar

### "Cenário não encontrado"
```sql
-- Verificar se cenário está ativo
UPDATE scenario_simulations SET is_active = true WHERE id = 'UUID';
```

### "Nó inicial não encontrado"
```sql
-- Verificar e corrigir entry node
UPDATE scenario_nodes SET is_entry_node = true 
WHERE scenario_id = 'UUID' AND id = 'UUID_DO_NÓ';
```

### "RLS Policy blocking"
```sql
-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'scenario_sessions';

-- Re-criar policy se necessário (ver setup_real_scenarios.sql)
```

### "Analysis not working"
- [ ] **Verificar console** para erros JavaScript
- [ ] **Checar** se `scenarioAnalysis.js` foi importado corretamente
- [ ] **Validar** que `target_indicators` correspondem a nomes reais

### Build Errors
- [ ] **Limpar cache:** `rm -rf node_modules .next dist`
- [ ] **Re-instalar:** `npm install`
- [ ] **Build novamente:** `npm run build`

---

## 📊 Success Metrics (Primeira Semana)

Após 1 semana de produção, verificar:

### Engagement
```sql
-- Total de sessões iniciadas
SELECT COUNT(*) FROM scenario_sessions;

-- Taxa de conclusão
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as completion_rate
FROM scenario_sessions;

-- Tempo médio
SELECT AVG(total_time_seconds) / 60.0 as avg_minutes
FROM scenario_sessions WHERE status = 'completed';
```

### Targets
- [ ] **>= 10 sessões** iniciadas
- [ ] **>= 60% completion rate**
- [ ] **8-15 min** tempo médio
- [ ] **0 erros críticos** reportados

---

## 🎉 All Green?

**Parabéns! MVP está no ar e funcional! 🚀**

### Próximos Passos
1. **Monitorar** uso nos próximos 7 dias
2. **Coletar feedback** de primeiros usuários
3. **Iterar** em análise cognitiva se necessário
4. **Planejar** próximos cenários

---

**Checklist criado para In Assessments - Real Scenarios MVP**
*Data: ${new Date().toLocaleDateString()}*
