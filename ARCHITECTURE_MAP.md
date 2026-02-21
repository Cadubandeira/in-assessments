# 🗺️ Real Scenarios - Architecture Map

Visual overview da solução completa implementada.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📱 RealScenarios.jsx (Main Controller)                        │
│     ├── Phase: 'list' → ScenarioList                          │
│     ├── Phase: 'intro' → ScenarioIntro                        │
│     ├── Phase: 'running' → DecisionNode / ConsequenceScreen   │
│     └── Phase: 'results' → ScenarioResults                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎣 useScenarioSession Hook                                    │
│     ├── Session Management                                     │
│     ├── Decision Recording                                     │
│     ├── Node Navigation                                        │
│     └── Analysis Trigger                                       │
│                                                                 │
│  🧠 scenarioAnalysis.js                                        │
│     ├── Cognitive Pattern Detection                           │
│     ├── Indicator Mapping                                      │
│     └── Insight Generation                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💾 scenario_simulations (Scenarios)                           │
│  💾 scenario_nodes (Decision Graph)                            │
│  💾 scenario_sessions (User Journey)                           │
│  💾 scenario_decisions (Individual Choices)                    │
│  💾 user_indicator_scores (Impact)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados

### 1. Inicialização
```
User clicks "Real Scenarios"
         ↓
RealScenarios.jsx (phase='list')
         ↓
Fetch from scenario_simulations (WHERE is_active=true)
         ↓
Display ScenarioList
```

### 2. Início de Sessão
```
User selects scenario
         ↓
RealScenarios.jsx (phase='intro')
         ↓
Display context, metadata
         ↓
User clicks "Iniciar"
         ↓
RealScenarios.jsx (phase='running')
         ↓
useScenarioSession hook initializes
         ↓
CREATE scenario_session row
         ↓
FETCH entry node (is_entry_node=true)
         ↓
Render DecisionNode
```

### 3. Loop de Decisão
```
User views decision options
         ↓
User selects option + metadata
         ↓
makeDecision() called
         ↓
INSERT into scenario_decisions
         ↓
UPDATE scenario_sessions.decision_path
         ↓
Check next_node_id
         ↓
    ├─ If has next_node → Show ConsequenceScreen
    │        ↓
    │   Continue to next DecisionNode
    │        ↓
    │   (repeat loop)
    │
    └─ If no next_node → completeSession()
             ↓
        (go to Analysis)
```

### 4. Análise & Finalização
```
completeSession() triggered
         ↓
Call analyzeCognitivePatterns()
         ↓
Calculate 7 pattern dimensions
         ↓
Map patterns → indicators
         ↓
Generate insights
         ↓
RPC complete_scenario_session()
         ↓
UPDATE scenario_sessions (status='completed', patterns, indicators)
         ↓
For each indicator:
    ├─ FETCH indicators_master (by name)
    ├─ UPSERT user_indicator_scores
    └─ Weighted average (70% old + 30% new)
         ↓
RealScenarios.jsx (phase='results')
         ↓
Render ScenarioResults
```

---

## 🧩 Component Hierarchy

```
App.jsx
  └── Route: /activities/real-scenarios/:scenarioId?
        └── RealScenarios.jsx
              │
              ├── Phase: 'list'
              │     └── [ScenarioCard, ScenarioCard, ...]
              │
              ├── Phase: 'intro'
              │     └── Intro Screen
              │           ├── Title, Description
              │           ├── Initial Context (HTML)
              │           ├── Metadata (duration, difficulty)
              │           └── Button: "Iniciar Simulação"
              │
              ├── Phase: 'running'
              │     ├── DecisionNode
              │     │     ├── Pressure Indicators (Timer, Stakes, Ambiguity)
              │     │     ├── Node Content (HTML)
              │     │     ├── Decision Options (A, B, C, D)
              │     │     └── Metadata Form (Confidence, Complexity)
              │     │
              │     └── ConsequenceScreen
              │           ├── Consequence Text
              │           ├── Pressure Changes
              │           └── Button: "Continuar"
              │
              └── Phase: 'results'
                    └── ScenarioResults
                          ├── Session Metadata (time, decisions)
                          ├── Insights (cards)
                          ├── Cognitive Patterns (scores)
                          ├── Indicator Mapping (bars)
                          └── Button: "Voltar para Atividades"
```

---

## 🎯 State Machine (RealScenarios.jsx)

