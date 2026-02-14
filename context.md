# Contexto do Projeto: In Assessments

## Stack Técnica & Padrões
- **Framework:** React 19 com Vite.
- **Linguagem:** JavaScript (ESM).
- **Roteamento:** React Router (`HashRouter` para compatibilidade com GitHub Pages).
- **Estilização:** Tailwind CSS (com componentes customizados e tokens de design).
- **Backend:** Supabase (Auth, DB, Storage).
- **Ícones:** Lucide React.
- **Convenção:** Componentes funcionais. A estrutura de arquivos deve ser organizada em pastas (`/components`, `/pages`, `/hooks`) à medida que o projeto cresce.

## Regras de Ouro
- Idioma: Código em Inglês, mas Comentários e Variáveis de Interface em Português (PT-BR).
- Auth: Utilizar o cliente Supabase inicializado em `src/supabaseClient.js` para todas as interações de autenticação e banco de dados.
- UI: Componentes devem ser extraídos do `App.jsx` para arquivos próprios dentro de uma pasta `src/components` para melhor organização e reuso.

## Regras de Negócio - Assessments (Suplemento Técnico)
- **Polimorfismo:** Cada assessment tem um `type`. A IA deve considerar que o componente de renderização varia conforme o `type` (ex: `MultipleChoiceView`, `SingleChoiceView`).
- **Imutabilidade:** Resultados históricos (tabela `results`) nunca são editados, apenas inseridos.
- **Cálculo de Score:** A lógica de cálculo reside no backend (PostgreSQL Functions) ou em uma `util` centralizada para garantir consistência.


## Estrutura de Auth
- O projeto usa Google Auth via Supabase.

## Resumo do projeto
- In Assessments é uma plataforma para que pessoas que gostariam de ampliar seu autoconhecimento e se desenvolver realizem assessments e obtenham indicadores que permitam medir e monitorar seu desempenho.


## Regras de negócio - Assessments
- Cada assessment é único mas deve dispôr de indicador(es) para que possa ser sempre exibido nas mesmas relações junto aos demais assessments.
- Indicadores que são repetidos entre diferentes assessments, são na verdade o mesmo indicador, permitindo equivalência e comparação em análises posteriores ao assessment, durante a análise de melhoria contínua e histórica do usuário.
- O resultado exibido após um determinado assessments sempre é baseado nas respostas daquele evento por aquele usuário, podendo até ser comparado históricamente com respostas anteriores do usuário aquele assessment mas deixando bem distinguido o resultado atual do passado.
- Cada assessment pode ter uma estrutura e forma de execução ou preenchimento distinta, bem como ter um resultado apresentado visualmente diferente.
- Cada assessment criado deve indicar seu tipo, permitindo futuro reaproveitamento do mesmo tipo de assessment. O tipo diz respeito ao formato do assessment, por exemplo, um assessment de resposta multipla-escolha possui um tipo diferente de um assessment de resposta escolha única.
- Cada assessment pode atribuir peso diferente a um indicador, bem como pode ter uma maneira única de computar o score.
- É possível repetir o assessment mas não é possível alterar o resultado de um assessment realizado no passado, o resultado passado é salvo historicaente.

