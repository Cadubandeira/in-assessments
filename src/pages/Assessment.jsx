import React from 'react';
import { useAssessment } from '../hooks/useAssessment';
import QuestionBlock from '../components/ui/QuestionBlock';
import { TOKENS } from '../config/tokens';
import Button from '../components/ui/Button';

const Assessment = () => {
  const { 
    assessment, 
    loading, 
    error, 
    answers, 
    handleAnswerChange, 
    submitAssessment, 
    submitting 
  } = useAssessment();

  console.log('Assessment Page Debug:', { loading, error, assessment });

  // Defesas contra formatos inesperados vindos do backend
  const indicators = Array.isArray(assessment?.indicators) ? assessment.indicators : [];

  if (loading) {
    return (
      <div className={`min-h-screen ${TOKENS.colors.bg} flex flex-col items-center justify-center gap-4`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-indigo-900 font-medium animate-pulse">Carregando Assessment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${TOKENS.colors.bg} flex items-center justify-center`}>
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className={`min-h-screen ${TOKENS.colors.bg} flex items-center justify-center flex-col gap-4`}>
        <p className="text-gray-500 text-lg">Não foi possível carregar o assessment.</p>
        <p className="text-sm text-gray-400">Status: Carregado, sem erro, mas sem dados.</p>
        <Button onClick={() => window.location.reload()}>Recarregar Página</Button>
      </div>
    );
  }


  return (
    <div className={`min-h-screen ${TOKENS.colors.bg} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-3xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-12 text-center">
          <h1 className={`${TOKENS.fonts.serif} text-4xl md:text-5xl font-bold text-[#1E1B4B] mb-4`}>
            {assessment.name}
          </h1>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            {assessment.description}
          </p>
        </div>

        {/* Lista de Indicadores */}
        <div className="space-y-16">
          {indicators.map((indicator, index) => (
              <div 
                key={indicator?.id ?? index} 
              >
              <div className="mb-6 border-b border-[#C7D2FE] pb-2">
                <h2 className={`${TOKENS.fonts.serif} text-2xl font-semibold text-indigo-900`}>
                  {indicator.name}
                </h2>
                {indicator.description && (
                  <p className="text-sm text-gray-500 mt-1">{indicator.description}</p>
                )}
              </div>

              <div className="space-y-6">
                  {(Array.isArray(indicator?.questions) ? indicator.questions : []).map((question) => (
                  <QuestionBlock
                    key={question.id}
                    question={question}
                    selectedValue={answers[question.id]}
                    onAnswer={handleAnswerChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com Ação */}
        <div className="mt-16 flex justify-end border-t border-gray-200 pt-8">
          <Button
            onClick={submitAssessment}
            disabled={submitting}
            className="w-full md:w-auto text-lg px-10 py-4 shadow-xl"
          >
            {submitting ? 'Processando...' : 'Finalizar Assessment'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Assessment;