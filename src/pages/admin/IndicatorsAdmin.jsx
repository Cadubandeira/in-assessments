import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { ICON_OPTIONS, COLOR_OPTIONS } from '../../config/tokens';
import IndicatorsAdminSkeleton from '../../components/skeletons/admin/IndicatorsAdminSkeleton';

export default function IndicatorsAdmin() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#6366F1');
  const [newIcon, setNewIcon] = useState('circle');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

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
        .insert([{ 
          name: newName.trim(), 
          description: newDescription.trim(),
          color: newColor,
          icon: newIcon
        }]);

      if (insertError) throw insertError;

      // Atualizar lista
      const { data } = await supabase
        .from('indicators_master')
        .select('*')
        .order('created_at', { ascending: false });
      setIndicators(data || []);
      setNewName('');
      setNewDescription('');
      setNewColor('#6366F1');
      setNewIcon('circle');
    } catch (err) {
      alert('Erro ao criar indicador: ' + (err.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (indicator) => {
    setEditingId(indicator.id);
    setEditingData({
      name: indicator.name || '',
      description: indicator.description || '',
      color: indicator.color || '#6366F1',
      icon: indicator.icon || 'circle'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingData.name?.trim()) {
      alert('Nome do indicador é obrigatório.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('indicators_master')
        .update({
          name: editingData.name.trim(),
          description: editingData.description?.trim() || '',
          color: editingData.color,
          icon: editingData.icon
        })
        .eq('id', editingId);

      if (updateError) throw updateError;

      // Atualizar lista
      const { data } = await supabase
        .from('indicators_master')
        .select('*')
        .order('created_at', { ascending: false });
      setIndicators(data || []);
      setEditingId(null);
      setEditingData({});
    } catch (err) {
      alert('Erro ao atualizar indicador: ' + (err.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({});
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
    return <IndicatorsAdminSkeleton />;
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
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/dashboard')} className="text-[#4F46E5] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h1 className="text-2xl md:text-3xl font-semibold">Gerenciar Indicadores</h1>
      </div>

      {/* Formulário de criação */}
      <form onSubmit={handleCreate} className="p-4 md:p-6 border rounded-lg bg-white mb-8">
        <h2 className="text-lg font-semibold mb-4">Criar Novo Indicador</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-8 h-8 rounded border-2 transition ${newColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ícone</label>
              <select
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {ICON_OPTIONS.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#4F46E5] text-white rounded-lg font-medium hover:bg-[#312E81] disabled:opacity-50 transition"
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
            <div key={ind.id} className="p-4 border rounded-lg bg-white">
              {editingId === ind.id ? (
                // Modo de edição
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome *</label>
                    <input
                      type="text"
                      value={editingData.name}
                      onChange={(e) => setEditingData({...editingData, name: e.target.value})}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Descrição</label>
                    <textarea
                      value={editingData.description}
                      onChange={(e) => setEditingData({...editingData, description: e.target.value})}
                      rows={3}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Cor</label>
                      <div className="flex gap-2 flex-wrap">
                        {COLOR_OPTIONS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditingData({...editingData, color})}
                            className={`w-8 h-8 rounded border-2 transition ${editingData.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ícone</label>
                      <select
                        value={editingData.icon}
                        onChange={(e) => setEditingData({...editingData, icon: e.target.value})}
                        className="w-full border rounded px-3 py-2 text-sm"
                      >
                        {ICON_OPTIONS.map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      <Save className="w-4 h-4" /> Salvar
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50 transition"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo de visualização
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: ind.color || '#6366F1' }}
                      >
                        <span className="text-xs font-bold text-white">●</span>
                      </div>
                      <h3 className="font-semibold text-gray-800 break-words">{ind.name}</h3>
                    </div>
                    {ind.description && <p className="text-sm text-gray-600 mb-2">{ind.description}</p>}
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Ícone: <span className="font-medium">{ind.icon || 'circle'}</span></p>
                      <p>Criado em {new Date(ind.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(ind)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ind.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