### Regras de negócio - Assessment Fórmula do Networking
- Objetivo do Assessment: O assessment tem como finalidade avaliar o nível de maturidade de uma relação profissional específica, com base em três dimensões: Proximidade, Frequência e Sintonia de Interesses. O resultado final deve indicar o grau de maturidade relacional da conexão avaliada.
- Estrutura Geral do Questionário: O assessment é composto por: 3 dimensões, 5 perguntas por dimensão, 15 perguntas no total. Cada pergunta possui 4 alternativas obrigatórias. Apenas uma alternativa pode ser selecionada por pergunta. Há uma Escala de Respostas. Cada pergunta possui 4 opções que representam níveis de intensidade comportamental: Alternativa 1 → nível mais alto (ex: “Sempre”), Alternativa 2 → nível alto/moderado (ex:"Frequentemente"), Alternativa 3 → nível baixo/moderado (ex: "Ocasionalmente") e Alternativa 4 → nível mais baixo (ex: “Raramente”). 
- Regra de Pontuação por Pergunta: a pontuação deve seguir a lógica de 4 pontos ao responder a alternativa 1, 3 pontos ao responder a alternativa 2, 2 pontos ao responder a alternativa 3 e 1 ponto ao responder a alternativa 4.
- Cálculo das pontuações: como cada dimensão possui 5 perguntas, a pontuação mínima para cada dimensão é de 5 pontos e a pontuação máxima é de 20 pontos. A pontuação da dimensão é a soma dos pontos das 5 perguntas correspondentes.
- Pontuação Total: Pontuação mínima total: 15 pontos, Pontuação máxima total: 60 pontos. A Pontuação total é a soma das pontuações das 3 dimensões.
- Classificação do resultado geral: O sistema deve classificar o resultado total conforme a seguinte regra: de 51 a 60 é classificado como "Alta Maturidade Relacional", de 41 a 50 é classificado como "Boa Maturidade Relacional", de 31 a 40 é classificado como "Maturidade Relacional Moderada", de 21 a 30 é classificado como "Maturidade Relacional Baixa" e de 15 a 20 é classificado como "Relação Pouco Madura ou Irrelevante".
- Ao classificar para cada faixa deve retornar: Título interpretativo (ex:Maturidade Relaciona Moderada), Texto explicativo e Recomendações de ação.
- Classificação do resultado de cada dimensão: cada dimensão também deve gerar uma interpretação individual baseada na pontuação obtida. Sendo: de 17 a 20 pontos classificado como "Excelente", de 13 a 16 "Boa" de 9 a 12 "Moderada" e de 5 a 8 "Baixa".
- Ao classificar as dimensões deve retornar: Cada dimensão deve retornar: Nome da dimensão, Pontuação obtida, Texto interpretativo correspondente e Recomendações específicas.
- Descrição conceitual das dimensões: 1. Proximidade. Avalia: Engajamento ativo, Profundidade das interações, Uso intencional de canais digitais, Disponibilidade de suporte e Reciprocidade na iniciativa; 2. Frequência. Avalia: Regularidade de contato, Ritmo da interação, Manutenção da relação ao longo do tempo, Retomada após períodos sem contato e Evolução histórica da conexão; 3. Sintonia de Interesses. Avalia: Alinhamento de objetivos, Troca de valor, Confiança, Colaboração e Visão de longo prazo.
- Regras Funcionais Obrigatórias: Todas as perguntas devem ser obrigatórias. O sistema não pode calcular resultados com perguntas em branco. O cálculo só deve ocorrer após o término completo do questionário. As respostas devem ser armazenadas de forma estruturada. O sistema deve permitir persistência dos seguintes dados: Identificador do usuário. Pontuação total. Pontuação por dimensão. Classificação final. Respostas individuais.
- Requisitos de Resultado: Ao final, o sistema deve apresentar: Pontuação total (ex: 47 de 60); Classificação geral; Interpretação textual do resultado geral; Resultado detalhado por dimensão; Pontuação de cada dimensão (ex: 15 de 20); Interpretação individual por dimensão.
- Representação Visual: O sistema deve gerar uma representação comparativa das três dimensões em escala comum de 0 a 20. A visualização deve permitir: Comparação visual entre Proximidade, Frequência e Sintonia. Identificação de desequilíbrios entre dimensões. O formato é um radar chart.
- Natureza do Resultado: O resultado deve sempre ser apresentado como: Um retrato do momento. Não um diagnóstico definitivo. Algo evolutivo e passível de melhoria. A comunicação deve incentivar: Intencionalidade, Consistência, Estratégia relacional e Desenvolvimento contínuo.
- Fórmula Conceitual: A Fórmula do Networking (FN) deve ser conceitualmente representada como: FN = Proximidade + Frequência + Sintonia de Interesses. Onde o equilíbrio entre as três dimensões é tão importante quanto a soma total.
- A implementação deve permitir expansão futura para: Comparação entre múltiplas relações, Evolução temporal, Benchmarking, Recomendações automatizadas personalizada e Gamificação.

### Regras de negócio - Assessment Índice de Networking Interno

Objetivo do Assessment: O assessment tem como finalidade avaliar o nível de maturidade do networking interno do profissional dentro da organização, mensurando cinco dimensões comportamentais que impactam sua reputação, influência e capacidade de gerar valor no ambiente corporativo.

