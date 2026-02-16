# Exemplos de Uso e Testes

## 1. Testar Página de Indicadores

### Criar Novo Indicador com Cor e Ícone

1. Acesse: `/admin/indicadores` (ou o path correto)
2. Preencha:
   - **Nome**: "Liderança"
   - **Descrição**: "Capacidade de liderar equipes"
   - **Cor**: Clique em uma cor (ex: Purple `#8B5CF6`)
   - **Ícone**: Selecione "award"
3. Clique "Criar Indicador"

### Editar Indicador Existente

1. Na lista de indicadores, localize um existente
2. Clique no ícone de edição (lápis azul)
3. Altere:
   - Nome, descrição, cor ou ícone
4. Clique "Salvar"
5. Clique "Cancelar" para voltar

---

## 2. Testar Configuração de Visualizações no Assessment

### Criar Novo Assessment

1. Acesse: `/admin/assessments` (Assessment Builder)
2. Clique no botão "+" para criar novo
3. Na seção "Informações do Assessment", procure "Tipos de Visualização"
4. Marque/desmarque os tipos desejados:
   - `📊 Radar` - Mostra indicadores em formato radar
   - `📈 Gráfico em Barras` - Mostra indicadores em barras horizontais

**Exemplo 1 - Radar Only:**
```
[✓] Radar
[ ] Gráfico em Barras
```

**Exemplo 2 - Ambos:**
```
[✓] Radar
[✓] Gráfico em Barras
```

**Exemplo 3 - Barras Only:**
```
[ ] Radar
[✓] Gráfico em Barras
```

5. Continue preenchendo outros dados do assessment
6. Adicione indicadores, questões e alternativas
7. Clique "Salvar"

---

## 3. Ver Resultado com Visualizações

### Ao Finalizar um Assessment

1. Responda todas as questões do assessment
2. Clique "Enviar"
3. Na página de resultados, você verá:
   - **Resumo**: Percentual geral e classificação
   - **Visualizações** (se configuradas):
     - Gráfico de Radar com legenda (ícones + cores)
     - Gráfico de Barras com legenda
   - **Detalhes**: Lista de todos os indicadores com interpretações

### No Histórico de Assessments

1. Acesse a página de histórico
2. Clique em um assessment anterior
3. As mesmas visualizações aparecerão (baseado em `visualization_type`)

---

## 4. Testar Responsividade Mobile

### Via Chrome DevTools

1. Abra DevTools (F12)
2. Clique na aba "Device Emulation" 
3. Selecione "iPhone 12" ou "Pixel 5"
4. Acesse `/results` ou finalize um assessment
5. Verifique:
   - ✅ Texto legível (font size apropriado)
   - ✅ Gráficos redimensionam
   - ✅ Legendas reorganizam
   - ✅ Botões/clickables com tamanho >= 44px
   - ✅ Sem horizontal scroll

### Responsividade Esperada

**Mobile (< 768px):**
- Padding: 4px (px-4)
- Gráficos centralizados
- Legenda abaixo do gráfico
- Títulos menores (text-lg)

**Tablet/Desktop (>= 768px):**
- Padding: 6px (px-6)
- Gráficos + legenda lado a lado
- Títulos maiores (text-3xl)

---

## 5. Verificar Dados no Banco

### Query para Ver Indicadores com Cores

```sql
SELECT 
  id,
  name,
  description,
  color,
  icon,
  created_at
FROM indicators_master
ORDER BY created_at DESC;
```

**Esperado:**
```
id                           | name        | color      | icon
-----------------------------|-------------|------------|--------
550e8400-e29b-41d4-a716...  | Liderança   | #8B5CF6    | award
...
```

### Query para Ver Assessment com Tipos de Visualização

```sql
SELECT 
  id,
  name,
  visualization_type,
  is_active
FROM assessments
ORDER BY created_at DESC;
```

**Esperado:**
```
id                           | name       | visualization_type        | is_active
-----------------------------|------------|---------------------------|----------
650e8400-e29b-41d4-a716...  | Diagnóstico| ["radar", "horizontal-bar"]| true
...
```

---

## 6. Exemplo de Fluxo Completo

### Scenario: Criar Assessment "Avaliação de Competências"

**Passo 1: Configurar Indicadores**
```
Indicador 1: "Técnica"
- Cor: #3B82F6 (Blue)
- Ícone: brain

Indicador 2: "Comunicação"
- Cor: #EC4899 (Pink)
- Ícone: activity

Indicador 3: "Liderança"
- Cor: #8B5CF6 (Purple)
- Ícone: award
```

