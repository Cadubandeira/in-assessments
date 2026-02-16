import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

function classify(percentage) {
  if (percentage <= 40) return 'Crítico';
  if (percentage <= 70) return 'Moderado';
  return 'Saudável';
}

const getClassificationColor = (classification) => {
  if (classification === 'Crítico') return 'bg-red-100 text-red-700';
  if (classification === 'Moderado') return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
};

export default function History() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, error: roleError } = useUserRole();
  const [history, setHistory] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [viewMode, setViewMode] = useState('latest'); // 'latest'|'all'|'user'
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (roleLoading) return; // Wait for role to load

    let mounted = true;

    const fetchHistory = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setError('Usuário não autenticado.');
          return;
        }

        if (mounted) setCurrentUserId(user.id);

        let query = supabase
          .from('assessment_events')
          .select(`
            id,
            assessment_id,
            assessment_version,
            total_score,
            max_possible_score,
            classification_snapshot,
            indicator_scores_snapshot,
            user_display_name,
            created_at,
            assessment_versions!assessment_events_assessment_version_id_fkey (
              id,
              version_number,
              is_active
            )
          `)
          .order('created_at', { ascending: false });

        // Filter by role
        if (role !== 'admin') {
          query = query.eq('user_id', user.id).limit(1);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          const msg = String(fetchError.message || fetchError);
          if (/0 rows|No rows|Results contain 0/i.test(msg)) {
            if (mounted) setHistory([]);
          } else {
            throw fetchError;
          }
        } else {
          if (mounted) setHistory(data || []);
        }
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => { mounted = false; };
  }, [role, roleLoading]);

  if (roleLoading || loading) {
    return <div className="p-12 text-center">Carregando...</div>;
  }

  if (roleError) {
    return <div className="p-12 text-center text-red-600">{roleError}</div>;
  }

  if (error) {
    return <div className="p-12 text-center text-red-600">{error}</div>;
  }

  if (!history || history.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-4">Histórico de Assessments</h1>
        <div className="p-12 text-center text-gray-600">
          Nenhum assessment encontrado.
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';
  const isUserWithOneResult = role !== 'admin' && history.length === 1;
  // Build a list of unique user ids from history (for admin filter)
  const uniqueUserIds = Array.from(new Set(history.map(h => h.user_id))).filter(Boolean);

  // Determine which items to show based on viewMode and selectedUser
  let visibleItems = history;
  if (isAdmin) {
    if (viewMode === 'latest') {
      // latest for admin defaults to the most recent overall
      visibleItems = history.slice(0, 1);
    } else if (viewMode === 'user' && selectedUser) {
      visibleItems = history.filter(h => h.user_id === selectedUser);
    } else if (viewMode === 'all') {
      visibleItems = history;
    }
  } else {
    visibleItems = history;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-2">Histórico de Assessments</h1>
      <div className="flex items-center justify-between mb-8">
        <p className="text-gray-600">
          {isUserWithOneResult
            ? 'Seu resultado mais recente'
            : isAdmin
            ? 'Visualizando histórico'
            : ''}
        </p>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Filtrar:</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="border rounded px-2 py-1">
              <option value="latest">Mais recente</option>
              <option value="all">Todos os usuários</option>
              <option value="user">Usuário específico</option>
            </select>

            {viewMode === 'user' && (
              <select className="border rounded px-2 py-1" value={selectedUser || ''} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="">Selecione usuário</option>
                {uniqueUserIds.map(uid => (
                  <option key={uid} value={uid}>{uid}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {visibleItems.map((item) => {
          const total = item.total_score ?? 0;
          const max = item.max_possible_score ?? 0;
          const percentage = max > 0 ? Math.round((total / max) * 100) : 0;
          const classification = classify(percentage);
          const date = item.created_at
            ? new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            : '-';

          // Extract version number from join
          const versionNumber = item.assessment_versions?.version_number || '—';

          // For admins viewing all results, display email or user display name if available
          const performedBy = item.user_email || item.user_display_name || item.user_id || '—';

          return (
            <div key={item.id} className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm text-gray-500">{date}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">v{versionNumber}</span>
                    <div className={`px-3 py-1 text-xs font-medium rounded-full ${getClassificationColor(classification)}`}>
                      {classification}
                    </div>
                    {isAdmin && <div className="text-sm text-gray-500">Usuário: <span className="font-medium text-gray-700">{performedBy}</span></div>}
                  </div>
                  <div className="text-lg font-semibold text-gray-800 mb-2">
                    {percentage}% · {total} de {max} pontos
                  </div>
                </div>

                <button onClick={() => navigate(`/results/${item.id}`)} className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg font-medium hover:bg-[#312E81] transition-colors">
                  Ver detalhes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
