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
