# 🔧 FIX: Erro de Foreign Key em `user_indicator_history`

## ❌ Problema
Ao submeter um assessment de tipo **níveis**, você recebe o erro:
```
Erro ao salvar: insert or update on table "user_indicator_history" violates 
foreign key constraint "user_indicator_history_indicator_id_fkey"
```

## 🔍 Causa Raiz
Quando um assessment é do tipo `niveis`, ele **não deveria** tentar inserir dados em `user_indicator_history` (que é para indicadores). Mas há um trigger no banco de dados que tenta fazer isso sem validação, causando a violação de FK.

## ✅ Solução (4 passos)

### **1️⃣ Implementar migração - Colunas do Banco (arquivo já criado)**

Envie para seu Supabase:
```bash
cd supabase
supabase migration up
```

Ou execute manualmente no **Supabase SQL Editor**:
```sql
ALTER TABLE public.assessment_events
ADD COLUMN IF NOT EXISTS assessment_schema text DEFAULT 'indicadores'
CHECK (assessment_schema IN ('indicadores', 'niveis'));
```

---

### **2️⃣ Atualizar Código (✅ JÁ FEITO)**

O campo `assessment_schema` foi adicionado ao payload em `useAssessment.js`:

```javascript
const payload = {
  // ... outros campos ...
  assessment_schema: assessment.schema || 'indicadores',  // ← NOVO
};
```

---

### **3️⃣ Atualizar Trigger (EXECUTE NO SUPABASE)**

**Copie e execute o arquivo abaixo no Supabase SQL Editor:**

📋 Arquivo: `supabase/fix_user_indicator_history_trigger.sql`

**O que faz:**
- ✅ Cria função que valida `assessment_schema` antes de inserir
- ✅ Só insere em `user_indicator_history` se `schema = 'indicadores'`
- ✅ Pula automaticamente para assessments de `niveis`
- ✅ Evita violação de FK

---

### **4️⃣ Testar**

Após executar os passos 1-3:

1. Abra seu assessment de níveis
2. Responda as perguntas normalmente
3. Clique em "Enviar"
4. ✅ Não deve mais dar erro

---

## 📝 Resumo das Mudanças

| Arquivo | Mudança | Status |
|---------|---------|--------|
| `useAssessment.js` | Adicionado `assessment_schema` ao payload | ✅ Feito |
| `assessment_events` | Coluna `assessment_schema` adicionada | ⏳ Executar migração |
| `user_indicator_history` | Trigger com validação de schema | ⏳ Executar SQL do fix |

---

## 🔄 Fluxo Corrigido

**Antes (❌ Errado):**
```
Assessment de níveis
  ↓
INSERT assessment_events
  ↓
Trigger tenta INSERT em user_indicator_history
  ↓
FK violation (indicator_id inválido para níveis)
```

**Depois (✅ Correto):**
```
Assessment de níveis
  ↓
INSERT assessment_events (com assessment_schema='niveis')
  ↓
Trigger verifica: schema != 'indicadores'?
  ↓
SIM → SKIP user_indicator_history INSERT
  ↓
✅ Sucesso!
```

---

## ❓ Dúvidas?

Se o erro persistir após executar tudo:

1. Verifique se a coluna `assessment_schema` foi criada:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assessment_events' AND column_name = 'assessment_schema';
```

2. Verific se o trigger foi criado:
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'assessment_events_insert_trigger';
```

3. Verifique se seu assessment realmente é do tipo `niveis`:
```sql
SELECT id, name, schema FROM assessments WHERE name LIKE '%seu_assessment%';
```
