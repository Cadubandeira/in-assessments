import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

export default function AssessmentBuilder() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [assessments, setAssessments] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [ranges, setRanges] = useState({}); // { indicatorId: [{ min, max, label, interpretation }] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleSelectAssessment = (assessmentId) => {
    setSelectedAssessment(assessmentId);
    setSelectedIndicators([]);
    setRanges({});
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

  const handleSave = async () => {
    if (!selectedAssessment || selectedIndicators.length === 0) {
      alert('Selecione um assessment e pelo menos um indicador.');
      return;
    }

    try {
      // Salvar assessment_indicators e assessment_indicator_ranges
      for (const indicatorId of selectedIndicators) {
        const displayOrder = selectedIndicators.indexOf(indicatorId) + 1;
        
        const { data: aiData, error: aiError } = await supabase
          .from('assessment_indicators')
          .insert([{ assessment_id: selectedAssessment, indicator_master_id: indicatorId, display_order: displayOrder }])
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

      alert('Assessment configurado com sucesso!');
      navigate('/dashboard');
    } catch (err) {
      alert('Erro ao salvar: ' + (err.message || String(err)));
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
        <div className="lg:col-span-1">
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
        </div>

        {/* Coluna Direita: Configuração de Indicadores e Ranges */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seleção de Indicadores */}
          <div className="p-6 border rounded-lg bg-white">
            <h2 className="text-lg font-semibold mb-4">Indicadores Disponíveis</h2>
            <div className="grid grid-cols-2 gap-2">
              {indicators.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => !selectedIndicators.includes(ind.id) && handleAddIndicator(ind.id)}
                  disabled={selectedIndicators.includes(ind.id)}
                  className={`px-4 py-2 rounded border text-sm font-medium transition ${
                    selectedIndicators.includes(ind.id)
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                      : 'border-gray-300 hover:border-[#4F46E5] text-gray-700 hover:text-[#4F46E5]'
                  }`}
                >
                  + {ind.name}
                </button>
              ))}
            </div>
          </div>

          {/* Indicadores Selecionados e Ranges */}
          {selectedIndicators.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Faixas de Classificação</h2>
              {selectedIndicators.map((indicatorId) => {
                const indicator = indicators.find(i => i.id === indicatorId);
                return (
                  <div key={indicatorId} className="p-6 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[#4F46E5]">{indicator?.name}</h3>
                      <button
                        onClick={() => handleRemoveIndicator(indicatorId)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Ranges do Indicador */}
                    <div className="space-y-3 mb-4">
                      {ranges[indicatorId]?.map((range, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <input
                            type="number"
                            placeholder="Min"
                            value={range.min}
                            onChange={(e) => handleUpdateRange(indicatorId, idx, 'min', e.target.value)}
                            className="w-20 border rounded px-2 py-1 text-sm"
                          />
                          <span>até</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={range.max}
                            onChange={(e) => handleUpdateRange(indicatorId, idx, 'max', e.target.value)}
                            className="w-20 border rounded px-2 py-1 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Label"
                            value={range.label}
                            onChange={(e) => handleUpdateRange(indicatorId, idx, 'label', e.target.value)}
                            className="flex-1 border rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => handleRemoveRange(indicatorId, idx)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Interpretação */}
                    {ranges[indicatorId]?.length > 0 && (
                      <div className="space-y-2 mb-4 p-4 bg-gray-50 rounded">
                        {ranges[indicatorId].map((range, idx) => (
                          <div key={idx}>
                            <label className="text-xs font-medium text-gray-600">
                              Interpretação ({range.label})
                            </label>
                            <textarea
                              value={range.interpretation}
                              onChange={(e) => handleUpdateRange(indicatorId, idx, 'interpretation', e.target.value)}
                              placeholder="Ex: Excelente desempenho em liderança..."
                              rows={2}
                              className="w-full border rounded px-2 py-1 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleAddRange(indicatorId)}
                      className="flex items-center gap-1 text-sm text-[#4F46E5] hover:text-[#312E81] font-medium"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Faixa
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botão Salvar */}
          <button
            onClick={handleSave}
            disabled={!selectedAssessment || selectedIndicators.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#312E81] disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
          >
            <Save className="w-4 h-4" /> Salvar Configuração
          </button>
        </div>
      </div>
    </div>
  );
}
