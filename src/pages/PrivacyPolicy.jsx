import React from 'react';
import { Link } from 'react-router-dom';
import { TOKENS } from '../config/tokens';
import Logo from '../components/ui/Logo';

const PrivacyPolicy = () => {
  const updatedAt = '12 de março de 2026';

  return (
    <div className={`min-h-screen ${TOKENS.colors.bg} ${TOKENS.colors.ink}`}>
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between gap-4 mb-10">
          <Logo size="small" />
          <Link to="/" className="text-sm font-medium text-[#4F46E5] hover:underline">
            Voltar
          </Link>
        </div>

        <header className="mb-10">
          <h1 className={`${TOKENS.fonts.serif} text-3xl md:text-5xl leading-tight mb-4`}>
            Política de Privacidade
          </h1>
          <p className={`${TOKENS.colors.muted} text-sm`}>
            Última atualização: {updatedAt}
          </p>
        </header>

        <main className="space-y-8 text-sm md:text-base leading-relaxed text-[#334155]">
          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">1. Quem somos</h2>
            <p>
              Esta plataforma é operada por BNDR Design LTDA, controladora dos dados pessoais tratados no contexto
              de uso do In Assessments. Para solicitações relacionadas à privacidade e à LGPD, entre em contato pelo
              e-mail: cadubndr@gmail.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">2. Quais dados tratamos</h2>
            <p>
              Podemos tratar dados de cadastro e autenticação (como e-mail e identificador de conta), respostas e
              resultados de assessments, histórico de evolução, informações de sessões de cenários e dados de
              gamificação (como níveis, XP e posicionamento em ranking).
            </p>
            <p className="mt-2">
              Campos de pré-assessment podem ser configurados para coletar informações contextuais necessárias ao uso
              da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">3. Finalidades de uso</h2>
            <p>
              Tratamos dados para autenticar usuários, executar avaliações, exibir resultados e histórico, calcular
              progressão e ranking, melhorar a experiência do produto e manter a segurança da plataforma.
            </p>
            <p className="mt-2">
              Dados de cenários podem ser utilizados de forma agregada para melhoria contínua do produto e das
              metodologias de avaliação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">4. Bases legais</h2>
            <p>
              O tratamento ocorre com fundamento, conforme o caso, na execução de contrato, no legítimo interesse e no
              cumprimento de obrigações legais e regulatórias, nos termos da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">5. Compartilhamento de dados</h2>
            <p>
              Podemos compartilhar dados com operadores e fornecedores necessários à operação do serviço, como
              infraestrutura, autenticação e segurança.
            </p>
            <p className="mt-2">
              Também pode haver compartilhamento por ação do próprio usuário ao utilizar recurso de compartilhamento
              público de resultados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">6. Resultados públicos e responsabilidade do usuário</h2>
            <p>
              O compartilhamento público de resultados é opcional. Ao optar por compartilhar, o usuário reconhece que
              terceiros poderão acessar as informações disponibilizadas por meio do link público, sendo responsável por
              sua decisão de compartilhamento.
            </p>
            <p className="mt-2">
              Esse compartilhamento é distinto do acesso interno por usuário master autorizado pela organização
              contratante.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">7. Retenção e exclusão</h2>
            <p>
              Mantemos os dados enquanto a conta estiver ativa e, após encerramento, por até 12 meses, salvo hipóteses
              legais que justifiquem retenção por prazo superior.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">8. Direitos do titular</h2>
            <p>
              O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, eliminação,
              portabilidade e informações sobre compartilhamento, observados os limites legais.
            </p>
            <p className="mt-2">
              Solicitações podem ser encaminhadas para cadubndr@gmail.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">9. Segurança</h2>
            <p>
              Adotamos medidas técnicas e administrativas razoáveis para proteção dos dados pessoais, incluindo controles
              de acesso e práticas de segurança compatíveis com o contexto da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">10. Público elegível</h2>
            <p>
              A plataforma é destinada a usuários com 16 anos ou mais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">11. Alterações desta política</h2>
            <p>
              Podemos atualizar esta Política periodicamente. A versão vigente estará sempre disponível nesta página,
              com a respectiva data de atualização.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
