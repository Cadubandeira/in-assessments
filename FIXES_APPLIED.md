# 📝 RESUMO DE CORREÇÕES - Erros de Versionamento

## 🎯 Problema Original

Você tinha 3 erros ao usar a aplicação:

```
1. Erro ao salvar: null value in column "assessment_version"
2. Could not find a relationship between 'assessment_events' and 'assessment_versions'
3. Dados do assessment incompletos ou formato incompatível
```

---

## ✅ Causas Raiz (Identificadas via `actual_schema.sql`)

### Erro #1: assessment_version é INTEGER, não STRING
**Schema identificado:**
```sql
CREATE TABLE public.assessment_events (
  ...
  assessment_version integer NOT NULL,  -- ← Integer!
  assessment_version_id uuid NOT NULL,  -- ← UUID separado
  ...
);
```

**Problema:** Código tentava enviar `assessment_version: "v1"` mas o campo espera `1` (número)

---

### Erro #2: Foreign Keys Faltantes
**Constraints ausentes:**
```sql
-- Não existia:
ALTER TABLE assessment_events 
ADD CONSTRAINT assessment_events_assessment_version_id_fkey
FOREIGN KEY (assessment_version_id) REFERENCES assessment_versions(id);

-- Não existia:
ALTER TABLE assessment_indicators
ADD CONSTRAINT assessment_indicators_assessment_version_id_fkey
FOREIGN KEY (assessment_version_id) REFERENCES assessment_versions(id);
```

**Impacto:** Query com JOIN em `assessment_versions` não encontrava a relação

---

## 🔧 Correções Implementadas

### 1️⃣ **Código: Enviar `assessment_version` Corretamente**

**Arquivo:** `src/hooks/useAssessment.js` (linha 309-321)

```javascript
// ANTES (❌ errado)
const payload = {
  assessment_id: assessment.id,
  assessment_version_id: assessmentVersionId,  // UUID
  user_id: user.id,
  // faltava: assessment_version
  ...
};

// DEPOIS (✅ correto)
const payload = {
  assessment_id: assessment.id,
  assessment_version: versionNumber,           // INTEGER (1, 2, 3...)
  assessment_version_id: assessmentVersionId,  // UUID (para FK)
  user_id: user.id,
  ...
};
```

---

### 2️⃣ **Queries: Especificar FK Explicitamente**

**Arquivo:** `src/pages/History.jsx` (linha 48-60)

```javascript
// Query com JOIN usando constraint explícita
.select(`
  id,
  assessment_id,
  assessment_version,
  total_score,
  max_possible_score,
  classification_snapshot,
  indicator_scores_snapshot,
  user_display_name,
  created_at,
  assessment_versions!assessment_events_assessment_version_id_fkey (  // ← FK explícita
    id,
    version_number,
    is_active
  )
`)
```

**Arquivo:** `src/pages/Results.jsx` (linha 40-49)
- Mesmo padrão da History

---

### 3️⃣ **Banco de Dados: Criar Constraints Faltantes** ❗ **AÇÃO NECESSÁRIA**

**2 Arquivos Criados:**

1. **`supabase/fix_missing_fks.sql`** - SQL para adicionar constraints
2. **`DATABASE_FIX.md`** - Instruções passo-a-passo

**O que fazer:**

1. Abra Supabase Dashboard → SQL Editor
2. Cole o SQL de `supabase/fix_missing_fks.sql`
3. Execute com Ctrl+Enter
4. Confirme: "Execution completed successfully"

---

## 📊 Arquivos Modificados

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `src/hooks/useAssessment.js` | Adicionar `assessment_version: versionNumber` ao payload | Preencher coluna NOT NULL |
| `src/pages/History.jsx` | Atualizar SELECT para incluir FK explícita | Resolver JOIN relationship |
| `src/pages/Results.jsx` | Atualizar SELECT para incluir FK explícita | Resolver JOIN relationship |
| `supabase/fix_missing_fks.sql` | ✨ NOVO - SQL para constraints | Criar FKs no banco |
| `DATABASE_FIX.md` | ✨ NOVO - Instruções | Guia para usuário |

---

## 🚀 Próximos Passos

### ⚠️ IMPORTANTE: Executar SQL no Supabase

A aplicação está corrigida no frontend, mas precisa de 2 constraints no banco:

**Execute em:** https://supabase.com/dashboard/project/_/sql/new

```sql
ALTER TABLE public.assessment_events
ADD CONSTRAINT assessment_events_assessment_version_id_fkey 
FOREIGN KEY (assessment_version_id) 
REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

ALTER TABLE public.assessment_indicators
ADD CONSTRAINT assessment_indicators_assessment_version_id_fkey 
FOREIGN KEY (assessment_version_id) 
REFERENCES public.assessment_versions(id) ON DELETE CASCADE;
```

### ✅ Depois Testar

1. Realizar um assessment
2. Verificar Histórico
3. Verificar Resultados

---

## 📋 Checklist de Implementação

- [x] `useAssessment.js` - Enviar `assessment_version` (INTEGER)
- [x] History.jsx - Query com FK explícita
- [x] Results.jsx - Query com FK explícita
- [ ] **⚠️ Executar SQL no Supabase** ← FALTANDO
- [ ] Testar fluxo completo

---

## 🔍 Verificação

Após executar o SQL, validate com:

```sql
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name IN ('assessment_events', 'assessment_indicators')
ORDER BY table_name;
```

**Esperado:**
- `assessment_events_assessment_version_id_fkey` em `assessment_events`
- `assessment_indicators_assessment_version_id_fkey` em `assessment_indicators`

