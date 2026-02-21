# Real Scenarios - Guia para Criação de Cenários

## 🎯 Anatomia de um Cenário

Um cenário adaptativo é composto de:

### 1. Scenario Simulation (Cabeçalho)
Define metadados do cenário completo:
- **title**: Nome do cenário
- **description**: Resumo para card de seleção
- **initial_context**: Contexto inicial (HTML)
- **target_indicators**: Array de indicadores que serão medidos
- **difficulty_level**: 'easy', 'medium', 'hard'
- **estimated_duration_minutes**: Tempo estimado

### 2. Scenario Nodes (Pontos de Decisão)
Cada nó representa um momento no cenário:
- **node_type**: 'initial', 'decision', 'consequence', 'final'
- **content**: Texto/HTML do nó
- **pressure_elements**: Elementos de pressão contextual
- **decision_options**: Array de opções de decisão
- **cognitive_markers**: Marcadores para análise cognitiva

---

## 📐 Design Pattern: Fluxo de Decisão

```
[Nó Inicial] → [Decisão 1] → [Consequência 1] → [Decisão 2] → ... → [Nó Final]
       ↓              ↓              ↓                ↓
     Timer      Pressão Aumenta  Nova Info      Dilema Moral
```

### Exemplo de Estrutura:

```
Entry Node (is_entry_node=true)
  ├─ Option A → Node 2 (decisão) → Node 5 (final)
  ├─ Option B → Node 3 (decisão) → Node 6 (final)
  └─ Option C → Node 4 (decisão) → Node 5 (final)
```

---

## 🧩 Elementos de Pressão Contextual

### 1. Time Pressure (Pressão de Tempo)
```json
{
  "time_limit": 45
}
```
- Usuário tem 45 segundos para decidir
- Timer visível causa ansiedade
- **Mede:** Decisão sob estresse, heurística vs análise

### 2. Stakes (Risco/Consequência)
```json
{
  "stakes": "critical"
}
```
Valores: `"low"`, `"moderate"`, `"high"`, `"critical"`
- **Mede:** Regulação emocional, perfil de risco

### 3. Ambiguity (Ambiguidade)
```json
{
  "ambiguity": "high"
}
```
Valores: `"low"`, `"moderate"`, `"high"`
- **Mede:** Tolerância à incerteza, pensamento sistemático

### 4. Combinando Pressões
```json
{
  "time_limit": 30,
  "stakes": "critical",
  "ambiguity": "high",
  "information_overload": true
}
```
**Resultado:** Decisão sob condições extremas (pior cenário possível)

---

## 🎨 Types de Nós

### Decision Node
```json
{
  "node_type": "decision",
  "content": "<p>Você precisa escolher...</p>",
  "decision_options": [
    {
      "text": "Opção conservadora",
      "next_node_id": "uuid-node-2",
      "consequence_text": "Resultado...",
      "indicators_weight": {
        "risk": -0.5,
        "analytical": 0.8
      }
    }
  ]
}
```

### Consequence Node (implícito)
Não é um tipo separado, mas parte do `decision_options`:
- `consequence_text`: O que acontece após a decisão
- `pressure_changes`: Array de novos elementos de pressão

### Final Node
```json
{
  "node_type": "final",
  "content": "<p>Cenário concluído!</p>",
  "decision_options": []
}
```
Trigger para análise cognitiva.

---

## 🧠 Cognitive Markers

Marcadores ajudam a análise a entender o contexto da decisão:

```json
{
  "requires_analytical": true,
  "requires_intuitive": false,
  "requires_empathy": true,
  "emotional_load": "high",
  "cognitive_complexity": "medium",
  "requires_systemic_thinking": false
}
```

### Como usar:

- **requires_analytical**: Decisão requer análise profunda de dados
- **requires_intuitive**: Decisão baseada em feeling/experiência
- **requires_empathy**: Precisa considerar sentimentos de outros
- **emotional_load**: "low", "medium", "high", "critical"
- **cognitive_complexity**: "low", "medium", "high"
- **requires_systemic_thinking**: Pensar em sistema completo, não partes

---

## 🎯 Indicator Weights (Pesos de Indicadores)

Cada opção pode ter pesos que influenciam a análise:

```json
{
  "indicators_weight": {
    "risk": 0.7,           // Escolha arrojada
    "empathy": 0.9,        // Alta empatia
    "analytical": 0.3,     // Pouca análise (intuitivo)
    "decisiveness": 0.8,   // Decisivo
    "collaboration": 0.5   // Neutro
  }
}
```

**Escala:** -1.0 (muito baixo) a 1.0 (muito alto)

Estes pesos NÃO são o score final, mas inputs para o motor de análise.

---

## 🏗️ Criando um Cenário do Zero

### Step 1: Definir Conceito

