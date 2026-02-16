# 🔧 CORREÇÃO DOS ERROS - Guia Passo a Passo

## 📍 Problemas Identificados

### 1. Erro: "null value in column 'assessment_version'"
**Causa:** A coluna `assessment_version` não estava sendo enviada no payload.  
**Schema Atual:** `assessment_version` é INTEGER (número da versão: 1, 2, 3...), não string

### 2. Erro: "Could not find a relationship between 'assessment_events' and 'assessment_versions'"
**Causa:** Foreign Key `assessment_events.assessment_version_id` → `assessment_versions.id` não existe no banco

### 3. Erro: "Dados do assessment incompletos"
**Causa:** assessment_indicators pode estar vazio e sem constraint FK no assessment_version_id

---

## ✅ SOLUÇÃO - 3 PASSOS

### **PASSO 1: Executar SQL no Supabase**

1. Abra: https://supabase.com/dashboard/project/_/sql/new
2. Cole o conteúdo abaixo:

```sql
-- ====================================================================
-- FIX: Adicionar Foreign Keys Faltantes
-- ====================================================================

-- 1. Adicionar FK: assessment_events.assessment_version_id -> assessment_versions.id
ALTER TABLE public.assessment_events
ADD CONSTRAINT assessment_events_assessment_version_id_fkey 
FOREIGN KEY (assessment_version_id) 
REFERENCES public.assessment_versions(id) ON DELETE CASCADE;

-- 2. AdicionarFK: assessment_indicators.assessment_version_id -> assessment_versions.id
ALTER TABLE public.assessment_indicators
ADD CONSTRAINT assessment_indicators_assessment_version_id_fkey 
FOREIGN KEY (assessment_version_id) 
REFERENCES public.assessment_versions(id) ON DELETE CASCADE;
```

3. Clique em **RUN** (botão verde)
4. Aguarde confirmação: "Execution completed successfully"

---

### **PASSO 2: Verificar Constraints Criadas**

Execute no SQL Editor do Supabase:

```sql
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name IN ('assessment_events', 'assessment_indicators')
ORDER BY table_name;
```

**Resultado esperado:**

| constraint_name | table_name |
|---|---|
| assessment_indicators_assessment_version_id_fkey | assessment_indicators |
| assessment_events_assessment_version_id_fkey | assessment_events |

---

### **PASSO 3: Código já foi Corrigido ✅**

Os seguintes arquivos foram atualizados automaticamente:

#### **src/hooks/useAssessment.js**
```javascript
// ANTES (errado)
const payload = { assessment_version_id: ... }

// DEPOIS (correto)
const payload = { 
  assessment_version: versionNumber,      // INTEGER para não-nulo
  assessment_version_id: assessmentVersionId  // UUID FK
}
```

#### **src/pages/History.jsx**
Query atualizada com FK explícita para ambiguidade zero:
```javascript
.select(`
  ...,
  assessment_versions!assessment_events_assessment_version_id_fkey (
    id,
    version_number,
    is_active
  )
`)
```

#### **src/pages/Results.jsx**
Mesmo padrão que History.jsx

---

## 🚀 TESTE APÓS CORREÇÃO

1. **Realizar um Assessment:**
   - Abra um assessment
   - Responda todas as perguntas
   - Clique "Finalizar"
   - ✅ Deve salvar sem erro de `assessment_version`

2. **Verificar Histórico:**
   - Navegue para "Histórico"
   - ✅ Deve carregar sem erro de relationship

3. **Verificar Resultados:**
   - Deve exibir resultado com versão
   - ✅ Deve mostrar "v1", "v2", etc.

---

## 📋 CHECKLIST

- [ ] SQL executado no Supabase
- [ ] Constraints verificadas com SELECT
- [ ] Frontend recarregado (F5)
- [ ] Assessment realizado com sucesso
- [ ] Histórico carregou
- [ ] Resultados exibem versão

---

## 🐛 Se Ainda Houver Erros

### Erro: "Constraint already exists"
**Solução:** As constraints já foram criadas antes. Isso é normal - significa que você as criou em um setup anterior.

### Erro: "Invalid relationship"
**Solução:** Verifique que as constraints foram realmente criadas com o SELECT acima.

### Erro: "Column 'user_id' not found"
**Solução:** O Results.jsx espera que haja um campo `user_id` em assessment_events. Verifique o schema da tabela.