```
              ┌─────────┐
              │  list   │ ◄─── Initial state
              └────┬────┘
                   │ (user selects scenario)
                   ↓
              ┌─────────┐
              │  intro  │
              └────┬────┘
                   │ (user clicks "Iniciar")
                   ↓
           ┌───────────────┐
           │   running     │ ◄─┐
           └───┬───────────┘   │
               │                │
               ├─ DecisionNode  │
               │       ↓        │
               ├─ makeDecision  │
               │       ↓        │
               ├─ Consequence   │
               │       ↓        │
               └─ (loop) ───────┘
                   │
                   │ (final node reached)
                   ↓
              ┌─────────┐
              │ results │
              └────┬────┘
                   │ (user clicks "Voltar")
                   ↓
              /activities
```

---

## 🧠 Cognitive Analysis Pipeline

```
decisions[] (raw data from session)
         ↓
┌──────────────────────────────────┐
│  Calculate Individual Patterns   │
├──────────────────────────────────┤
│ • decision_speed                 │
│ • risk_profile                   │
│ • thinking_style                 │
│ • emotional_regulation           │
│ • adaptability                   │
│ • cognitive_load_management      │
│ • consistency                    │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│   Map to Indicator Scores         │
├──────────────────────────────────┤
│ IF indicator = "Liderança":      │
│   score = emotional_reg * 0.4 +  │
│           risk_profile * 0.3 +   │
│           adaptability * 0.3     │
│                                  │
│ IF indicator = "Comunicação":    │
│   score = adaptability * 0.4 +   │
│           thinking_style * 0.3 + │
│           consistency * 0.3      │
│ ...                              │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│      Generate Insights           │
├──────────────────────────────────┤
│ IF decision_speed = 'fast':      │
│   → "Agilidade Decisória"        │
│                                  │
│ IF risk_profile = 'risk_averse': │
│   → "Abordagem Conservadora"     │
│ ...                              │
└────────────┬─────────────────────┘
             ↓
         {analysis}
  (patterns, indicators, insights)
```

---

## 📊 Data Model Relationships

```
scenario_simulations
  ├── id (PK)
  ├── title
  ├── description
  ├── initial_context
  ├── target_indicators (JSONB)
  ├── difficulty_level
  └── is_active
       │
       │ (1:N)
       ↓
scenario_nodes
  ├── id (PK)
  ├── scenario_id (FK) ────┐
  ├── node_type            │
  ├── content              │
  ├── pressure_elements    │ (JSONB)
  ├── decision_options     │ (JSONB with next_node_id references)
  ├── cognitive_markers    │ (JSONB)
  └── is_entry_node        │
       │                   │
       │ (references)      │
       └─────────┐         │
                 │         │
                 ↓         ↓
       ┌──────────────────────┐
       │   Decision Graph     │
       │  (Node Navigation)   │
       └──────────────────────┘


scenario_sessions
  ├── id (PK)
  ├── user_id (FK to auth.users)
  ├── scenario_id (FK to scenario_simulations)
  ├── decision_path (JSONB array of node_ids)
  ├── cognitive_patterns (JSONB)
  ├── indicator_mapping (JSONB)
  ├── status ('in_progress' | 'completed' | 'abandoned')
  └── total_time_seconds
       │
       │ (1:N)
       ↓
scenario_decisions
  ├── id (PK)
  ├── session_id (FK)
  ├── node_id (FK)
  ├── option_index
  ├── option_text
  ├── time_to_decide_seconds
  ├── decision_confidence
  └── cognitive_load_perceived


user_indicator_scores
  ├── user_id (FK)
  ├── indicator_id (FK to indicators_master)
  ├── percentage
  └── updated_at
       ↑
       │ (updated by scenario analysis)
       │
       └── scenario_sessions.indicator_mapping
```

---

## ⚡ Performance Considerations

### Database Queries
```
1. Load scenarios:
   SELECT * FROM scenario_simulations WHERE is_active = true
   → Index: is_active

2. Load nodes:
   SELECT * FROM scenario_nodes WHERE scenario_id = ? ORDER BY display_order
   → Index: (scenario_id, display_order)

3. Get entry node:
   SELECT id FROM scenario_nodes WHERE scenario_id = ? AND is_entry_node = true
   → Index: (scenario_id, is_entry_node) WHERE is_entry_node = true

4. Record decision:
   INSERT INTO scenario_decisions (...)
   → No specific index needed (write-heavy)

5. Update indicator scores:
   UPSERT user_indicator_scores (...)
   → Unique constraint: (user_id, indicator_id)
```

### Bottlenecks & Mitigations
| Potential Bottleneck | Mitigation |
|---------------------|------------|
| Large node tree load | Paginate nodes (load on demand) |
| Complex analysis calculation | Cache pattern calculations |
| Frequent indicator updates | Batch updates at session end |
| RLS policy overhead | Use service role for internal operations |

---

## 🔒 Security Model

