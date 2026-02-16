import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';

function classify(percentage) {
  if (percentage <= 40) return 'Crítico';
  if (percentage <= 70) return 'Moderado';
  return 'Saudável';
}

const generateInterpretation = (name, percentage) => {
  if (percentage <= 40)
    return `O indicador ${name} apresenta nível crítico e requer atenção imediata.`;
  if (percentage <= 70)
    return `O indicador ${name} apresenta nível moderado, com oportunidades claras de melhoria.`;
  return `O indicador ${name} apresenta nível saudável e consistente.`;
};

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchResult = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setError('Usuário não autenticado.');
          return;
        }

        let query = supabase
          .from('assessment_events')
          .select(`
            *,
            assessment_versions!assessment_events_assessment_version_id_fkey (
              id,
              version_number,
              is_active,
              created_at
            )
          `);

        // If id provided, fetch specific record; otherwise fetch last for current user
        if (id) {
          query = query.eq('id', id);
        } else {
          query = query.eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        }

        const { data, error } = await query.single();

        if (error) {
          const msg = String(error.message || error);
          if (/0 rows|No rows|Results contain 0/i.test(msg)) {
            if (mounted) setResult(null);
          } else {
            throw error;
          }
        } else {
          if (mounted) setResult(data);
        }
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchResult();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-12 text-center">Carregando...</div>;
  if (error) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!result) return <div className="p-12 text-center">Nenhum assessment encontrado.</div>;

  const total = result.total_score ?? 0;
  const max = result.max_possible_score ?? 0;
  const percentage = max > 0 ? Math.round((total / max) * 100) : 0;
  const classification = classify(percentage);
  const date = result.created_at ? new Date(result.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';
  const versionNumber = result.assessment_versions?.version_number || '—';

  let indicatorScores = result.indicator_scores_snapshot || {};
  if (typeof indicatorScores === 'string') {
    try { indicatorScores = JSON.parse(indicatorScores); } catch (e) { indicatorScores = {}; }
  }

  // classification snapshot may contain detailed per-indicator results
  let classificationSnapshot = result.classification_snapshot || null;
  if (typeof classificationSnapshot === 'string') {
    try { classificationSnapshot = JSON.parse(classificationSnapshot); } catch (e) { classificationSnapshot = null; }
  }

  // Build indicator results: prefer snapshot, otherwise fallback to best-effort calculation
  const indicatorResults = classificationSnapshot || (() => {
    const out = {};
    const totalOverall = Object.values(indicatorScores).reduce((s, v) => s + (Number(v) || 0), 0);
    Object.entries(indicatorScores).forEach(([k, v]) => {
      const score = Number(v) || 0;
      const max = max > 0 && totalOverall > 0 ? Math.round((score / Math.max(1, totalOverall)) * max) : 0;
      const percentage = max > 0 ? Math.round((score / max) * 100) : (max === 0 && score === 0 ? 0 : Math.round((score / Math.max(1, max)) * 100));
      out[k] = {
        score,
        maxScore: max,
        percentage,
        classification: classify(percentage),
        interpretation: generateInterpretation(k, percentage)
      };
    });
    return out;
  })();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold">Resultado do Assessment</h1>
        {id && (
          <button onClick={() => navigate('/history')} className="text-sm text-[#4F46E5] hover:underline">
            ← Voltar ao Histórico
          </button>
        )}
      </div>

      <div className="p-8 border rounded-2xl bg-white shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="flex-0 text-center">
          <div className="text-6xl font-extrabold text-[#4F46E5]">{percentage}%</div>
          <div className="mt-2 text-sm text-gray-500">{classification}</div>
        </div>

        <div className="flex-1 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg text-center">
              <div className="text-xs text-gray-500">Score total</div>
              <div className="text-lg font-medium">{total}</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-xs text-gray-500">Score máximo</div>
              <div className="text-lg font-medium">{max}</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-xs text-gray-500">Data e Hora</div>
              <div className="text-lg font-medium">{date}</div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded text-center">
            <span className="text-xs text-gray-500 mr-2">Versão do Assessment:</span>
            <span className="text-sm font-semibold text-gray-700">v{versionNumber}</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Indicadores</h3>
            <div className="space-y-4">
              {Object.entries(indicatorResults).map(([k, v]) => (
                <div key={k} className="p-4 border rounded-md">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-medium text-gray-800">{k}</h4>
                    <div className="text-sm text-gray-600">{v.score} de {v.maxScore} pontos</div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="text-lg font-semibold">{v.percentage}%</div>
                    <div className={`px-2 py-1 text-xs font-medium rounded-full ${v.classification === 'Crítico' ? 'bg-red-100 text-red-700' : v.classification === 'Moderado' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {v.classification}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">Descrição: {v.interpretation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
