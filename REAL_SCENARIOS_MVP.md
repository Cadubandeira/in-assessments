# Simulação Adaptativa com IA + Pressão Contextual Real
## MVP Implementation Plan

---

## 📋 Resgate de Conhecimento

### Conceito Central

**Em vez de questionário estático:** Um cenário vivo que muda conforme as decisões do usuário, criando um "mini laboratório comportamental" inspirado nos estudos de Daniel Kahneman sobre tomada de decisão.

### Diferencial da Abordagem

**O que NÃO medimos:**
- Resposta "correta" ou "incorreta"
- Score binário (certo vs errado)

**O que MEDIMOS:**
- **Processo cognitivo** da pessoa
- **Padrões decisórios** ao longo do cenário
- **Heurísticas** aplicadas (atalhos mentais)
- **Vieses cognitivos** identificados

### Pressão Contextual Real

A cada decisão, o sistema:
1. **Altera o cenário** baseado na escolha anterior
2. **Introduz pressão** através de:
   - ⏱️ Tempo limitado
   - 📊 Novas informações (relevantes ou ruído)
   - 🤔 Ambiguidade (situações sem resposta clara)
   - 🔥 Consequências crescentes

### Exemplos de Cenários

1. **Conflito entre dois colaboradores**
   - Pressão: Escalada do conflito, envolvimento de outras pessoas
   
2. **Meta sob risco**
   - Pressão: Prazo se aproximando, dados contraditórios, recursos limitados
   
3. **Dilema ético**
   - Pressão: Stakeholders com interesses opostos, transparência vs resultado
   
4. **Cliente insatisfeito**
   - Pressão: Risco de perda de contrato, reputação em jogo
   
5. **Crise reputacional**
   - Pressão: Mídia, redes sociais, tempo de resposta crítico

---

## 🎯 Proposta de MVP

### Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    CENÁRIO ADAPTATIVO                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Apresentação do Contexto Inicial                        │
│     ↓                                                        │
│  2. Decisão do Usuário                                      │
│     ↓                                                        │
│  3. Sistema Analisa & Registra Padrões                      │
│     ↓                                                        │
│  4. Cenário Evolui (+ Pressão Contextual)                   │
│     ↓                                                        │
│  5. Nova Decisão (Loop até fim)                             │
│     ↓                                                        │
│  6. Análise Final & Mapeamento de Indicadores               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Componentes do MVP

#### 1. Estrutura de Dados

**Tabela: `scenario_simulations`**
```sql
CREATE TABLE scenario_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  initial_context TEXT NOT NULL,
  target_indicators JSONB NOT NULL, -- ['lideranca', 'comunicacao', 'etica']
  difficulty_level TEXT NOT NULL, -- 'easy', 'medium', 'hard'
  estimated_duration_minutes INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabela: `scenario_nodes`**
```sql
CREATE TABLE scenario_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenario_simulations(id),
  node_type TEXT NOT NULL, -- 'initial', 'decision', 'consequence', 'final'
  content TEXT NOT NULL,
  pressure_elements JSONB, -- { "time_limit": 60, "ambiguity": "high", "stakes": "critical" }
  decision_options JSONB, -- [{ "text": "...", "next_node": "uuid", "indicators_weight": {...} }]
  cognitive_markers JSONB, -- { "requires_analytical": true, "emotional_load": "high" }
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabela: `scenario_sessions`**
```sql
CREATE TABLE scenario_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_id UUID REFERENCES scenario_simulations(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  decision_path JSONB, -- Caminho completo de decisões
  cognitive_patterns JSONB, -- Padrões identificados
  indicator_mapping JSONB, -- Mapeamento para indicadores mestres
  total_time_seconds INTEGER,
  status TEXT DEFAULT 'in_progress' -- 'in_progress', 'completed', 'abandoned'
);
```

**Tabela: `scenario_decisions`**
```sql
CREATE TABLE scenario_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES scenario_sessions(id),
  node_id UUID REFERENCES scenario_nodes(id),
  option_chosen TEXT NOT NULL,
  time_to_decide_seconds INTEGER,
  cognitive_load_perceived TEXT, -- 'low', 'medium', 'high'
  decision_confidence TEXT, -- 'uncertain', 'moderate', 'confident'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Fluxo da Experiência

**Fase 1: Introdução**
```jsx
<ScenarioIntro
  title={scenario.title}
  context={scenario.initial_context}
  estimatedTime={scenario.estimated_duration_minutes}
  onStart={() => startSession()}
