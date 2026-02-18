import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { TOKENS } from '../config/tokens';

const RealScenarios = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Situacoes reais
          </p>
          <h2 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mt-2 mb-4 leading-tight`}>
            Simulacao Adaptativa com IA + Pressao Contextual Real
          </h2>
          <p className="text-white/90 text-base sm:text-lg max-w-3xl">
            Conteudo mockado para testar o conceito e a estrutura da experiencia.
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
        <div className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-10 shadow-lg space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">Em vez de questionario</p>
            <p className="text-sm sm:text-base text-gray-700">
              Voce cria um cenario vivo, que muda conforme as decisoes da pessoa.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">Exemplos</p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base text-gray-700">
              <li>Conflito entre dois colaboradores</li>
              <li>Meta sob risco</li>
              <li>Dilema etico</li>
              <li>Cliente insatisfeito</li>
              <li>Crise reputacional</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">A cada decisao</p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base text-gray-700">
              <li>O sistema altera o cenario</li>
              <li>Introduz pressao (tempo, novas informacoes, ambiguidade)</li>
              <li>Mede padroes decisorios</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">O diferencial</p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base text-gray-700">
              <li>Nao mede resposta correta</li>
              <li>Mede processo cognitivo</li>
              <li>Mapeia heuristicas</li>
              <li>Identifica vieses</li>
            </ul>
          </div>

          <p className="text-sm sm:text-base text-gray-700">
            Isso conecta com estudos sobre tomada de decisao de Daniel Kahneman. E praticamente um "mini laboratorio comportamental".
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/activities')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5]"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Atividades
            </button>
            <span className="text-xs font-bold text-[#4F46E5] px-2 py-1 bg-[#4F46E5]/10 rounded">
              Powered by IA
            </span>
            <span className="text-xs text-gray-500">
              Mock - sem execucao por enquanto
            </span>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/activities')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white bg-[#4F46E5] px-5 py-2.5 rounded-lg shadow hover:shadow-lg transition"
          >
            Explorar outras atividades <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default RealScenarios;