### RLS Policies
```
scenario_simulations
  ├── SELECT: Everyone (WHERE is_active=true)
  └── ALL: Admin only

scenario_nodes
  ├── SELECT: Everyone (WHERE parent scenario is active)
  └── ALL: Admin only

scenario_sessions
  ├── SELECT: Own sessions only (WHERE user_id = auth.uid())
  ├── INSERT: Own sessions only (WITH CHECK user_id = auth.uid())
  ├── UPDATE: Own sessions only
  └── Admin: All operations

scenario_decisions
  ├── SELECT: Own decisions only (via session check)
  ├── INSERT: Own decisions only
  └── Admin: SELECT all

user_indicator_scores
  ├── SELECT: Own scores only
  └── UPSERT: Via service role (from analysis)
```

### Authentication Flow
```
User not logged in
       ↓
Try to access /activities/real-scenarios
       ↓
ProtectedLayout checks auth.getUser()
       ↓
    ├─ If authenticated → Render RealScenarios
    └─ If not → Redirect to /login
```

---

## 📦 File Structure

```
in-assessments/
├── src/
│   ├── hooks/
│   │   └── useScenarioSession.js          # Session management hook
│   ├── utils/
│   │   └── scenarioAnalysis.js            # Cognitive analysis engine
│   ├── components/
│   │   ├── DecisionNode.jsx               # Decision UI with timer
│   │   ├── ConsequenceScreen.jsx          # Result of decision
│   │   └── ScenarioResults.jsx            # Final analysis display
│   ├── pages/
│   │   └── RealScenarios.jsx              # Main controller
│   └── App.jsx                            # Routing
│
├── supabase/
│   ├── setup_real_scenarios.sql           # Schema + RLS + Functions
│   └── seed_scenario_conflict.sql         # Example scenario data
│
└── docs/
    ├── REAL_SCENARIOS_MVP.md              # Concept document
    ├── REAL_SCENARIOS_DEPLOYMENT.md       # Deploy guide
    ├── SCENARIO_CREATION_GUIDE.md         # Content creation tutorial
    ├── REAL_SCENARIOS_SUMMARY.md          # Executive summary
    ├── DEPLOYMENT_CHECKLIST.md            # QA checklist
    └── ARCHITECTURE_MAP.md                # This file
```

---

## 🎨 UI Flow Screenshots (Conceptual)

### 1. Lista de Cenários
```
┌───────────────────────────────────────────┐
│  Situações Reais                          │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ 🔥 Conflito de Equipe               │ │
│  │ Dois colaboradores em conflito...   │ │
│  │                                     │ │
│  │ [12 min] [Médio] [3 indicadores]   │ │
│  │                    [Iniciar →]     │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ 📊 Cliente Insatisfeito             │ │
│  │ Cliente ameaça cancelar contrato... │ │
│  │ ...                                 │ │
│  └─────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### 2. Nó de Decisão
```
┌───────────────────────────────────────────┐
│  [⏱️ 45s] [🔥 Alto Risco]                 │
│                                           │
│  Você precisa decidir rapidamente.       │
│  Carlos chegará em 30 minutos...         │
│                                           │
│  O que você faz?                          │
│                                           │
│  ○ A  Cancelar reunião e falar com...    │
│  ● B  Manter reunião com Carlos...       │
│  ○ C  Envolver RH imediatamente...       │
│  ○ D  Adiar e investigar mais...         │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ Confiança: [Incerto|Moderado|✓Confiante]│
│  │ Complexidade: [Fácil|✓Média|Difícil]│ │
│  │                                     │ │
│  │      [Confirmar Decisão →]         │ │
│  └─────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### 3. Tela de Resultados
```
┌───────────────────────────────────────────┐
│  🏆 Análise Completa                      │
│                                           │
│  [10min 32s] [5 decisões]                │
│                                           │
│  Principais Insights:                     │
│  ✅ Agilidade Decisória                   │
│  ⚠️  Abordagem Conservadora               │
│  💪 Alta Adaptabilidade                   │
│                                           │
│  Padrões Cognitivos:                      │
│  ┌──────────────────┐ ┌────────────────┐│
│  │ Velocidade: 65   │ │ Risco: 45      ││
│  │ Equilibrado      │ │ Conservador    ││
│  └──────────────────┘ └────────────────┘│
│                                           │
│  Impacto nos Indicadores:                 │
│  ┌─────────────────────────────────────┐ │
│  │ Liderança      ████████░░  75       │ │
│  │ Comunicação    ██████████  85       │ │
│  │ Gest. Conflitos████████░░░ 70       │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  [Voltar para Atividades]                │
└───────────────────────────────────────────┘
```

---

**Architecture Map v1.0 - Real Scenarios MVP**
*Complete system overview for developers and stakeholders*