/>
```

**Fase 2: Nó de Decisão**
```jsx
<DecisionNode
  content={currentNode.content}
  options={currentNode.decision_options}
  pressureElements={currentNode.pressure_elements}
  onDecision={(choice, metadata) => recordDecision(choice, metadata)}
  timeLimit={currentNode.pressure_elements?.time_limit}
/>
```

**Fase 3: Consequência & Evolução**
```jsx
<ConsequenceScreen
  result={consequenceOfDecision}
  nextContext={updatedScenario}
  pressureIndicators={['stakes_increased', 'new_constraint_added']}
  onContinue={() => moveToNextNode()}
/>
```

**Fase 4: Análise Final**
```jsx
<ScenarioResults
  cognitivePatterns={analysis.patterns}
  indicatorMapping={analysis.indicators}
  decisionPath={session.decision_path}
  insights={analysis.insights}
/>
```

#### 3. Motor de Análise Cognitiva

**Arquivo: `src/utils/scenarioAnalysis.js`**

```javascript
export const analyzeCognitivePatterns = (decisions, scenario) => {
  const patterns = {
    decision_speed: calculateDecisionSpeed(decisions),
    risk_profile: assessRiskTolerance(decisions),
    analytical_vs_intuitive: classifyThinkingStyle(decisions),
    emotional_regulation: evaluateEmotionalResponses(decisions),
    adaptability: measureAdaptiveness(decisions)
  };

  return {
    patterns,
    indicators: mapToIndicators(patterns, scenario.target_indicators),
    insights: generateInsights(patterns)
  };
};

const calculateDecisionSpeed = (decisions) => {
  // Analisa se pessoa decide rápido (heurística) ou devagar (analítico)
  const avgTime = decisions.reduce((acc, d) => acc + d.time_to_decide_seconds, 0) / decisions.length;
  return avgTime < 30 ? 'fast' : avgTime < 60 ? 'moderate' : 'slow';
};

const assessRiskTolerance = (decisions) => {
  // Analisa se escolhas tendem a ser conservadoras ou arrojadas
  // baseado nos metadados das opções escolhidas
};

const mapToIndicators = (patterns, targetIndicators) => {
  // Mapeia padrões cognitivos para indicadores mestres
  const mapping = {};
  
  targetIndicators.forEach(indicator => {
    switch(indicator) {
      case 'lideranca':
        mapping[indicator] = {
          score: calculateLeadershipScore(patterns),
          evidence: patterns.risk_profile + ' + ' + patterns.emotional_regulation
        };
        break;
      case 'comunicacao':
        mapping[indicator] = {
          score: calculateCommunicationScore(patterns),
          evidence: patterns.adaptability
        };
        break;
      // ... outros indicadores
    }
  });
  
  return mapping;
};
```

#### 4. Elementos de Pressão

**Implementações de Pressão Contextual:**

1. **Tempo Limitado**
```jsx
const [timeRemaining, setTimeRemaining] = useState(pressureElements.time_limit);

useEffect(() => {
  if (timeRemaining > 0) {
    const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
    return () => clearTimeout(timer);
  } else {
    // Decisão forçada ou default
    handleTimeExpired();
  }
}, [timeRemaining]);
```

2. **Informação Incremental**
```jsx
// Revela informações gradualmente durante o nó de decisão
const [visibleInfo, setVisibleInfo] = useState(initialInfo);

useEffect(() => {
  const delays = [3000, 6000, 9000]; // 3s, 6s, 9s
  delays.forEach((delay, idx) => {
    setTimeout(() => {
      setVisibleInfo(prev => [...prev, additionalInfo[idx]]);
    }, delay);
  });
}, []);
```

3. **Ambiguidade Calculada**
```jsx
// Apresenta informações contraditórias para criar dilema
<AmbiguousContext>
  <InfoBlock source="expert_a" stance="positive" />
  <InfoBlock source="expert_b" stance="negative" />
  <InfoBlock source="data" stance="neutral_ambiguous" />
