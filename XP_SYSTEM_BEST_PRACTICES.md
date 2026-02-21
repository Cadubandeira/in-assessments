# Sistema de XP - Boas Práticas e Arquitetura

## 📋 Visão Geral

Este documento descreve a arquitetura unificada do sistema de XP que atende tanto **Assessments** quanto **Cenários (Simulações)**, eliminando duplicação de código e garantindo consistência.

## 🎯 Princípios Arquiteturais

### 1. Single Source of Truth
- **Tabela única**: `user_progression` é a única fonte de verdade para XP e níveis
- **Hook centralizado**: `useProgressionUpdate` gerencia todas as atualizações de progressão
- **Não há XP em `profiles`**: A tabela `profiles` contém apenas `role`, `id` e timestamps

### 2. Separation of Concerns
- **Cálculo de XP**: Cada tipo de atividade tem sua própria função de cálculo
  - Assessments: `calculateXP(score, maxScore, activityType)`
  - Cenários: `calculateScenarioXP(kahnemanData, avgDecisionTime, totalDecisions)`
- **Persistência**: `useProgressionUpdate` cuida de salvar XP, independente da origem
- **Visualização**: Componentes de overlay mostram XP, mas não persistem

### 3. DRY (Don't Repeat Yourself)
- **Reutilização**: Mesma lógica de atualização para assessments e cenários
- **Extensibilidade**: Fácil adicionar novos tipos de atividades (quizzes, desafios, etc.)

## 🏗️ Estrutura de Dados

### Tabela: `user_progression`
```sql
CREATE TABLE public.user_progression (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL,
  level integer DEFAULT 1 CHECK (level >= 1),
  total_xp integer DEFAULT 0 CHECK (total_xp >= 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Estrutura de XP Reward
```javascript
// Para Assessments
{
  xpGained: number,
  totalXP: number,
  newLevel: number,
  leveledUp: boolean,
  bonuses: [{ label: string, xp: number }]
}

// Para Cenários
{
  baseXP: number,
  bonuses: { 
    empathy?: number,
    decisiveness?: number,
    balance?: number,
    minimizeBias?: number,
    leadership?: number
  },
  totalXP: number,
  breakdown: string[]
}
```

## 🔄 Fluxos de Integração

### Assessment Flow (Results.jsx)
```
1. User completes assessment
2. Results.jsx verifica se xp_awarded === false
3. Chama updateUserProgression(userId, score, maxScore, 'assessment')
   - calculateXP calcula XP baseado em performance (80%+, 90%+, 100%)
4. Marca assessment_events.xp_awarded = true
5. Mostra XP overlay
6. XP persiste em user_progression automaticamente
```

### Scenario Flow (RealScenarios.jsx → ScenarioResults.jsx)
```
1. User completes scenario (nó final alcançado)
2. useScenarioSession.completeSession():
   - Analisa padrões cognitivos (Kahneman System 1/2)
   - Calcula XP com calculateScenarioXP (baseado em análise cognitiva)
   - Retorna xpReward (sem persistir)
3. RealScenarios transita para phase='results'
4. ScenarioResults renderiza e:
   - IMEDIATAMENTE persiste XP via updateUserProgression (useEffect)
   - DEPOIS mostra XP overlay com dados já salvos
   - Overlay é apenas visual, XP já foi salvo
   - Se usuário fechar navegador, XP já está persistido ✅
5. Ao clicar "Continuar", fecha overlay (sem operações de banco)
```

## 🧩 Componentes e Responsabilidades

### `useProgressionUpdate` Hook
**Responsabilidade**: Atualizar `user_progression` com novo XP e nível

**Assinatura**:
```javascript
updateUserProgression(
  userId: string,
  score: number,
  maxScore: number,
  activityType: 'assessment' | 'scenario',
  preCalculatedXP: number | null
)
```

**Lógica**:
- Se `preCalculatedXP` for fornecido → usa esse valor (cenários)
- Caso contrário → calcula com `calculateXP(score, maxScore, activityType)` (assessments)
- Atualiza ou cria registro em `user_progression`
- Retorna `{ success, xpGained, previousLevel, newLevel, leveledUp, totalXP }`

### `calculateXP` (assessments)
**Entrada**: `score`, `maxScore`, `activityType`  
**Saída**: XP total baseado em % de acerto (80%/90%/100% thresholds)

**Configuração**: `XP_CONFIG.assessment`
```javascript
{
  base: 50,
  bonusThresholds: {
    80: 20,
    90: 40,
    100: 60
  }
}
```

### `calculateScenarioXP` (scenarios)
**Entrada**: `kahnemanData`, `avgDecisionTime`, `totalDecisions`  
**Saída**: `{ baseXP, bonuses, totalXP, breakdown }`

**Bônus aplicados**:
- **Empatia & Análise**: System 2 ≥ 60% (+40 XP)
- **Velocidade**: Decisão média < 25s (+30 XP)
- **Equilíbrio**: System 1 e 2 entre 40-60% (+50 XP)
- **Redução de Vieses**: ≤ 1 viés de alta confiança (+35 XP)
- **Liderança de Time**: ≥ 12 decisões (+40 XP)

### ScenarioXPOverlay
**Props**: `{ isVisible, xpData, totalXP, onClose }`

**Responsabilidade**: 
- Exibe animação de XP com breakdown de bônus
- Animação especial para level-up
- **NÃO persiste dados** (responsabilidade do componente pai)

## ✅ Boas Práticas Implementadas

### 1. ✅ Evitar Duplicação de Persistência
- **Antes**: RealScenarios tentava salvar XP + ScenarioResults também salvava
- **Agora**: Apenas ScenarioResults persiste XP ao fechar overlay

### 2. ✅ Flag de XP Awarded
- Assessments: usa campo `xp_awarded` em `assessment_events`
- Cenários: usa estado local `xpAwarded` em ScenarioResults (cenários não podem ser revisitados)

### 3. ✅ Carregamento Correto de XP
- **Antes**: RealScenarios carregava de `profiles.total_xp` (não existe)
- **Agora**: Carrega de `user_progression.total_xp`

### 4. ✅ Extensibilidade
Adicionar novo tipo de atividade:
```javascript
// 1. Adicionar configuração em gamificationUtils.js
XP_CONFIG.newActivity = { base: 100, bonusThresholds: {...} };

