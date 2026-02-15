# Guia de Deployment - Nova Arquitetura de Indicadores

## 🎯 Próximos Passos

Sua aplicação está **100% pronta** para usar o novo sistema de indicadores com ranges. Siga este guia para fazer o deployment.

---

## 📋 Passo 1: Deploy do SQL Schema no Supabase

### O que fazer:

1. **Abra o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Substitua `YOUR_PROJECT_ID` pela sua ID real

2. **Abra o SQL Editor**
   - Clique em "SQL Editor" na barra lateral esquerda
   - Clique em "New Query"

3. **Cole o SQL Schema**
   - Abra o arquivo: `supabase/setup_indicators_architecture.sql`
   - Copie TODO o conteúdo
   - Cole no Supabase SQL Editor

4. **Execute o Query**
   - Clique no botão "RUN" (ou pressione Ctrl+Enter/Cmd+Enter)
   - Aguarde a execução (deve levar ~5 segundos)

5. **Verifique o Resultado**
   - Você deve ver a mensagem: "Query Executed Successfully" ou similiar
   - Verificar que 3 tabelas foram criadas: `indicators_master`, `assessment_indicators`, `assessment_indicator_ranges`

### ✅ Confirmação de Sucesso:

No SQL Editor, execute este query para confirmar:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('indicators_master', 'assessment_indicators', 'assessment_indicator_ranges');
```

Você deve ver 3 linhas:
- indicators_master
- assessment_indicators  
- assessment_indicator_ranges

---

## 📋 Passo 2: Criar Indicadores Iniciais (Opcional)

Se quiser popular dados iniciais, execute este SQL no Supabase:

```sql
-- Criar indicadores base
INSERT INTO indicators_master (name, description) VALUES
('Liderança', 'Capacidade de liderar e inspirar equipes'),
('Comunicação', 'Habilidade de comunicar-se assertivamente'),
('Resiliência', 'Capacidade de lidar com pressão e desafios'),
('Empatia', 'Capacidade de compreender emoções alheias'),
('Inteligência Emocional', 'Autoconhecimento e autocontrole emocional');

-- Para verificar, execute:
SELECT id, name FROM indicators_master;
```

---

## 📋 Passo 3: Testar a Aplicação Localmente

1. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

2. **Acesse a aplicação**
   - Abra seu navegador em: http://localhost:5173
   - Faça login com sua conta de teste

3. **Teste o Admin Panel**
   - Se você for admin, clique em "Gerenciar Indicadores"
   - Você deve ver a lista de indicadores criados
   - Tente criar um novo indicador

4. **Teste o Assessment Builder**
   - Clique em "Configurar Assessment"
   - Selecione um assessment existente
   - Adicione indicadores e configure faixas

---

## 🔄 Passo 4: Migrar Assessments para o Novo Sistema

### Opção A: Gradual (Recomendado)

1. **Criar novo assessment test**
   - Configure com novo sistema de ranges
   - Teste com usuários piloto
   - Monitorar resultados

2. **Migrar assessments um de cada vez**
   - Depois que validar o teste desempenha bem
   - Adicione indicadores com ranges aos assessments existentes

### Opção B: Todos de Uma Vez

1. **Usar o Admin -> Configurar Assessment**
2. **Carregar todos os indicadores**
3. **Configurar ranges para todos**
4. **Testar antes de colocar em produção**

---

## ✅ Checklist de Validação

Após o deployment, verifique:

- [ ] Tabelas criadas no Supabase (3 tabelas novas)
- [ ] Indicadores criados (se populou seed data)
- [ ] Admin pode acessar "Gerenciar Indicadores"
- [ ] Pode criar novos indicadores
- [ ] Pode acessar "Configurar Assessment"
- [ ] Pode adicionar indicadores com ranges
- [ ] Assessment antigos ainda funcionam (compatibilidade)
- [ ] Nuevos assessments mostram ranges corretos
- [ ] Resultados exibem classificações customizadas

---

## 🐛 Troubleshooting

### ❌ Erro: "Policy does not exist"

**Solução:** Rode o script SQL novamente. Os DROP POLICY IF EXISTS devem prevenir isso, mas às vezes é necessário reexecutar.

### ❌ Erro: "Could not resolve 'indicators_master'"

**Solução:** Verifique que o SQL foi executado com sucesso no Supabase. Limpe o cache do navegador (Ctrl+Shift+Delete).

### ❌ Página Admin não carrega

**Solução:** Verifique que você está logado como admin. Confirme com: `SELECT role FROM profiles WHERE id = auth.uid();`

### ❌ Faixas não aparecem nos resultados

**Solução:** 
1. Verificar que `assessment_indicator_ranges` foi populada
2. Recarregar a página
3. Limpar localStorage do navegador

### ❌ Build falha

**Solução:** Execute:
```bash
npm install
npm run build
```

---

## 📊 Monitoramento Pós-Deployment

### Verifique logs do Supabase

1. Clique em "Database" → "Realtime" para monitorar mudanças
2. Verifique políticas RLS estão funcionando
3. Teste queries diretamente no SQL Editor

### Verifique console do navegador

- Abra Developer Tools (F12)
- Aba "Console" mostra logs de erro
- Aba "Network" mostra requisições ao Supabase

### Métricas a Monitorar

- ✅ Assessments completados com sucesso
- ✅ Classificações geradas corretamente  
- ✅ Resultados exibem com/sem ranges
- ⏱️ Tempo de carregamento (deve ser <2s)

---

## 🚀 Próximas Melhorias (Futuro)

Após o deployment bem-sucedido, considere:

1. **Dashboard Admin Avançado**
   - Visualizar estatísticas de indicadores
   - Exportar dados de assessments
   - Análise de tendências

2. **Visualizações Aprimoradas**
   - Gráficos de evolução
   - Comparação entre indicadores
   - Benchmarking

3. **Automações**
   - Notificações automáticas
   - Relatórios agendados
   - Integração com ferramentas externas

---

## 📞 Suporte

Se encontrar problemas durante o deployment:

1. Verifique o arquivo `FALLBACK_TEST_REPORT.md` (valida compatibilidade)
2. Consulte os logs do Supabase
3. Revise a documentação do `context.md`
4. Limpe cache e tente novamente

---

## ✨ Conclusão

Você completou com sucesso:
- ✅ Refatoração do useAssessment
- ✅ Implementação de classificação por ranges
- ✅ Criação de páginas admin
- ✅ Testes de compatibilidade (100% sucesso)
- ✅ Build de produção validado

**Próximo passo:** Execute o SQL no Supabase e comece a usar! 🎉

Tempo estimado: **5-10 minutos**

---

*Documentação atualizada: 15 de Fevereiro de 2026*
