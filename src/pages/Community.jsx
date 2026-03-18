import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Bell, Newspaper, ShieldAlert, UserRound, Users } from 'lucide-react';
import { useCommunityProfile } from '../hooks/useCommunityProfile';
import {
  AVATAR_BG_OPTIONS,
  AVATAR_OPTIONS,
  DEFAULT_AVATAR_BG,
  DEFAULT_AVATAR_KEY,
  getAvatarBgClass,
  getAvatarOption
} from '../config/communityProfile';

const Community = ({ user }) => {
  const { profile, loading, updateProfile, displayName } = useCommunityProfile(user);

  const [formName, setFormName] = useState('');
  const [avatarKey, setAvatarKey] = useState(DEFAULT_AVATAR_KEY);
  const [avatarBgColor, setAvatarBgColor] = useState(DEFAULT_AVATAR_BG);
  const [acceptedConduct, setAcceptedConduct] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const currentAvatar = useMemo(() => getAvatarOption(avatarKey), [avatarKey]);
  const currentBgClass = useMemo(() => getAvatarBgClass(avatarBgColor), [avatarBgColor]);

  useEffect(() => {
    if (!profile) return;
    setFormName(profile.display_name || displayName || '');
    setAvatarKey(profile.avatar_key || DEFAULT_AVATAR_KEY);
    setAvatarBgColor(profile.avatar_bg_color || DEFAULT_AVATAR_BG);
  }, [displayName, profile]);

  useEffect(() => {
    if (!notice?.text) return undefined;

    const timer = setTimeout(() => {
      setNotice(null);
    }, 4200);

    return () => clearTimeout(timer);
  }, [notice]);

  const showNotice = (text, type = 'success') => {
    setNotice({ text, type });
  };

  const handleShareAndEnter = async () => {
    if (!formName.trim()) {
      showNotice('Defina um nome de exibição para entrar na comunidade.', 'error');
      return;
    }

    if (!acceptedConduct) {
      showNotice('Confirme que leu o código de conduta para continuar.', 'error');
      return;
    }

    setSubmitting(true);
    setNotice(null);

    const { error } = await updateProfile({
      display_name: formName.trim(),
      avatar_key: avatarKey,
      avatar_bg_color: avatarBgColor,
      community_opt_in: true,
      community_onboarded_at: new Date().toISOString()
    });

    if (error) {
      showNotice(`Não foi possível salvar seu perfil: ${error.message}`, 'error');
    } else {
      showNotice('Perfil salvo. Bem-vindo à comunidade!', 'success');
    }

    setSubmitting(false);
  };

  const navItemClass = ({ isActive }) => (
    `flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${isActive
      ? 'bg-indigo-600 text-white'
      : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC] px-4">
        <p className="text-gray-600">Carregando comunidade...</p>
      </div>
    );
  }

  if (profile?.is_banned) {
    return (
      <div className="min-h-screen bg-[#F5F3EC] pt-[88px] px-4 pb-24">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-3 mb-3">
            <ShieldAlert className="w-6 h-6 text-red-500 mt-1" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Acesso à comunidade suspenso</h1>
              <p className="text-sm text-gray-600 mt-1">
                Seu acesso à comunidade foi suspenso por descumprimento das regras de convivência.
              </p>
            </div>
          </div>
          {profile?.banned_reason && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-4">Motivo: {profile.banned_reason}</p>
          )}
          <p className="text-sm text-gray-600">
            Consulte os{' '}
            <Link to="/terms-of-service" className="text-indigo-600 font-semibold hover:underline">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link to="/privacy-policy" className="text-indigo-600 font-semibold hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (!profile?.community_opt_in) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] pt-[88px] px-4 pb-24">
        {notice?.text && (
          <div className={`max-w-3xl mx-auto mb-4 rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {notice.text}
          </div>
        )}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-6 py-6 text-white">
            <p className="text-white/80 uppercase tracking-widest text-xs font-semibold">Comunidade</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">Entre rápido e do seu jeito</h1>
            <p className="text-sm md:text-base text-white/90 mt-2">
              Para ver conteúdos da comunidade, você precisa ativar o compartilhamento dos seus resultados.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome de exibição</label>
              <input
                type="text"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                disabled={submitting}
                maxLength={50}
                className="w-full rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 px-4 py-3 text-sm"
                placeholder="Como você quer aparecer na comunidade"
              />
              <p className="text-xs text-gray-500 mt-2">Esse nome também aparecerá no “Olá” do dashboard.</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Escolha seu avatar</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVATAR_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAvatarKey(option.key)}
                    disabled={submitting}
                    className={`rounded-xl border px-3 py-3 flex items-center gap-3 transition-all ${avatarKey === option.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                  >
                    <span className="text-xl" aria-hidden="true">{option.emoji}</span>
                    <span className="text-sm font-medium text-gray-700">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Cor de fundo do avatar</p>
              <div className="flex flex-wrap gap-3">
                {AVATAR_BG_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAvatarBgColor(option.key)}
                    disabled={submitting}
                    className={`w-10 h-10 rounded-full ${option.className} ${avatarBgColor === option.key ? 'ring-4 ring-indigo-200' : 'ring-2 ring-transparent'}`}
                    aria-label={`Cor ${option.key}`}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="flex items-start gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600 mt-0.5" />
                <p className="text-sm font-semibold text-indigo-900">Código rápido de conduta</p>
              </div>
              <p className="text-sm text-indigo-900/80 leading-relaxed">
                Respeite as pessoas e contribua para uma boa convivência. Existem moderadores ativos e contas que
                descumprirem os{' '}
                <Link to="/terms-of-service" className="underline font-semibold">
                  Termos de Uso
                </Link>{' '}
                ou a{' '}
                <Link to="/privacy-policy" className="underline font-semibold">
                  Política de Privacidade
                </Link>{' '}
                podem ser banidas da plataforma.
              </p>

              <label className="mt-3 flex items-center gap-2 text-sm text-indigo-900">
                <input
                  type="checkbox"
                  checked={acceptedConduct}
                  onChange={(event) => setAcceptedConduct(event.target.checked)}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                />
                Li e entendi as regras da comunidade.
              </label>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${currentBgClass}`}>
                {currentAvatar.emoji}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Prévia do perfil</p>
                <p className="text-sm font-semibold text-gray-800">{formName || displayName}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={handleShareAndEnter}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-4 py-3 transition-colors"
              >
                {submitting ? 'Salvando...' : 'Compartilhar e entrar na comunidade'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] pt-[88px] px-4 pb-24">
      {notice?.text && (
        <div className={`max-w-7xl mx-auto mb-4 rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-4">
        <section className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-5">
          <p className="text-xs uppercase tracking-widest text-indigo-500 font-bold mb-1">Comunidade</p>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E1B4B]">Rede social mobile-first</h1>
          <p className="text-sm text-gray-600 mt-1">
            Compartilhe evolução, acompanhe pessoas e interaja em tempo real.
          </p>

          <nav className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <NavLink to="/comunidade/feed" className={navItemClass}>
              <Newspaper className="w-4 h-4" />
              <span>Feed</span>
            </NavLink>
            <NavLink to="/comunidade/perfil" className={navItemClass}>
              <UserRound className="w-4 h-4" />
              <span>Perfil</span>
            </NavLink>
            <NavLink to="/comunidade/seguindo" className={navItemClass}>
              <Users className="w-4 h-4" />
              <span>Seguindo</span>
            </NavLink>
            <NavLink to="/comunidade/notificacoes" className={navItemClass}>
              <Bell className="w-4 h-4" />
              <span>Notificações</span>
            </NavLink>
          </nav>
        </section>

        <Outlet context={{ showNotice }} />
      </div>
    </div>
  );
};

export default Community;