// 2. Criar função de cálculo (se necessário)
export const calculateNewActivityXP = (params) => { ... };

// 3. Chamar useProgressionUpdate com activityType
updateUserProgression(userId, score, maxScore, 'newActivity');
```

### 5. ✅ Separação de Cálculo e Persistência
- Cálculo: `calculateXP` / `calculateScenarioXP` (pure functions)
- Persistência: `useProgressionUpdate` (side effect)
- Visualização: `ScenarioXPOverlay` / `AssessmentXPCard` (presentation)

### 6. ✅ Persistência Imediata (Anti Data-Loss)
- **Crítico**: XP é persistido ANTES de mostrar overlay
- **Assessments**: XP salvo no `useEffect` de Results.jsx (antes do overlay)
- **Cenários**: XP salvo no `useEffect` de ScenarioResults.jsx (antes do overlay)
- **Garantia**: Mesmo se usuário fechar navegador, XP já foi salvo
- Overlay é apenas visualização, não transação

## 🧪 Testing Strategy

### Unit Tests
- `calculateXP`: testar thresholds (80%, 90%, 100%)
- `calculateScenarioXP`: testar cada tipo de bônus independentemente
- `getCurrentLevel`: testar cálculo de nível baseado em XP

### Integration Tests
- Assessment flow: completar assessment → verificar `user_progression.total_xp`
- Scenario flow: completar cenário → verificar XP incrementado
- Level-up: acumular XP suficiente → verificar `level` incrementado

### Edge Cases
- ❌ Revisitar resultado de assessment (não deve dar XP novamente)
- ❌ Fechar overlay sem internet (deve retry ou mostrar erro)
- ✅ Criar `user_progression` se não existir (handled by hook)

## 📊 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────┐
│                    USER COMPLETES ACTIVITY               │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ASSESSMENT                 SCENARIO
        │                         │
        ▼                         ▼
   Results.jsx           ScenarioResults.jsx
        │                         │
        │                         │
   calculateXP          calculateScenarioXP
   (% based)            (cognition based)
        │                         │
        └─────────┬───────────────┘
                  │
                  ▼
       useProgressionUpdate Hook
                  │
                  ├─> Calculate/Use XP
                  ├─> Update user_progression
                  ├─> Calculate new level
                  └─> Return result
                  │
                  ▼
            XP Overlay Display
                  │
                  ▼
            User sees reward!
```

## 🚀 Migration Checklist

- [x] Remover lógica duplicada de persistência XP
- [x] Centralizar em `useProgressionUpdate`
- [x] Adicionar parâmetro `preCalculatedXP` ao hook
- [x] Corrigir RealScenarios para carregar de `user_progression`
- [x] Deletar `increment_user_xp.sql` (não necessário)
- [x] Garantir que assessments continuem funcionando
- [x] Garantir que cenários agora persistem XP corretamente
- [ ] Adicionar migration para verificar `user_progression` existe para todos os usuários
- [ ] Testar level-up em ambos os fluxos

## 📝 Notas Importantes

1. **XP não pode ser negativo**: Check constraint em `user_progression.total_xp`
2. **Level mínimo é 1**: Check constraint em `user_progression.level`
3. **User ID único**: Constraint UNIQUE em `user_progression.user_id`
4. **Cenários não afetam indicators diretamente**: Apenas registram análise (ver `updateUserIndicatorScores` em `useScenarioSession.js`)
5. **XP é cumulativo**: Sempre soma ao `total_xp` existente, nunca substitui

## 🔮 Roadmap Futuro

1. **Activity History**: Tabela para rastrear todas as atividades que geraram XP
2. **XP Multipliers**: Eventos especiais, streaks, conquistas
3. **Level Rewards**: Badges, títulos, conteúdo desbloqueável
4. **Leaderboards**: Rankings por período, categoria, etc.
5. **XP Decay**: Penalidade por inatividade (opcional)
