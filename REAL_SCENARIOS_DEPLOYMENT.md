# Real Scenarios MVP - Deployment Guide

## 📦 O que foi implementado

### 1. Database Schema
- ✅ 4 tabelas criadas (`scenario_simulations`, `scenario_nodes`, `scenario_sessions`, `scenario_decisions`)
- ✅ RLS policies configuradas
- ✅ Helper functions para gestão de sessões
- ✅ Triggers para `updated_at`

### 2. Backend Logic
- ✅ Hook `useScenarioSession` - gerenciamento completo de sessão
- ✅ Motor de análise cognitiva (`scenarioAnalysis.js`)
- ✅ Integração automática com `user_indicator_scores`

### 3. Frontend Components
- ✅ `DecisionNode` - nó de decisão com timer e pressão contextual
- ✅ `ConsequenceScreen` - tela de consequências entre decisões
- ✅ `ScenarioResults` - análise final e insights
- ✅ `RealScenarios` - página principal com fluxo completo

### 4. Seed Data
- ✅ Cenário completo: "Conflito de Equipe"
- ✅ 5+ nós de decisão com múltiplos caminhos
- ✅ Elementos de pressão configurados

---

## 🚀 Steps para Deploy

### Step 1: Executar SQL no Supabase

```bash
# 1. Acessar Supabase Dashboard > SQL Editor

# 2. Executar schema (criar tabelas)
supabase/setup_real_scenarios.sql

# 3. Executar seed data (cenário de exemplo)
supabase/seed_scenario_conflict.sql
```

### Step 2: Verificar Permissões RLS

No Supabase Dashboard:
1. Ir em **Authentication > Policies**
2. Verificar que todas as policies das tabelas de cenários estão ativas
3. Testar com usuário regular se consegue ver cenários ativos

### Step 3: Build & Deploy

```bash
# Instalar dependências (se necessário)
npm install

# Build de produção
npm run build

# Deploy (dependendo da plataforma)
npm run deploy
# ou
vercel --prod
# ou
netlify deploy --prod
```

### Step 4: Testar no Ambiente

1. **Login como usuário**
2. **Navegar para `/activities`**
3. **Clicar em "Situações Reais"**
4. **Verificar lista de cenários**
5. **Iniciar cenário "Conflito de Equipe"**
6. **Completar fluxo até resultados**
7. **Verificar se `user_indicator_scores` foi atualizado**

---

## 🧪 Checklist de Validação

### Database
- [ ] Tabelas criadas sem erros
- [ ] Seed data inserido com sucesso
- [ ] RLS policies ativas
- [ ] Functions `get_active_scenarios` e `complete_scenario_session` funcionando

### Frontend
- [ ] Rota `/activities/real-scenarios` acessível
- [ ] Lista de cenários carrega corretamente
- [ ] Ao clicar em cenário, navegação para `/activities/real-scenarios/:scenarioId`
- [ ] Tela de introdução exibe contexto do cenário
- [ ] Botão "Iniciar Simulação" funciona

### Fluxo de Sessão
- [ ] Sessão é criada ao iniciar simulação
- [ ] Nó inicial é carregado
- [ ] Timer funciona corretamente (se configurado)
- [ ] Opções de decisão são clicáveis
- [ ] Metadata (confiança, carga cognitiva) é coletada
- [ ] Transição para consequence screen funciona
- [ ] Navegação entre nós respeita decision_options.next_node_id

### Análise e Resultados
- [ ] Ao chegar no nó final, análise é executada
- [ ] Padrões cognitivos são calculados
- [ ] Mapeamento para indicadores funciona
- [ ] Tela de resultados exibe insights
- [ ] `user_indicator_scores` é atualizado no banco

### Edge Cases
- [ ] Abandono de sessão (status = 'abandoned')
- [ ] Timeout de decisão (auto-submit)
- [ ] Erro de navegação (nó não encontrado)
- [ ] Usuário não autenticado (redirect para login)

---

## 🐛 Troubleshooting

### Erro: "Cenário não encontrado"
**Causa:** Seed data não foi executado ou cenário está inativo
**Solução:** 
```sql
-- Verificar se cenário existe
SELECT * FROM scenario_simulations WHERE is_active = true;

-- Ativar cenário
UPDATE scenario_simulations SET is_active = true WHERE id = 'UUID_DO_CENARIO';
```

### Erro: "Nó inicial não encontrado"
**Causa:** Nenhum nó marcado com `is_entry_node = true`
**Solução:**
```sql
-- Verificar nós do cenário
SELECT id, is_entry_node FROM scenario_nodes WHERE scenario_id = 'UUID_DO_CENARIO';

-- Marcar nó como entry
UPDATE scenario_nodes SET is_entry_node = true WHERE id = 'UUID_DO_NO';
```

### Erro: RLS Policy bloqueando insert
**Causa:** Policy de `scenario_sessions` pode estar muito restritiva
**Solução:**
```sql
-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'scenario_sessions';

-- Se necessário, dropar e recriar policy
DROP POLICY IF EXISTS "scenario_sessions_insert_own" ON scenario_sessions;
CREATE POLICY "scenario_sessions_insert_own" ON scenario_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Indicadores não são atualizados
**Causa:** Mapeamento de nomes de indicadores não encontra correspondência
**Solução:**
```sql
-- Verificar indicadores mestres existentes
SELECT id, name FROM indicators_master;