**Perguntas-chave:**
1. Qual dilema/tensão central?
2. Quais indicadores serão medidos?
3. Qual outcome de aprendizado?

**Exemplo:**
- **Dilema:** Cliente exige feature impossível no prazo
- **Indicadores:** Comunicação, Negociação, Gestão de Expectativas
- **Outcome:** Aprender a dizer "não" de forma construtiva

### Step 2: Desenhar Árvore de Decisão

```
                    [Cliente pede impossível]
                           |
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
    Aceitar           Negociar            Recusar
        ↓                 ↓                   ↓
[Equipe sob         [Cliente resiste]    [Cliente insiste]
 extrema pressão]         ↓                   ↓
       ↓            [Propor alternativa]  [Escalar para 
   [Burnout]              ↓                 gestor]
                    [Acordo ou não]           ↓
                          ↓               [Decisão final]
                      [Final]
```

### Step 3: Escrever Nós

**Contexto Inicial (rico em detalhes):**
```html
<p>Você é Product Manager de um app mobile com 100k usuários.</p>
<p>O CEO acabou de voltar de uma reunião com investidores e quer 
uma funcionalidade de <strong>vídeo chamada multiplayer</strong> implementada 
<strong>em 2 semanas</strong>.</p>
<p>Você sabe que:</p>
<ul>
  <li>Sua equipe atual: 3 devs (1 júnior)</li>
  <li>Feature similarmente complexa levou 8 semanas no último projeto</li>
  <li>Infraestrutura atual não suporta streaming de vídeo</li>
</ul>
<p><strong>O CEO está te esperando para resposta em 1 hora.</strong></p>
```

**Decision Options (variadas e relevantes):**
```json
[
  {
    "text": "Aceitar o prazo e tentar fazer acontecer",
    "next_node_id": "node-burnout",
    "indicators_weight": {
      "risk": 0.9,
      "assertiveness": -0.5,
      "people_management": -0.3
    }
  },
  {
    "text": "Explicar tecnicamente por que é impossível e propor alternativa",
    "next_node_id": "node-negotiation",
    "indicators_weight": {
      "communication": 0.9,
      "technical_credibility": 0.8,
      "creativity": 0.7
    }
  },
  {
    "text": "Pedir reunião com CTO para avaliar viabilidade técnica",
    "next_node_id": "node-escalation",
    "indicators_weight": {
      "collaboration": 0.8,
      "risk": -0.2,
      "autonomy": -0.4
    }
  },
  {
    "text": "Propor MVP reduzido (vídeo 1-on-1 sem multiplayer) para 2 semanas",
    "next_node_id": "node-compromise",
    "indicators_weight": {
      "negotiation": 0.9,
      "pragmatism": 0.8,
      "creativity": 0.6
    }
  }
]
```

### Step 4: Adicionar Pressão Incremental

À medida que cenário avança:

**Nó 1:** 
```json
{"time_limit": 60, "stakes": "moderate"}
```

**Nó 3 (após 2 decisões):**
```json
{"time_limit": 45, "stakes": "high", "ambiguity": "moderate"}
```

**Nó 5 (próximo ao final):**
```json
{"time_limit": 30, "stakes": "critical", "ambiguity": "high"}
```

### Step 5: Escrever Consequence Texts

Devem ser:
- **Específicos:** "CEO franze a testa" (não "ele não gosta")
- **Reveladores:** Mostrar informação nova
- **Evolutivos:** Cenário muda, não só reage

**Exemplo:**
```html
<p>Você explica a complexidade técnica para o CEO.</p>
<p>Ele ouve atentamente, mas parece frustrado: "Entendo a parte técnica, 
mas o investidor já falou com a imprensa. Sai matéria na TechCrunch amanhã."</p>
<p><strong>Nova informação:</strong> A feature foi prometida publicamente.</p>
<p>O CTO te manda um Slack: "Posso conseguir um SDK third-party que 
reduz o desenvolvimento para 4 semanas. Mas é caro e pode ter bugs."</p>
```

Agora há novos elementos de pressão:
- **Reputacional:** Promessa pública
- **Técnico:** Solução alternativa com trade-offs
- **Temporal:** Matéria sai amanhã

---

## 🧪 Testing Checklist

Antes de publicar um cenário:

### Estrutura
- [ ] Cenário tem nó de entrada (`is_entry_node=true`)
- [ ] Todos os caminhos levam a um nó final
- [ ] Não há nós órfãos (sem caminho para chegar neles)
- [ ] `next_node_id` de todas as opções aponta para nós existentes

### Conteúdo
- [ ] Contexto inicial é claro e engajante
- [ ] Dilema é relevante para público-alvo
- [ ] Opções são balanceadas (não há "resposta obviamente certa")
- [ ] Consequence texts fazem sentido dadas as decisões

