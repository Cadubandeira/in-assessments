import React from 'react';
import { Link } from 'react-router-dom';
import { TOKENS } from '../config/tokens';
import Logo from '../components/ui/Logo';

const TermsOfService = () => {
  const updatedAt = '12 de março de 2026';

  return (
    <div className={`min-h-screen ${TOKENS.colors.bg} ${TOKENS.colors.ink}`}>
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between gap-4 mb-10">
          <Logo size="small" />
          <Link to="/" className="text-sm font-medium text-[#4F46E5] hover:underline">
            Voltar para login
          </Link>
        </div>

        <header className="mb-10">
          <h1 className={`${TOKENS.fonts.serif} text-3xl md:text-5xl leading-tight mb-4`}>
            Termos de Serviço
          </h1>
          <p className={`${TOKENS.colors.muted} text-sm`}>
            Última atualização: {updatedAt}
          </p>
        </header>

        <main className="space-y-8 text-sm md:text-base leading-relaxed text-[#334155]">
          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">1. Aceitação dos termos</h2>
            <p>
              Ao acessar e utilizar a plataforma In Assessments, você declara que leu, compreendeu e concorda com estes
              Termos de Serviço e com a Política de Privacidade vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">2. Elegibilidade</h2>
            <p>
              O uso da plataforma é permitido apenas para pessoas com 16 anos ou mais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">3. Conta e autenticação</h2>
            <p>
              O usuário é responsável por manter a confidencialidade de suas credenciais e por toda atividade realizada
              em sua conta.
            </p>
            <p className="mt-2">
              A plataforma pode oferecer autenticação por provedores terceiros, conforme disponibilidade técnica.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">4. Uso permitido da plataforma</h2>
            <p>
              É vedado utilizar a plataforma para práticas ilícitas, tentativas de fraude, violação de segurança,
              engenharia reversa não autorizada ou qualquer uso que prejudique o serviço ou terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">5. Compartilhamento de resultados</h2>
            <p>
              O compartilhamento público de resultados é opcional e depende de ação do usuário. Ao compartilhar, o
              usuário reconhece e aceita que terceiros poderão acessar as informações disponibilizadas pelo link.
            </p>
            <p className="mt-2">
              O usuário é responsável por optar ou não por esse compartilhamento com terceiros.
            </p>
            <p className="mt-2">
              Esse cenário é distinto do compartilhamento interno com usuário master do sistema, que pode ter acesso a
              resultados conforme permissões organizacionais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">6. Propriedade intelectual</h2>
            <p>
              O software, layouts, conteúdos institucionais e demais elementos da plataforma são protegidos por direitos
              de propriedade intelectual e não podem ser utilizados fora dos limites autorizados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">7. Disponibilidade e alterações</h2>
            <p>
              A plataforma pode ser atualizada, modificada, suspensa ou descontinuada, total ou parcialmente, por
              critérios técnicos, operacionais ou legais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">8. Limitação de responsabilidade</h2>
            <p>
              Os resultados e análises disponibilizados têm finalidade informativa e de desenvolvimento. Eles não
              substituem aconselhamento profissional especializado de natureza clínica, psicológica, jurídica, financeira
              ou equivalente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">9. Suspensão e encerramento de acesso</h2>
            <p>
              Podemos suspender ou encerrar contas em caso de violação destes termos, uso indevido da plataforma ou
              exigência legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">10. Lei aplicável e foro</h2>
            <p>
              Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca do domicílio da BNDR Design
              LTDA, salvo disposição legal em contrário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1E1B4B] mb-2">11. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos, entre em contato pelo e-mail: cadubndr@gmail.com.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default TermsOfService;
