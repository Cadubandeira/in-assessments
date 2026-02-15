import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function IndicatorsAdmin() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Redirect se não for admin
    if (!roleLoading && role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    let mounted = true;
    const fetchIndicators = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('indicators_master')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        if (mounted) setIndicators(data || []);
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (role === 'admin') fetchIndicators();
    return () => { mounted = false; };
  }, [role, roleLoading, navigate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Nome do indicador é obrigatório.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('indicators_master')
        .insert([{ name: newName.trim(), description: newDescription.trim() }]);

      if (insertError) throw insertError;

      // Atualizar lista
      const { data } = await supabase
        .from('indicators_master')
        .select('*')
        .order('created_at', { ascending: false });
      setIndicators(data || []);
      setNewName('');
      setNewDescription('');
    } catch (err) {
      alert('Erro ao criar indicador: ' + (err.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este indicador?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('indicators_master')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setIndicators(indicators.filter(ind => ind.id !== id));
    } catch (err) {
      alert('Erro ao deletar: ' + (err.message || String(err)));
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
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/dashboard')} className="text-[#4F46E5] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h1 className="text-3xl font-semibold">Gerenciar Indicadores</h1>
      </div>

      {/* Formulário de criação */}
      <form onSubmit={handleCreate} className="p-6 border rounded-lg bg-white mb-8">
        <h2 className="text-lg font-semibold mb-4">Criar Novo Indicador</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Liderança"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Ex: Capacidade de liderar e inspirar equipes"
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white rounded-lg font-medium hover:bg-[#312E81] disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {submitting ? 'Criando...' : 'Criar Indicador'}
          </button>
        </div>
      </form>

      {/* Lista de indicadores */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Indicadores Existentes ({indicators.length})</h2>
        {indicators.length === 0 ? (
          <div className="p-6 border rounded-lg text-center text-gray-600">
            Nenhum indicador criado ainda.
          </div>
        ) : (
          indicators.map((ind) => (
            <div key={ind.id} className="p-4 border rounded-lg bg-white flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{ind.name}</h3>
                {ind.description && <p className="text-sm text-gray-600">{ind.description}</p>}
                <p className="text-xs text-gray-500 mt-2">Criado em {new Date(ind.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleDelete(ind.id)}
                className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