-- Ajustar target_indicators do cenário para corresponder aos nomes reais
UPDATE scenario_simulations
SET target_indicators = '["Nome Exato do Indicador"]'::jsonb
WHERE id = 'UUID_DO_CENARIO';
```

###Pages RealScenarios não carrega
**Causa:** Import de componentes pode estar errado
**Solução:**
```javascript
// Verificar imports em RealScenarios.jsx
import DecisionNode from '../components/DecisionNode';
import ConsequenceScreen from '../components/ConsequenceScreen';
import ScenarioResults from '../components/ScenarioResults';
```

---

## 📊 Métricas de Sucesso (pós-deploy)

### Curto Prazo (primeira semana)
- [ ] Pelo menos 10 sessões iniciadas
- [ ] Taxa de conclusão > 60%
- [ ] Tempo médio de conclusão: 8-15 minutos
- [ ] Nenhum erro crítico reportado

### Médio Prazo (primeiro mês)
- [ ] 50+ sessões completadas
- [ ] Taxa de reacesso: > 20% (pessoas tentando outros cenários se houver)
- [ ] Variação nos padrões cognitivos identificados
- [ ] Feedback qualitativo positivo sobre insights

### Longo Prazo (3 meses)
- [ ] 200+ sessões completadas
- [ ] 2-3 cenários adicionais criados
- [ ] Correlação visível entre padrões cognitivos e indicadores mestres
- [ ] Feature usada como diferencial comercial

---

## 🔧 Manutenção e Evolução

### Adicionar Novos Cenários

1. **Criar registro em `scenario_simulations`**
```sql
INSERT INTO scenario_simulations (title, description, initial_context, target_indicators, difficulty_level, estimated_duration_minutes, is_active)
VALUES ('Título', 'Descrição', 'Contexto HTML', '["Indicador 1", "Indicador 2"]'::jsonb, 'medium', 10, true);
```

2. **Criar nós do cenário**
- Definir nó de entrada (`is_entry_node = true`)
- Criar árvore de decisões
- Garantir que todos os caminhos levam a um nó final

3. **Testar fluxo completo**
- Percorrer todos os caminhos possíveis
- Validar lógica de mapeamento de indicadores

### Calibrar Análise Cognitiva

Editar `src/utils/scenarioAnalysis.js`:

```javascript
// Ajustar pesos de mapeamento
const calculateLeadershipScore = (patterns) => {
  return Math.round(
    patterns.emotional_regulation.score * 0.4 + // ← Ajustar peso
    patterns.risk_profile.score * 0.3 +
    patterns.adaptability.score * 0.3
  );
};
```

### Adicionar Novos Padrões Cognitivos

```javascript
export const analyzeCognitivePatterns = (decisions, scenario) => {
  const patterns = {
    // ... padrões existentes
    new_pattern: measureNewPattern(decisions) // ← Adicionar novo
  };
  
  // ...resto do código
};

const measureNewPattern = (decisions) => {
  // Implementar lógica de análise
  return {
    score: 75,
    profile: 'example',
    description: 'Descrição do padrão'
  };
};
```

---

## 📝 Próximos Passos Sugeridos

### Fase 2: Melhorias
1. **Admin UI para criar cenários** (sem precisar SQL)
2. **Preview de cenários** antes de publicar
3. **Analytics dashboard** de uso de cenários
4. **Comparação de resultados** entre usuários (percentil)
5. **Badges e conquistas** por completar cenários

### Fase 3: IA Real
1. **Integração com OpenAI** para gerar consequências dinâmicas
2. **NPCs conversacionais** (falar com Ana, Carlos, etc)
3. **Cenários gerados por IA** baseados em perfil do usuário
4. **Adaptação dinâmica de dificuldade**

### Fase 4: Gamificação
1. **XP dobrado** para cenários difíceis
2. **Rankings** de melhor gestão de cenários
3. **Desafios semanais** com cenários exclusivos
4. **Modo competitivo** (multiplayer decisions)

---

## 🎓 Recursos Adicionais

### Entendendo a Análise Cognitiva

O motor analisa 7 dimensões:

1. **decision_speed** - Velocidade vs Análise (Sistema 1 vs 2 - Kahneman)
2. **risk_profile** - Arrojado vs Conservador
3. **thinking_style** - Analítico vs Intuitivo
4. **emotional_regulation** - Controle sob pressão
5. **adaptability** - Flexibilidade estratégica
6. **cognitive_load_management** - Reconhecimento de complexidade
7. **consistency** - Padrão vs Variabilidade

Cada dimensão gera um score 0-100 que é mapeado para indicadores mestres.

### Customizando Indicadores

No seed data, definir `target_indicators`:

```json
["Liderança", "Comunicação", "Gestão de Conflitos"]
```

Na análise (`scenarioAnalysis.js`), criar mapeamento:

```javascript
if (normalized.includes('gestao de conflitos')) {
  score = calculateConflictManagementScore(patterns);
  evidence = [/* ... */];
}
```

---

## ✅ Conclusão

O MVP está completo e pronto para deploy. Todos os componentes foram implementados e integrados. 

**Arquivos criados:**
- `supabase/setup_real_scenarios.sql` - Schema completo
- `supabase/seed_scenario_conflict.sql` - Cenário de exemplo
- `src/hooks/useScenarioSession.js` - Hook de sessão
- `src/utils/scenarioAnalysis.js` - Motor de análise
- `src/components/DecisionNode.jsx` - Componente de decisão
- `src/components/ConsequenceScreen.jsx` - Tela de consequências
- `src/components/ScenarioResults.jsx` - Resultados e insights
- `src/pages/RealScenarios.jsx` - Página principal (reescrita completa)
- `src/App.jsx` - Rota com parâmetro adicionada

**Próximo passo:** Executar SQL no Supabase e testar! 🚀
