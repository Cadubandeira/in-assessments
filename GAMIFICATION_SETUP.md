# Sistema de Gamificação - Guia de Integração

## 📋 O que foi criado

### 1. **Tabela `user_progression` (SQL)**
- Arquivo: `supabase/setup_user_progression.sql`
- Armazena: `level`, `total_xp` por usuário
- Automático: timestamp de atualização

### 2. **Utilitários de Cálculo** (`src/utils/gamificationUtils.js`)
- `calculateXP(score, maxScore, activityType)` - Calcula XP ganho
- `getCurrentLevel(totalXP)` - Determina nível atual
- `getCurrentLevelProgress(totalXP)` - Info de progresso (usada no Dashboard)
- `getLevelBadge(level)` - Label do nível
- `getLevelColor(level)` - Cor visual do nível

### 3. **Hook de Atualização** (`src/hooks/useProgressionUpdate.js`)
- `useProgressionUpdate()` - Hook para integração
- Retorna `updateUserProgression(userId, score, maxScore, activityType)`
- Lida com criação de novo registro se não existir
- Detecta level up automaticamente

### 4. **Dashboard Atualizado** (`src/pages/Dashboard.jsx`)
- Card de "Nível atual" agora mostra:
  - Nível (1, 2, 3, etc.)
  - Badge do nível (Iniciante, Aprendiz, etc.)
  - Barra de progresso visual
  - Total XP acumulado

---

## 🚀 Próximos Passos

### Step 1: Executar Migration SQL
```sql
-- Abra supabase/setup_user_progression.sql
-- Copie todo o conteúdo
-- Cole no Supabase SQL Editor
-- Execute
```

### Step 2: Integrar com Salvamento de Resultados
Quando o usuário completa uma atividade (Assessment, Quiz, etc.), adicione a chamada:

**Exemplo em `Assessment.jsx` ou `Results.jsx`:**

```jsx
import { useProgressionUpdate } from '../hooks/useProgressionUpdate';

function ResultsPage() {
  const { updateUserProgression } = useProgressionUpdate();

  const handleSaveResults = async (score, maxScore, activityType = 'assessment') => {
    // ... seu código de salvar assessment_events ...

    // Atualizar progressão após salvar
    const progressResult = await updateUserProgression(
      user.id,
      score,
      maxScore,
      activityType
    );

    if (progressResult.success) {
      if (progressResult.leveledUp) {
        // Mostrar celebração/toast de level up
        console.log(`🎉 Level Up! Nível ${progressResult.newLevel}`);
      }
      console.log(`+${progressResult.xpGained} XP`);
    }
  };

  return (/* seu JSX */);
}
```

---

## 📊 XP Distribution (Configurável em `XP_CONFIG`)

### Assessment
- Base: 50 XP
- Score ≥ 80%: +25 XP
- Score ≥ 90%: +50 XP  
- Score = 100%: +75 XP

### Quiz
- Base: 20 XP
- Score ≥ 80%: +10 XP
- Score ≥ 90%: +20 XP
- Score = 100%: +30 XP

### Certification
- Base: 100 XP
- Score ≥ 80%: +50 XP
- Score ≥ 90%: +100 XP
- Score = 100%: +150 XP

---

## 📈 Progressão de Níveis

| Nível | XP Acumulado | Badge         | Cor    |
|-------|--------------|---------------|--------|
| 1     | 0            | Iniciante     | Gray   |
| 2     | 100          | Iniciante     | Gray   |
| 3     | 300          | Aprendiz      | Blue   |
| 4     | 600          | Aprendiz      | Blue   |
| 5     | 1.000        | Competente    | Green  |
| 10    | 4.500        | Avançado      | Amber  |
| 15    | 10.500       | Especialista  | Red    |
| 20    | 19.000       | Mestre        | Purple |

Fórmula: `XP_threshold = 100 * level * (level - 1) / 2`

---

## 🔧 Customizar XP Values

Edite em `src/utils/gamificationUtils.js`:

```javascript
export const XP_CONFIG = {
  assessment: {
    base: 50,           // ← Mudar aqui
    bonusThresholds: {
      80: 25,           // ← ou aqui
      90: 50,
      100: 75
    }
  },
  // ...
};
```

---

## ⚠️ Notas Importantes

1. **RLS (Row Level Security)** está ativado na tabela
   - Usuários só veem sua própria progressão
   - Service role pode atualizar

2. **Cascata**: Se usuário for deletado, progressão é deletada também

3. **Trigger automático**: Campo `updated_at` se atualiza sozinho

4. **Inicialização**: Novo usuário começa em Nível 1 com 0 XP

5. **Toast/Celebração**: Recomendo mostrar visual quando usuário faz level up

---

## 🎯 Future Enhancements

- [ ] Tabela de `achievements` (badges por milestone)
- [ ] Leaderboard global/por departamento
- [ ] Tracking de "streaks" (dias consecutivos)
- [ ] Skill trees por indicador
- [ ] Unlock de conteúdo com base em nível
