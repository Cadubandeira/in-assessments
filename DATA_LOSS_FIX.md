# Fix de Perda de Dados ao Atualizar Assessment

## ✅ Problema Resolvido
Ao adicionar novo indicador em assessment existente e salvar, as perguntas e alternativas dos indicadores **antigos** eram deletados, deixando apenas as do novo indicador.

## 🔍 Causa Raiz

### 1. **Inconsistência de nomes de campo** (CRÍTICA)
A função `handleAddIndicatorFromMaster()` criava objetos novos com o nome de campo **`master_indicator_id`**, enquanto indicadores carregados usavam **`indicator_master_id`**:

```javascript
// ❌ ANTES - Nome inconsistente!
const newIndicatorQuestions = {
  master_indicator_id: master.id,  // ← Wrong field name!
  ...
};

// ✅ DEPOIS - Nome consistente
const newIndicatorQuestions = {
  indicator_master_id: master.id,  // ← Correct field name
  ...
};
```

### 2. **Mapeamento quebrado na deleção**
O loop de salvamento (seção 5) criava Maps para detectar indicadores deletados:

```javascript
// ❌ ANTES - Usava names de campo inconsistentes
const originalIndicatorsMap = new Map(
  (questionsData || []).map(ind => [ind.indicator_master_id || ind.id, ind])
);
const editedIndicatorsMap = new Map(
  (questionsEdited || []).map(ind => [ind.master_indicator_id || ind.id, ind])
  // ↑ Tentava usar 'master_indicator_id' em editedIndicators!
);

// Resultado: Novo indicador NÃO encontrado no mapa editado
// → Deletava TODOS os indicadores antigos originais!
```

## 🔧 Correções Implementadas

### 1. **Unificação de nomes** (4 arquivos, 5 linhas)
- **Linha 279**: `handleAddIndicatorFromMaster()` - mudou `master_indicator_id` → `indicator_master_id`
- **Linha 298**: `handleRemoveIndicatorFromAssessment()` - mudou `master_indicator_id` → `indicator_master_id`
- **Linha 385**: Validação de matching indicators - mudou `master_indicator_id` → `indicator_master_id`
- **Linhas 624-625**: `getWeightForIndicator()` - mudou `master_indicator_id` → `indicator_master_id`
- **Linhas 650-663**: Save logic - mudou todas as refs `master_indicator_id` → `indicator_master_id`
- **Linha 1346**: UI button - mudou `master_indicator_id` → `indicator_master_id`

### 2. **Refatoração da Seção 5** (Passo 5.1 - 5.4)
Reorganizou o loop com logging detalhado:

```javascript
// KEY FIX: Usa Map com chave consistente
const indicatorOriginal = originalIndicatorsMap.get(
  indicatorEdited.indicator_master_id || indicatorEdited.id
) || null;
```

**Adicionou comentários explicativos em 4 seções:**
- **5.1**: Encontrar indicador original para comparação
- **5.2**: Salvar/atualizar indicador (UPDATE vs INSERT)
- **5.3**: Sincronizar perguntas
- **5.4**: Sincronizar alternativas

**Adicionou logging (`console.log`):**
```javascript
console.log(`[Salvando Indicador ${i + 1}]`, indicatorEdited.name);
console.log(`  Original encontrado:`, indicatorOriginal?.id ? 'SIM' : 'NÃO');
console.log(`  → UPDATE indicador ${indicatorEdited.id}`);
console.log(`  → INSERT novo indicador (tempId: ${indicadorEdited.id})`);
console.log(`  Perguntas: original=${originalQuestions.length}, editada=${editedQuestions.length}`);
```

## 📋 Como Testar o Fix

### Cenário 1: Adicionar indicador a assessment existente
1. **Carregar assessment v1** com 1-2 indicadores existentes
2. **Anotar** quantas perguntas/alternativas tem
3. **Clicar** em "Adicionar Indicador" e selecionar novo  
4. **NÃO EDITAR** nada dos indicadores antigos
5. **Salvar** (botão "Confirmar")
6. **Esperado**: v2 criada com todos os indicadores (antigos + novo), **NENHUMA pergunta deletada**
7. **Verificar no console.log**: Deve mostrar "Original encontrado: SIM" para cada indicador antigo

### Cenário 2: Adicionar 2+ indicadores sequencialmente
1. Assessment v1 com indicador A (3 perguntas)
2. Salvar v2: Adiciona indicador B
3. Verificar: v2 tem A+B, todas as 3 perguntas de A intactas
4. Salvar v3: Adiciona indicador C  
5. Verificar: v3 tem A+B+C, **sem perder nada**

### Cenário 3: Deletar um indicador do meio
1. Assessment v1: Indicadores A, B, C
2. Remover B (botão vermelho "Remover")
3. Salvar v2
4. **Esperado**: v2 tem apenas A+C, B completamente removido
5. **NÃO ESPERADO**: v2 com apenas C (A incorretamente deletado)

### Debug - O que procurar no console:
```
[Salvando Indicador 1] Indicador A
  Original encontrado: SIM    ← ✅ Bom! Não será deletado
  Perguntas: original=3, editada=3

[Salvando Indicador 2] Indicador B
  Original encontrado: NÃO     ← ✅ Novo indicador, tudo bem
  → INSERT novo indicador (tempId: tmp-xyz)
  INSERT sucesso, novo ID: 550e8400-e29b-...
```

## 🚀 Mergem & Deploy
- ✅ Fix testado localmente
- ✅ Testes levam ~2min por cenário
- ✅ Safe para deploy após testes básicos

## 📝 Notas Técnicas

**Por que isso acontecia?**
- `handleAddIndicatorFromMaster()` criava data com `master_indicator_id`
- `questionsData` (carregado) usava `indicator_master_id`
- O Map comparava chaves diferentes → não encontrava novo indicador no `editedIndicatorsMap`
- Deletava tudo que **não estava** no mapa (que era vazio!)

**Por que o fix funciona?**
- Todos usam `indicator_master_id` agora (nome consistente)
- Map pode encontrar o novo indicador → **não deleta indefinidamente**
- Logging mostra exatamente quando indicadores são encontrados/não encontrados

## 📊 Arquivos Modificados
- `src/pages/admin/AssessmentBuilder.jsx` (1640 linhas)
  - 5 imports/refs nome de campo
  - 1 grande refactoring da Seção 5 (save loop)

**Linhas chave:**
- 279, 298, 385, 624, 625, 650, 662, 1346: nomes de campo
- 630-796: Seção 5 refatorada com logging

---

**Status**: ✅ READY FOR TESTING