Estrutura Geral do Questionário: O assessment é composto por 5 dimensões: Agradabilidade, Expertise, Confiança, Colaboração e Visibilidade. Cada dimensão possui 5 perguntas, totalizando 25 perguntas. Cada pergunta possui 4 alternativas obrigatórias. Apenas uma alternativa pode ser selecionada por pergunta.
Há uma Escala de Respostas. Cada pergunta possui 4 opções que representam níveis de intensidade comportamental: Alternativa 1 → nível mais alto (ex: “Sempre”), Alternativa 2 → nível alto/moderado (ex:"Frequentemente"), Alternativa 3 → nível baixo/moderado (ex: "Ocasionalmente") e Alternativa 4 → nível mais baixo (ex: “Raramente”).

Regra de Pontuação por Pergunta: A pontuação deve seguir a lógica de 4 pontos ao responder a alternativa 1, 3 pontos ao responder a alternativa 2, 2 pontos ao responder a alternativa 3 e 1 ponto ao responder a alternativa 4.

Cálculo das pontuações: Como cada dimensão possui 5 perguntas, a pontuação mínima para cada dimensão é de 5 pontos e a pontuação máxima é de 20 pontos. A pontuação da dimensão é a soma dos pontos das 5 perguntas correspondentes.

Pontuação Total: Pontuação mínima total: 25 pontos. Pontuação máxima total: 100 pontos. A pontuação total é a soma das pontuações das 5 dimensões.

Classificação do resultado geral: O sistema deve classificar o resultado total conforme faixas de maturidade do networking interno, retornando título interpretativo, texto explicativo e recomendações estratégicas de desenvolvimento.

Classificação do resultado de cada dimensão: Cada dimensão também deve gerar interpretação individual baseada na pontuação obtida (escala de 5 a 20), permitindo identificar pontos fortes e pontos de melhoria.

Descrição conceitual das dimensões:

Agradabilidade: Capacidade de ser receptivo, cordial, acessível e construtivo nas interações.

Expertise: Capacidade de aplicar competências técnicas e comportamentais para gerar resultados e inovação.

Confiança: Capacidade de transmitir integridade, coerência entre discurso e ação e manter confidencialidade.

Colaboração: Disposição para contribuir, apoiar e gerar valor coletivo.

Visibilidade: Capacidade de tornar competências e resultados conhecidos de forma estratégica e equilibrada.

Regras Funcionais Obrigatórias: Todas as perguntas devem ser obrigatórias. O sistema não pode calcular resultados com perguntas em branco. O cálculo só deve ocorrer após o término completo do questionário. As respostas devem ser armazenadas de forma estruturada. O sistema deve permitir persistência dos seguintes dados: Identificador do usuário, Pontuação total, Pontuação por dimensão, Classificação final, Respostas individuais.

Requisitos de Resultado: Ao final, o sistema deve apresentar: Pontuação total (ex: 78 de 100), Classificação geral, Interpretação textual do resultado geral, Resultado detalhado por dimensão, Pontuação de cada dimensão (ex: 16 de 20), Interpretação individual por dimensão.

Representação Visual: O sistema deve gerar uma representação comparativa das cinco dimensões em escala comum de 0 a 20. O formato é um radar chart com cinco eixos.

Natureza do Resultado: O resultado deve ser apresentado como retrato do momento, passível de evolução e desenvolvimento contínuo.

### Regras de negócio - Assessment Networking (Modelo Expandido / 5 Dimensões)

(Este assessment possui estrutura idêntica ao Índice de Networking Interno, podendo ser tratado como o mesmo tipo estrutural, diferenciando-se apenas pelo contexto de aplicação.)

Objetivo do Assessment: Avaliar o nível geral de maturidade do networking do profissional, considerando comportamentos, reputação, influência e posicionamento estratégico.

Estrutura Geral do Questionário:
5 dimensões, 5 perguntas por dimensão, total de 25 perguntas.
Cada pergunta possui 4 alternativas obrigatórias.
Escala de intensidade comportamental com 4 níveis (Sempre, Frequentemente, Ocasionalmente, Raramente).

Regra de Pontuação por Pergunta:
4 pontos (Sempre), 3 pontos (Frequentemente), 2 pontos (Ocasionalmente), 1 ponto (Raramente).

Cálculo das pontuações:
Cada dimensão varia de 5 a 20 pontos.
Pontuação total varia de 25 a 100 pontos.

Classificação Geral:
Baseada na soma total, com retorno de título interpretativo, explicação estratégica e recomendações práticas.

Classificação por Dimensão:
Cada dimensão deve gerar interpretação individual com base na escala de 5 a 20 pontos.

Representação Visual:
Radar chart com 5 eixos (Agradabilidade, Expertise, Confiança, Colaboração, Visibilidade).