### Pressão
- [ ] Elementos de pressão aumentam gradualmente
- [ ] Combinação de pressões cria experiência desafiadora mas justa
- [ ] Timer (se presente) é razoável (não impossível)

### Indicadores
- [ ] `target_indicators` correspondem a nomes em `indicators_master`
- [ ] `indicators_weight` reflete natureza real da decisão
- [ ] Há variedade (não todo option com mesmo peso)

### Análise
- [ ] Testar com diferentes padrões de decisão
- [ ] Verificar se scores finais fazem sentido
- [ ] Insights gerados são acionáveis

---

## 💡 Boas Práticas

### Do ✅
- **Teste você mesmo:** Complete o cenário 3x com estratégias diferentes
- **Dilemas reais:** Baseie em situações que você ou seu público enfrentam
- **Ambiguidade proposital:** Não há "certo", só trade-offs
- **Pressão variada:** Misture tempo, risco, ambiguidade, emoção
- **Consequences interessantes:** Surpreenda o usuário

### Don't ❌
- **Obviamente certo:** "Opção A: Fazer o certo. Opção B: Ser antiético."
- **Irrelevante:** Cenário que ninguém vai vivenciar
- **Muito longo:** >12 minutos cansa
- **Muito curto:** <5 minutos não mede bem
- **Linear demais:** Todo caminho igual

---

## 📚 Exemplos de Cenários (Ideias)

### 1. "Deadline Impossível"
- **Dilema:** Cliente quer feature impossível no prazo
- **Indicadores:** Negociação, Comunicação, Gestão de Expectativas
- **Pressão:** Tempo, risco reputacional, pressão do CEO

### 2. "Feedback Difícil"
- **Dilema:** Colaborador sênior tem performance em queda, time está insatisfeito
- **Indicadores:** Liderança, Comunicação, Empatia
- **Pressão:** Emocional alta, ambiguidade (razões da queda), risco de perder pessoa-chave

### 3. "Dilema Ético"
- **Dilema:** Descobrir que empresa está usando dados de forma questionável
- **Indicadores:** Ética, Coragem, Tomada de Decisão
- **Pressão:** Reputacional, financeiro (pode perder emprego), ambiguidade legal

### 4. "Crise de Produto"
- **Dilema:** Bug crítico em produção afetando 30% dos usuários
- **Indicadores:** Gestão de crise, Priorização, Comunicação
- **Pressão:** Tempo extremo, stakeholders múltiplos, informação parcial

### 5. "Transição de Liderança"
- **Dilema:** Promovido a gestor, ex-colega agora te reporta e está resistindo
- **Indicadores:** Liderança, Influência, Gestão de Mudança
- **Pressão:** Emocional, político (outros observando), ambiguidade de fronteiras

---

## 🚀 Template SQL para Novo Cenário

```sql
-- Criar cenário
INSERT INTO scenario_simulations (
  id,
  title,
  description,
  initial_context,
  target_indicators,
  difficulty_level,
  estimated_duration_minutes,
  is_active
) VALUES (
  gen_random_uuid(),
  'SEU_TÍTULO',
  'SUA_DESCRIÇÃO',
  '<p>SEU_CONTEXTO_INICIAL</p>',
  '["Indicador 1", "Indicador 2"]'::jsonb,
  'medium',
  10,
  false  -- Iniciar como inativo, ativar após testar
) RETURNING id;

-- Copiar o UUID retornado e usar em scenario_id abaixo

-- Criar nó de entrada
INSERT INTO scenario_nodes (
  scenario_id,
  node_type,
  content,
  pressure_elements,
  decision_options,
  cognitive_markers,
  display_order,
  is_entry_node
) VALUES (
  'UUID_DO_CENARIO'::uuid,
  'decision',
  '<p>TEXTO_DO_NÓ</p>',
  '{"time_limit": 60, "stakes": "moderate"}'::jsonb,
  '[
    {
      "text": "Opção 1",
      "next_node_id": "UUID_PRÓXIMO_NÓ",
      "consequence_text": "Resultado...",
      "indicators_weight": {"risk": 0.5}
    }
  ]'::jsonb,
  '{"requires_analytical": true}'::jsonb,
  1,
  true
);

-- Repetir para outros nós...
-- Garantir que último nó seja type='final'
```

---

## 🎓 Recursos para Aprender Mais

### Livros
- **"Thinking, Fast and Slow"** - Daniel Kahneman (fundamento teórico)
- **"Designing Games"** - Tynan Sylvester (design de experiências)
- **"The Mom Test"** - Rob Fitzpatrick (entender dilemas reais)

### Ferramentas
- **Twine** - Visual tool para escrever narrativas interativas
- **Miro/Figma** - Desenhar árvore de decisões
- **Notion** - Documentar cenários completos

---

**Divirta-se criando cenários memoráveis! 🎮🧠**