**Passo 2: Criar Assessment**
```
Nome: "Avaliação de Competências"
Tipo: "profissional"
Visualizações: [✓] Radar + [✓] Gráfico em Barras
```

**Passo 3: Adicionar Indicadores**
- Técnica (com 5 questões)
- Comunicação (com 4 questões)
- Liderança (com 3 questões)

**Passo 4: Responder Assessment**
- Usuário responde 12 questões
- Sistema calcula scores por indicador

**Resultado Esperado:**
```
┌─────────────────────────────────────────┐
│  Resultado: 78%                         │
│  Classificação: Saudável                │
├─────────────────────────────────────────┤
│  [RADAR CHART COM CORES]                │
│  - Técnica (blue)                       │
│  - Comunicação (pink)                   │
│  - Liderança (purple)                   │
├─────────────────────────────────────────┤
│  [BAR CHART COM CORES]                  │
│  ████████ Técnica 85%                   │
│  ██████   Comunicação 72%               │
│  ███████  Liderança 78%                 │
└─────────────────────────────────────────┘
```

---

## 7. Troubleshooting

### Problema: Cores não aparecem no gráfico

**Solução:**
1. Verifique se indicador tem `color` preenchido
2. Confirme que color está no formato hex: `#RRGGBB`
3. Consulte BD:
```sql
SELECT name, color, icon FROM indicators_master;
```

### Problema: Gráficos não aparecem nos resultados

**Solução:**
1. Verifique `visualization_type` do assessment:
```sql
SELECT visualization_type FROM assessments WHERE id = 'seu-id';
```
2. Deve ser array JSON, não string:
```
Correto: ["radar", "horizontal-bar"]
Incorreto: "radar"
```

### Problema: Ícones não aparecem na legenda

**Solução:**
1. Ícone deve estar em ICON_OPTIONS:
```javascript
// src/config/tokens.js
circle, heart, star, zap, flame, target, activity, brain, award, trending-up
```
2. Se adicionar novo ícone, atualize:
   - ICON_OPTIONS
   - iconMap em iconRenderer.js

---

## 8. Testes Unitários (Recomendado)

### Test Suite para RadarChart

```javascript
describe('RadarChart', () => {
  test('renders with indicator results', () => {
    const results = {
      'Técnica': { percentage: 85 },
      'Comunicação': { percentage: 72 }
    };
    const meta = {
      'Técnica': { color: '#3B82F6', icon: 'brain' },
      'Comunicação': { color: '#EC4899', icon: 'activity' }
    };
    
    render(<RadarChart indicatorResults={results} indicatorMeta={meta} />);
    
    expect(screen.getByText('Radar')).toBeInTheDocument();
    expect(screen.getByText('Técnica')).toBeInTheDocument();
  });
});
```

### Test Suite para HorizontalBarChart

```javascript
describe('HorizontalBarChart', () => {
  test('renders bars with correct widths', () => {
    const results = {
      'Técnica': { percentage: 85, classification: 'Saudável' }
    };
    const meta = {
      'Técnica': { color: '#3B82F6', icon: 'brain' }
    };
    
    render(<HorizontalBarChart indicatorResults={results} indicatorMeta={meta} />);
    
    expect(screen.getByText('Gráfico em barras')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });
});
```

---

## 9. Checklist de Validação

- [ ] Indicadores com cor e ícone salvam no BD
- [ ] Assessment com múltiplas visualizações salva no BD
- [ ] Cores aparecem corretamente nos gráficos
- [ ] Legendas mostram ícone + cor + nome
- [ ] Radar chart exibe todos os indicadores
- [ ] Bar chart exibe percentuais corretos
- [ ] Resultados históricos preservam visualizações
- [ ] Mobile: breakpoint em 768px funciona
- [ ] Mobile: font sizes são legíveis
- [ ] N touchable elements >= 44px
- [ ] Nenhum console error ou warning

---

## 10. Performance Benchmarks

### Esperado:
- **Render Radar**: < 100ms
- **Render Bar Chart**: < 50ms
- **Bundle size**: +~15KB (gráficos SVG inline)
- **Memory**: Sem memory leaks ao mudar de aba

### Monitorar via:
```javascript
// Console
console.time('Render Chart');
// ... render
console.timeEnd('Render Chart');
```
