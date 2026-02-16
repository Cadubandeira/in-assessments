import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, GitBranch } from 'lucide-react';
import { 
  getActiveAssessmentVersion, 
  createNewAssessmentVersion, 
  activateAssessmentVersion,
  listAssessmentVersions 
} from '../../utils/assessmentVersions';

export default function AssessmentBuilder() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [assessments, setAssessments] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [ranges, setRanges] = useState({}); // { indicatorId: [{ min, max, label, interpretation }] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);
  const [assessmentIndicatorsData, setAssessmentIndicatorsData] = useState([]);
  const [questionsData, setQuestionsData] = useState([]);


  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const [assRes, indRes] = await Promise.all([
          supabase.from('assessments').select('id, name, description'),
          supabase.from('indicators_master').select('id, name'),
        ]);

        if (assRes.error) throw assRes.error;
        if (indRes.error) throw indRes.error;

        if (mounted) {
          setAssessments(assRes.data || []);
          setIndicators(indRes.data || []);
        }
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (role === 'admin') fetch();
    return () => { mounted = false; };
  }, [role, roleLoading, navigate]);

  const handleSelectAssessment = async (assessmentId) => {
    setSelectedAssessment(assessmentId);
    setSelectedIndicators([]);
    setRanges({});
    setAssessmentData(null);
    setAssessmentIndicatorsData([]);
    setQuestionsData([]);

    try {
      // 1. Buscar dados do assessment
      const { data: assData, error: assError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (assError) throw assError;
      setAssessmentData(assData);

      // 2. Buscar versão ativa
      const activeVer = await getActiveAssessmentVersion(assessmentId);
      setCurrentVersion(activeVer);

      // 3. Listar todas as versões
      const allVersions = await listAssessmentVersions(assessmentId);
      setVersions(allVersions);

      // 4. Buscar indicadores antigos (para questions) com suas relações
      const { data: indicators, error: indError } = await supabase
        .from('indicators')
        .select(`
          *,
          questions (
            *,
            alternatives (*)
          )
        `)
        .eq('assessment_id', assessmentId)
        .order('display_order', { ascending: true });
      
      if (indError) throw indError;
      
      // Armazenar indicadores com suas questões
      const indicatorsWithQuestions = (indicators || []).map(ind => ({
        ...ind,
        questions: (ind.questions || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map(q => ({
            ...q,
            alternatives: (q.alternatives || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          }))
      }));
      
      setQuestionsData(indicatorsWithQuestions);

      // 5. Carregar indicadores e ranges da versão ativa
      await loadVersionIndicators(activeVer.id);
    } catch (err) {
      console.error('Erro ao carregar assessment:', err);
      alert('Erro ao carregar assessment: ' + err.message);
    }
  };

  const loadVersionIndicators = async (versionId) => {
    const { data: indicators, error } = await supabase
      .from('assessment_indicators')
      .select(`
        *,
        indicators_master:indicator_master_id (id, name, description),
        assessment_indicator_ranges (*, display_order)
      `)
      .eq('assessment_version_id', versionId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Erro ao carregar indicadores:', error);
      return;
    }

    setAssessmentIndicatorsData(indicators || []);

    const indicatorIds = (indicators || []).map(ind => ind.indicator_master_id);
    setSelectedIndicators(indicatorIds);

    const rangesMap = {};
    (indicators || []).forEach(ind => {
      rangesMap[ind.indicator_master_id] = (ind.assessment_indicator_ranges || [])
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map(r => ({
          min: r.min_score,
          max: r.max_score,
          label: r.label,
          interpretation: r.interpretation,
          display_order: r.display_order
        }));
    });
    setRanges(rangesMap);
  };

  const handleAddIndicator = (indicatorId) => {
    if (!selectedIndicators.includes(indicatorId)) {
      setSelectedIndicators([...selectedIndicators, indicatorId]);
      setRanges({ ...ranges, [indicatorId]: [] });
    }
  };

  const handleRemoveIndicator = (indicatorId) => {
    setSelectedIndicators(selectedIndicators.filter(id => id !== indicatorId));
    const newRanges = { ...ranges };
    delete newRanges[indicatorId];
    setRanges(newRanges);
  };

  const handleAddRange = (indicatorId) => {
    if (!ranges[indicatorId]) ranges[indicatorId] = [];
    ranges[indicatorId].push({ min: 0, max: 100, label: '', interpretation: '' });
    setRanges({ ...ranges });
  };

  const handleUpdateRange = (indicatorId, index, field, value) => {
    ranges[indicatorId][index][field] = field === 'min' || field === 'max' ? parseInt(value) || 0 : value;
    setRanges({ ...ranges });
  };

  const handleRemoveRange = (indicatorId, index) => {
    ranges[indicatorId].splice(index, 1);
    setRanges({ ...ranges });
  };

  const handleConfirmSave = async () => {
    if (!selectedAssessment || selectedIndicators.length === 0) {
      alert('Selecione um assessment e pelo menos um indicador.');
      return;
    }

    if (!currentVersion) {
      alert('Nenhuma versão selecionada.');
      return;
    }

    // Modal de confirmação
    const confirmMessage = `⚠️ IMPORTANTE: CRIAÇÃO DE NOVA VERSÃO

Ao salvar estas alterações, uma NOVA VERSÃO do assessment será criada automaticamente.

✓ A versão atual (v${currentVersion.version_number}) permanecerá INTACTA para fins históricos
✓ Uma nova versão (v${(currentVersion.version_number || 0) + 1}) será criada com suas alterações
✓ Resultados já registrados continuarão vinculados à versão original

⚠️ Esta ação NÃO PODERÁ SER DESFEITA.

Deseja continuar e criar a nova versão?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Criar nova versão do assessment
      const newVersion = await createNewAssessmentVersion(selectedAssessment, currentVersion.id);
      
      // Deletar indicadores e ranges da nova versão (que foram copiados)
      // para inserir os novos dados editados
      const { error: deleteError } = await supabase
        .from('assessment_indicators')
        .delete()
        .eq('assessment_version_id', newVersion.id);

      if (deleteError) throw deleteError;

      // Salvar assessment_indicators e assessment_indicator_ranges na NOVA versão
      for (const indicatorId of selectedIndicators) {
        const displayOrder = selectedIndicators.indexOf(indicatorId) + 1;
        
        const { data: aiData, error: aiError } = await supabase
          .from('assessment_indicators')
          .insert([{ 
            assessment_version_id: newVersion.id,
            indicator_master_id: indicatorId, 
            display_order: displayOrder 
          }])
          .select();

        if (aiError) throw aiError;
        const assessmentIndicatorId = aiData?.[0]?.id;

        // Salvar ranges
        if (ranges[indicatorId] && ranges[indicatorId].length > 0) {
          const rangeData = ranges[indicatorId].map(r => ({
            assessment_indicator_id: assessmentIndicatorId,
            min_score: r.min,
            max_score: r.max,
            label: r.label,
            interpretation: r.interpretation,
          }));

          const { error: rangeError } = await supabase
            .from('assessment_indicator_ranges')
            .insert(rangeData);

          if (rangeError) throw rangeError;
        }
      }

      // Atualizar estado
      setCurrentVersion(newVersion);
      setShowVersionModal(false);
      
      // Recarregar lista de versões
      const allVersions = await listAssessmentVersions(selectedAssessment);
      setVersions(allVersions);
      
      // Carregar indicadores da nova versão
      await loadVersionIndicators(newVersion.id);

      // Perguntar se deseja publicar a nova versão
      const shouldPublish = confirm(
        `✓ Nova versão v${newVersion.version_number} criada com sucesso!\n\nDeseja publicar esta versão agora? Ela se tornará a versão ativa do assessment.`
      );

      if (shouldPublish) {
        await activateAssessmentVersion(selectedAssessment, newVersion.id);
        
        // Atualizar estado da versão atual
        const activeVer = await getActiveAssessmentVersion(selectedAssessment);
        setCurrentVersion(activeVer);
        
        // Recarregar versões novamente
        const updatedVersions = await listAssessmentVersions(selectedAssessment);
        setVersions(updatedVersions);
        
        alert(`✓ Versão v${newVersion.version_number} publicada com sucesso!\nEla agora é a versão ativa do assessment.`);
      } else {
        alert(`✓ Versão v${newVersion.version_number} criada com sucesso!\nVocê pode publicá-la mais tarde clicando em "Publicar".`);
      }
    } catch (err) {
      alert('Erro ao salvar: ' + (err.message || String(err)));
    }
  };

  const handleCreateNewVersion = async () => {
    if (!selectedAssessment || !currentVersion) {
      alert('Selecione um assessment primeiro.');
      return;
    }

    const confirmMessage = `📋 Criar Nova Versão (Cópia)

Isso criará uma CÓPIA EXATA da versão v${currentVersion.version_number}.

Você poderá então editar a nova versão antes de publicá-la.

Deseja continuar?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Criar nova versão copiando da versão atual
      const newVersion = await createNewAssessmentVersion(selectedAssessment, currentVersion.id);
      
      setCurrentVersion(newVersion);
      
      // Recarregar lista de versões
      const allVersions = await listAssessmentVersions(selectedAssessment);
      setVersions(allVersions);

      // Carregar indicadores da nova versão
      await loadVersionIndicators(newVersion.id);
      
      alert(`✓ Nova versão v${newVersion.version_number} criada como cópia!\n\nVocê está agora em modo de edição. Faça as alterações desejadas e clique em "Salvar".`);
    } catch (err) {
      alert('Erro ao criar versão: ' + (err.message || String(err)));
    }
  };

  const handlePublishVersion = async () => {
    if (!selectedAssessment || !currentVersion) {
      alert('Selecione um assessment e versão.');
      return;
    }

    if (!confirm(`Publicar versão v${currentVersion.version_number}? Ela se tornará a versão ativa.`)) {
      return;
    }

    try {
      await activateAssessmentVersion(selectedAssessment, currentVersion.id);
      
      // Recarregar versões
      const allVersions = await listAssessmentVersions(selectedAssessment);
      setVersions(allVersions);

      // Atualizar estado da versão atual
      const activeVer = await getActiveAssessmentVersion(selectedAssessment);
      setCurrentVersion(activeVer);
      
      alert('Versão publicada com sucesso!');
    } catch (err) {
      alert('Erro ao publicar versão: ' + (err.message || String(err)));
    }
  };

  if (roleLoading || loading) {
    return <div className="p-12 text-center">Carregando...</div>;
  }

  if (role !== 'admin') {
    return (
      <div className="p-12 text-center text-red-600">
        Acesso negado. Somente admins podem acessar esta página.
      </div>
    );
  }

  if (error) {
    return <div className="p-12 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/dashboard')} className="text-[#4F46E5] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h1 className="text-3xl font-semibold">Configurar Assessment</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Seleção de Assessment */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-6 border rounded-lg bg-white">
            <h2 className="text-lg font-semibold mb-4">Selecionar Assessment</h2>
            <div className="space-y-2">
              {assessments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelectAssessment(a.id)}
                  className={`w-full text-left px-4 py-2 rounded border transition ${
                    selectedAssessment === a.id
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                      : 'border-gray-300 hover:border-[#4F46E5]'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          {/* Versões do Assessment */}
          {selectedAssessment && currentVersion && (
            <div className="p-6 border rounded-lg bg-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> Versões
                </h2>
                
              </div>
              
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className={`px-3 py-2 rounded text-sm border ${
                      v.id === currentVersion.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{v.version_number}</span>
                      {v.is_active && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Ativa</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(v.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>

              {currentVersion && !currentVersion.is_active && (
                <button
                  onClick={handlePublishVersion}
                  className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                >
                  Publicar v{currentVersion.version_number}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Coluna Direita: Informações Completas do Assessment */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedAssessment && (
            <div className="p-12 text-center text-gray-500">
              Selecione um assessment para visualizar todas suas configurações
            </div>
          )}

          {selectedAssessment && assessmentData && currentVersion && (
            <>
              {/* 1. INFORMAÇÕES BÁSICAS DO ASSESSMENT */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-[#4F46E5]">Informações do Assessment</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Nome</label>
                    <input
                      type="text"
                      value={assessmentData?.name || ''}
                      readOnly
                      className="w-full p-2 border rounded bg-gray-50 text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipo</label>
                    <input
                      type="text"
                      value={assessmentData?.type || ''}
                      readOnly
                      className="w-full p-2 border rounded bg-gray-50 text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipo de Agregação</label>
                    <input
                      type="text"
                      value={assessmentData?.aggregation_type || ''}
                      readOnly
                      className="w-full p-2 border rounded bg-gray-50 text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipo de Visualização</label>
                    <input
                      type="text"
                      value={assessmentData?.visualization_type || ''}
                      readOnly
                      className="w-full p-2 border rounded bg-gray-50 text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipo de Disponibilidade</label>
                    <input
                      type="text"
                      value={assessmentData?.availability_type || ''}
                      readOnly
                      className="w-full p-2 border rounded bg-gray-50 text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Status</label>
                    <input
                      type="text"
                      value={assessmentData?.is_active ? '✓ Ativo' : '✗ Inativo'}
                      readOnly
                      className={`w-full p-2 border rounded bg-gray-50 font-semibold ${assessmentData?.is_active ? 'text-green-600' : 'text-gray-500'}`}
                    />
                  </div>
                </div>

                {assessmentData?.description && (
                  <div className="mt-4 p-4 bg-gray-50 rounded">
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Descrição</label>
                    <textarea
                      value={assessmentData.description}
                      readOnly
                      rows={3}
                      className="w-full p-2 border rounded bg-white text-gray-700"
                    />
                  </div>
                )}
              </div>

              {/* 2. INFO DA VERSÃO ATUAL */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  Versão Atual: v{currentVersion.version_number}
                </span>
                {currentVersion.is_active && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Ativa</span>
                )}
              </div>

              {/* 3. ASSESSMENT INDICATORS COM RANGES */}
              {assessmentIndicatorsData.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-[#4F46E5]">Indicadores do Assessment</h2>
                  
                  <div className="space-y-6">
                    {assessmentIndicatorsData.map((indicator) => (
                      <div key={indicator.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Indicador #{indicator.display_order}</label>
                            <input
                              type="text"
                              value={indicator.indicators_master?.name || ''}
                              readOnly
                              className="w-full p-2 border rounded bg-white text-[#4F46E5] font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Peso</label>
                            <input
                              type="number"
                              value={indicator.weight || '0'}
                              readOnly
                              className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                            />
                          </div>
                        </div>

                        {indicator.indicators_master?.description && (
                          <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-400">
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Descrição Conceitual</label>
                            <textarea
                              value={indicator.indicators_master.description}
                              readOnly
                              rows={2}
                              className="w-full p-2 border rounded bg-gray-50 text-gray-700 text-sm"
                            />
                          </div>
                        )}

                        {/* Ranges do Indicador */}
                        {indicator.assessment_indicator_ranges && indicator.assessment_indicator_ranges.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Faixas de Classificação:</h4>
                            <div className="space-y-3">
                              {indicator.assessment_indicator_ranges.map((range, rIdx) => (
                                <div key={rIdx} className="p-3 bg-white rounded border border-gray-200">
                                  <div className="grid grid-cols-5 gap-2 mb-2">
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Min Score</label>
                                      <input
                                        type="number"
                                        value={range.min_score}
                                        readOnly
                                        className="w-full p-2 border rounded bg-gray-50 text-gray-900 font-semibold text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Max Score</label>
                                      <input
                                        type="number"
                                        value={range.max_score}
                                        readOnly
                                        className="w-full p-2 border rounded bg-gray-50 text-gray-900 font-semibold text-sm"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="text-xs text-gray-500 block mb-1">Label</label>
                                      <input
                                        type="text"
                                        value={range.label}
                                        readOnly
                                        className="w-full p-2 border rounded bg-gray-50 text-[#4F46E5] font-semibold text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Ordem</label>
                                      <input
                                        type="number"
                                        value={range.display_order || '-'}
                                        readOnly
                                        className="w-full p-2 border rounded bg-gray-50 text-gray-900 font-semibold text-sm"
                                      />
                                    </div>
                                  </div>
                                  {range.interpretation && (
                                    <div className="text-sm p-2 bg-gray-50 rounded border-t border-gray-200">
                                      <label className="text-xs text-gray-500 block mb-1">Interpretação</label>
                                      <textarea
                                        value={range.interpretation}
                                        readOnly
                                        rows={2}
                                        className="w-full p-2 border rounded bg-white text-gray-700 text-xs"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. QUESTIONS E ALTERNATIVES AGRUPADAS POR INDICADORES */}
              {questionsData.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-[#4F46E5]">Estrutura de Questões por Indicador</h2>
                  
                  <div className="space-y-8">
                    {questionsData.map((indicator, indIdx) => (
                      <div key={indicator.id} className="border-2 border-[#4F46E5] rounded-lg p-6 bg-blue-50">
                        <h3 className="text-xl font-bold text-[#4F46E5] mb-4">
                          Indicador #{indicator.display_order}: {indicator.name}
                        </h3>

                        {indicator.description && (
                          <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-400">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Descrição</label>
                            <p className="text-sm text-gray-700 mt-1">{indicator.description}</p>
                          </div>
                        )}

                        {/* Questões do Indicador */}
                        {indicator.questions && indicator.questions.length > 0 ? (
                          <div className="space-y-6">
                            {indicator.questions.map((question, qIdx) => (
                              <div key={question.id} className="border rounded-lg p-4 bg-white">
                                <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
                                  <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="col-span-2">
                                      <label className="text-xs font-semibold text-gray-500 uppercase">Questão #{question.display_order}</label>
                                      <textarea
                                        value={question.text}
                                        readOnly
                                        rows={2}
                                        className="w-full mt-2 p-2 border rounded bg-white text-gray-900 font-semibold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500 uppercase">Tipo de Resposta</label>
                                      <input
                                        type="text"
                                        value={question.response_type || ''}
                                        readOnly
                                        className="w-full mt-2 p-2 border rounded bg-white text-[#4F46E5] font-semibold"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500 uppercase">Obrigatória?</label>
                                      <input
                                        type="checkbox"
                                        checked={question.is_required || false}
                                        readOnly
                                        className="mt-2 w-5 h-5 text-red-600 rounded"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Alternativas */}
                                {question.alternatives && question.alternatives.length > 0 && (
                                  <div className="mt-4">
                                    <h5 className="font-semibold text-gray-900 mb-3">Alternativas:</h5>
                                    <div className="space-y-3 bg-gray-50 p-4 rounded">
                                      {question.alternatives.map((alt, aIdx) => (
                                        <div key={alt.id} className="p-3 bg-white rounded border border-gray-200 flex gap-4 items-end">
                                          <div className="flex-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Alternativa #{alt.display_order}</label>
                                            <input
                                              type="text"
                                              value={alt.text}
                                              readOnly
                                              className="w-full p-2 border rounded bg-white text-gray-900 text-sm mt-1"
                                            />
                                          </div>
                                          <div className="w-24">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Score</label>
                                            <input
                                              type="number"
                                              value={alt.score_value}
                                              readOnly
                                              className="w-full p-2 border rounded bg-white text-[#4F46E5] font-bold text-center mt-1"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">Nenhuma questão neste indicador</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BOTÃO SALVAR */}
              {assessmentIndicatorsData.length > 0 || questionsData.length > 0 && (
                <button
                  onClick={() => setShowVersionModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#312E81] w-full justify-center sticky bottom-6"
                >
                  <Save className="w-4 h-4" /> Salvar e Criar Nova Versão
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Nova Versão */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ⚠️ Criar Nova Versão do Assessment
              </h2>
              
              <div className="space-y-3 text-gray-700">
                <p className="font-semibold">Ao continuar, uma <span className="text-[#4F46E5]">NOVA VERSÃO</span> será criada:</p>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 space-y-2">
                  <div className="flex gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>A versão atual (v{currentVersion?.version_number}) permanecerá <strong>intacta</strong> para fins históricos</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Uma nova versão (v{(currentVersion?.version_number || 0) + 1}) será criada com suas alterações</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Resultados já registrados continuarão vinculados à versão original</span>
                  </div>
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-3">
                  <div className="flex gap-2">
                    <span className="text-red-600 font-bold text-lg">⚠️</span>
                    <span className="font-semibold text-red-700">Esta ação <strong>NÃO PODERÁ SER DESFEITA</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowVersionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                ✗ Cancelar
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                ✓ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