Regras Funcionais Obrigatórias:
Todas as perguntas obrigatórias.
Persistência de respostas estruturadas.
Impossibilidade de edição de resultados passados.
Possibilidade de repetição do assessment gerando novo evento histórico.

Natureza do Resultado:
Resultado apresentado como indicador evolutivo, incentivando melhoria contínua, autoconhecimento estratégico e posicionamento profissional consciente.

## Motor de Assessment Dinâmico
- Conceitos Fundamentais:

O sistema deve operar com base nos seguintes princípios:

Um Assessment é uma estrutura configurável

Um Assessment é composto por Indicadores (Dimensões)

Indicadores são compostos por Perguntas

Perguntas possuem Alternativas

Alternativas possuem Valor de Pontuação

O Motor calcula resultados com base na configuração

O Motor nunca contém regras fixas de um assessment específico

- Modelo de Domínio:
-- Assessment (Entidade Raiz):
Representa um modelo configurável de avaliação.
Atributos:
id

nome

descrição

type (ex: likert_multi_dimension_radar)

status (ativo/inativo)

escala_min

escala_max

permite_classificacao_geral (boolean)

permite_classificacao_por_indicador (boolean)

tipo_visualizacao (radar, barra, score_simples)

versao

data_criacao

data_publicacao

Relacionamentos:

1:N → Indicadores

1:N → RegrasClassificacaoGeral

1:N → EventosDeAplicacao (Results)

-- Indicador (Dimensão)
Representa um eixo mensurável dentro do assessment.

Atributos:

id

assessment_id

nome

descrição_conceitual

ordem

peso (default 1.0)

score_minimo

score_maximo

Relacionamentos:

1:N → Perguntas

1:N → RegrasClassificacaoIndicador

-- Pergunta
Atributos:

id

indicador_id

texto

obrigatoria (boolean)

ordem

tipo_resposta (single_choice, multi_choice, escala, etc.)

Relacionamentos:

1:N → Alternativas

-- Alternativa
Atributos:

id

pergunta_id

texto

valor_pontuacao

ordem

-- RegraClassificacaoGeral
Atributos:

id

assessment_id

score_min

score_max

titulo

descricao

recomendacoes

-- RegraClassificacaoIndicador
Atributos:

id

indicador_id

score_min

score_max

titulo

descricao

recomendacoes

-- EventoDeAplicacao (Resultado)

Representa a execução de um assessment por um usuário.

Atributos:

id

assessment_id

user_id

versao_assessment

respostas (estrutura JSON)

score_total

scores_por_indicador (JSON)

classificacao_geral (JSON)

classificacoes_por_indicador (JSON)

data_realizacao

Resultado é imutável.

- Regras de Negócio do Motor

-- Regra 1 — Validação

Todas perguntas obrigatórias devem possuir resposta

Não permitir cálculo parcial

Alternativas devem pertencer à pergunta

-- Regra 2 — Cálculo Base
Para cada pergunta respondida:
score_pergunta = valor_pontuacao_da_alternativa

-- Regra 3 — Score por Indicador
score_indicador = soma(score_pergunta) * peso_indicador

-- Regra 4 — Score Total
score_total = soma(score_indicador)
Ou, alternativamente, caso configurado:
score_total = média(score_indicadores)
A estratégia de agregação deve ser configurável.

-- Regra 5 — Classificação
Classificação Geral:
Encontrar a faixa onde:
score_total >= score_min && score_total <= score_max
Retornar objeto correspondente.

Classificação por Indicador:
Aplicar mesma lógica por dimensão.

-- Regra 6 — Escalabilidade

O Motor NÃO deve assumir:

Número fixo de dimensões

Número fixo de perguntas

Escala fixa de pontuação

Estratégia fixa de agregação

Tudo deve ser parametrizado.

- Fluxo de Execução do Motor

-- Etapa 1 — Carregar Configuração

Receber:
assessment_config
respostas_usuario

-- Etapa 2 — Validar Integridade

Verificar se assessment está ativo

Verificar versão

Validar obrigatoriedade

Validar integridade referencial

-- Etapa 3 — Calcular

Mapear respostas

Calcular score por pergunta

Calcular score por indicador

Aplicar pesos

Calcular score total

Aplicar regras de classificação

-- Etapa 4 — Persistir Resultado

Salvar evento imutável.

-- Etapa 5 — Retornar Objeto de Resultado