</AmbiguousContext>
```

---

## 🛠️ Plano de Implementação

### Sprint 1: Fundação (1 semana)

1. ✅ Criar tabelas no Supabase
2. ✅ Implementar componente base `RealScenarios.jsx` (já existe!)
3. ✅ Criar estrutura de navegação de cenários
4. ✅ Hook `useScenarioSession` para gerenciar estado

### Sprint 2: Experiência de Usuário (1 semana)

1. ✅ Componente `ScenarioIntro`
2. ✅ Componente `DecisionNode` com timer
3. ✅ Componente `ConsequenceScreen`
4. ✅ Transições suaves entre nós
5. ✅ UI de pressão contextual (timer, alerts, stakes)

### Sprint 3: Motor de Análise (1 semana)

1. ✅ Implementar `scenarioAnalysis.js`
2. ✅ Lógica de mapeamento para indicadores
3. ✅ Componente `ScenarioResults`
4. ✅ Integração com `user_indicator_scores`

### Sprint 4: Conteúdo & Calibração (1 semana)

1. ✅ Criar 3 cenários completos (diferentes níveis)
2. ✅ Testar fluxos de decisão
3. ✅ Calibrar mapeamento de indicadores
4. ✅ Ajustes de UX baseados em testes

### Sprint 5: Polimento & Lançamento (3 dias)

1. ✅ Analytics de uso
2. ✅ Documentação de cenários
3. ✅ Onboarding explicativo
4. ✅ Deploy e testes finais

---

## 🎨 Exemplo de Cenário Completo: "Conflito de Equipe"

### Contexto Inicial
```
Você é gestor de uma equipe de 8 pessoas. Dois colaboradores-chave, 
Ana (desenvolvedora sênior) e Carlos (líder técnico), estão em conflito 
aberto há 2 semanas. A tensão está afetando toda a equipe, e a entrega 
de um projeto importante está em 15 dias.

Ontem, Ana te procurou pedindo para não trabalhar mais com Carlos.
Hoje de manhã, Carlos enviou um e-mail (copiando RH) criticando a 
"falta de profissionalismo" de Ana.

Você tem uma reunião 1:1 com Carlos em 30 minutos.
O que você faz AGORA?
```

### Nó de Decisão 1 (Pressão: Tempo 60s)

**Opções:**
1. **Cancelar a reunião e falar com ambos juntos**
   - Risco: Pode não dar tempo de preparar
   - Indicadores: Comunicação (+), Gestão de Conflitos (?)
   
2. **Manter a reunião com Carlos e ouvir o lado dele primeiro**
   - Risco: Ana pode interpretar como favorecimento
   - Indicadores: Liderança (+), Empatia (+)
   
3. **Envolver RH imediatamente antes da reunião**
   - Risco: Pode escalar desnecessariamente
   - Indicadores: Gestão de Risco (+), Autonomia (-)
   
4. **Adiar tudo e fazer uma investigação mais profunda**
   - Risco: Conflito continua crescendo
   - Indicadores: Análise (+), Assertividade (-)

### Consequência (Baseada na escolha)

**Se escolheu opção 2:**
```
Você mantém a reunião. Carlos entra claramente irritado.
Ele apresenta 5 situações nos últimos 2 meses onde Ana, segundo ele,
"sabotou" suas decisões técnicas na frente da equipe.

Mas no meio da conversa, você percebe que:
- Carlos se sente ameaçado pela competência técnica de Ana
- Há um padrão dele interpretar discordâncias como ataques pessoais
- O e-mail para RH foi uma tentativa de "documentar" e se proteger

[Nova informação aparece aos 45s]: Você recebe um Slack de Ana dizendo 
que está "pensando seriamente em pedir demissão".

Ainda na reunião com Carlos, o que você faz?
```

**Novas opções aparecem...**

---

## 🧪 Métricas de Sucesso do MVP

1. **Engajamento**
   - Taxa de conclusão de cenários > 70%
   - Tempo médio de conclusão: 8-15 minutos
   - Taxa de reacesso: > 30% (pessoas tentando outros cenários)

2. **Qualidade da Análise**
   - Variação de resultados (não todo mundo no mesmo padrão)
   - Correlação entre padrões cognitivos e indicadores
   - Satisfação com insights fornecidos (survey pós-experiência)

3. **Integração com Sistema**
   - Mapeamento correto para `user_indicator_scores`
   - Dados acionáveis para recomendações de assessments

---

## 🚀 Próximos Passos Imediatos

### Para começar AGORA:

1. **Criar as tabelas no Supabase** (executar SQL acima)
2. **Criar primeiro cenário de teste** (reuso de estrutura existente)
3. **Implementar hook `useScenarioSession`**
4. **Conectar `/activities/real-scenarios` com sistema de navegação de cenários**

### Quer que eu implemente algo específico?

Posso começar por:
- [ ] Scripts SQL das tabelas
- [ ] Hook `useScenarioSession` completo
- [ ] Componente `DecisionNode` com timer
- [ ] Motor de análise `scenarioAnalysis.js`
- [ ] Primeiro cenário de exemplo completo

**Qual parte você quer que eu implemente primeiro?**