Formato padrão:
{
  assessmentId,
  version,
  totalScore,
  indicatorScores: [
    { id, nome, score, classificacao }
  ],
  classification,
  metadata: {
    executionDate,
    userId
  }
}

- Modelo de Resultado Padronizado

O motor deve sempre retornar:

score_total

score_maximo_possivel

score_por_indicador

classificação_geral

classificação_por_indicador

dados_brutos_respostas

A camada de UI decide visualização.

- Pontos de Extensão Futuros

O motor deve permitir:

Indicadores compartilhados entre assessments

Pesos diferentes por assessment

Fórmulas customizadas (ex: multiplicação entre dimensões)

Benchmarking entre usuários

Comparação temporal

Percentilização

Scores normalizados (0–100)

- Diretrizes Arquiteturais

-- Separação de Camadas
Camada 1 — Domínio (Motor)

Cálculo

Regras

Validação

Classificação

Camada 2 — Persistência

Salvar configuração

Salvar eventos

Versionamento

Camada 3 — Apresentação

Formulário

Visualização

Radar

Dashboard

-- Versionamento Obrigatório

Se qualquer item estrutural for alterado:

Criar nova versão

Nunca alterar versão publicada

Resultados antigos continuam referenciando versão anterior

-- Segurança

Apenas Admin pode criar/editar assessment

Usuário comum apenas executa

Resultados nunca editáveis





## Regras de negócio - Usuários
- Nesta plataforma há usuários que poderão realizar seus assessments, visualizar somente os seus resultados, acompanhar seus indicadores, ter insights sobre si, consumir conteúdos direcionados aos seus objetivos e com base nos seus indicadores, entrar em contato para saber mais e contratar serviços específicos para ajudá-la.
- Nesta plataforma ainda há outros usuários com permissão de administrador que além de terem todas as funcionalidades comuns ao usuário não administrador ainda dispõe de: dashboard sobre uso dos assessments, desempenhos dos usuários, podendo aplicar filtros que permitem ver a nível macro - considerando todos os assessments e usuários - mas também a nível micro, podendo selecionar usuários específicos para ver seus resultados, datas de início e fim para analisar dados, assessments específicos e podendo somar esses filtros. O usuário administrador acompanha em tempo real o uso da plataforma.

## Regras de negócio - Conteúdos
- São oferecidos conteúdos de capacitação, softskills e entre outros na dashboard e no final de cada assessment- priorizando o conteúdo que mais é pertinente àquela página e ao usuário, sendo seu desempenho em indicadores um importante fator - fatores que precisam ser melhoradores indicam que conteúdos relacionados são mais importantes.

## Jornadas do usuário
- Loggar na plataforma: deve se cadastrar primeiro, podendo ser por google auth ou com e-mail e senha. Após isso pode realizar o loggin das mesmas maneiras.
- Acessar assessments: ao entrar na plataforma estará na página inicial, um misto de seu desempenho, conteúdos relacionados pertinentes a seu desempenho, call to action para adquirir serviços que o auxiliem a melhorar indicadoes e, em grande destaque, os assessments. Ao selecionar um assessment entra na página do assessment, podendo iniciá-lo - cada assessment pode ter uma estrutura diferente - mas ao finalizá-lo sempre irá se deparar com a página de resultados do assessment, onde pode ver seu desempenho atual por indicadores, ver sugestões relacionadas, conteúdos relacionados, calls to action para adquirir serviços que o auxiliem a melhorar indicadores e um seção com próximos assessments sugerindo outros assesssments para que os faça.
- Visualizar resultados históricos: além de poder ver os indicadores na dashboard, pode analisar dados histórico com maior afinco e ferramentas ao acessar a página "Resultados obtidos" no qual pode filtar por resultados de assessments específicos, asssessments respondidos por períodos de datas, por indicadores medidos e entre outros.
- Ver conteúdos: página de conteúdos, com seção principal voltada a conteúdos recomendados com base nos seu desempenho e nível atual. AO selecionar um conteúdo vai para a página do conteúdo. Conteúdos de tipos diferentes podem abrir páginas diferentes, com conteúdos mas também estruturas diferentes, bem como formatos.
- Desloggar: disponível como ação no menu ou header.

## Diretrizes de Resposta da IA
- As sugestões de código devem seguir a estrutura de pastas e componentes definida, utilizando Vite e React Router.
- Sempre considere que o usuário pode ser 'admin' ou 'comum' ao sugerir componentes de UI.
