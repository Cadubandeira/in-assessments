import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, PenLine, ShieldAlert, Trash2, X } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useCommunityProfile } from '../../hooks/useCommunityProfile';
import {
  AVATAR_BG_OPTIONS,
  AVATAR_OPTIONS,
  DEFAULT_AVATAR_BG,
  DEFAULT_AVATAR_KEY,
  getAvatarBgClass,
  getAvatarOption
} from '../../config/communityProfile';

const CommunityProfile = ({ user }) => {
  const { showNotice } = useOutletContext();
  const { profile, displayName, updateProfile } = useCommunityProfile(user);

  const [formName, setFormName] = useState('');
  const [avatarKey, setAvatarKey] = useState(DEFAULT_AVATAR_KEY);
  const [avatarBgColor, setAvatarBgColor] = useState(DEFAULT_AVATAR_BG);
  const [submitting, setSubmitting] = useState(false);
  const [metrics, setMetrics] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0
  });
  const [myPosts, setMyPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [processingPostId, setProcessingPostId] = useState(null);

  const currentAvatar = useMemo(() => getAvatarOption(avatarKey), [avatarKey]);
  const currentBgClass = useMemo(() => getAvatarBgClass(avatarBgColor), [avatarBgColor]);

  useEffect(() => {
    if (!profile) return;
    setFormName(profile.display_name || displayName || '');
    setAvatarKey(profile.avatar_key || DEFAULT_AVATAR_KEY);
    setAvatarBgColor(profile.avatar_bg_color || DEFAULT_AVATAR_BG);
  }, [displayName, profile]);

  const loadProfileSocialData = useCallback(async () => {
    if (!user?.id) return;

    const [{ data: postsData }, { data: followersData }, { data: followingData }] = await Promise.all([
      supabase
        .from('community_posts')
        .select('id, content, created_at, updated_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
        .eq('is_deleted', false),
      supabase
        .from('community_follows')
        .select('id')
        .eq('following_id', user.id),
      supabase
        .from('community_follows')
        .select('id')
        .eq('follower_id', user.id)
    ]);

    const safePosts = postsData || [];
    const safeFollowers = followersData || [];
    const safeFollowing = followingData || [];

    setMyPosts(safePosts);

    setMetrics({
      postsCount: safePosts.length,
      followersCount: safeFollowers.length,
      followingCount: safeFollowing.length
    });
  }, [user?.id]);

  useEffect(() => {
    loadProfileSocialData();
  }, [loadProfileSocialData]);

  useEffect(() => {
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        loadProfileSocialData();
      }
    };

    const handleWindowFocus = () => {
      loadProfileSocialData();
    };

    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loadProfileSocialData]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`community-profile-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_posts' },
        (payload) => {
          const changedAuthorId = payload.new?.author_id || payload.old?.author_id;
          if (changedAuthorId === user.id) {
            loadProfileSocialData();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_follows' },
        (payload) => {
          const followerId = payload.new?.follower_id || payload.old?.follower_id;
          const followingId = payload.new?.following_id || payload.old?.following_id;

          if (followerId === user.id || followingId === user.id) {
            loadProfileSocialData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProfileSocialData, user?.id]);

  const handleSaveProfile = async () => {
    if (!formName.trim()) {
      showNotice('Defina um nome de exibição para salvar seu perfil.', 'error');
      return;
    }

    setSubmitting(true);

    const { error } = await updateProfile({
      display_name: formName.trim(),
      avatar_key: avatarKey,
      avatar_bg_color: avatarBgColor,
      community_opt_in: true
    });

    if (error) {
      showNotice(`Não foi possível atualizar seu perfil: ${error.message}`, 'error');
    } else {
      showNotice('Perfil comunitário atualizado com sucesso.', 'success');
    }

    setSubmitting(false);
  };

  const handlePauseSharing = async () => {
    if (!formName.trim()) {
      showNotice('Defina ao menos um nome para salvar suas preferências.', 'error');
      return;
    }

    setSubmitting(true);

    const { error } = await updateProfile({
      display_name: formName.trim(),
      avatar_key: avatarKey,
      avatar_bg_color: avatarBgColor,
      community_opt_in: false
    });

    if (error) {
      showNotice(`Não foi possível salvar suas preferências: ${error.message}`, 'error');
    } else {
      showNotice('Compartilhamento pausado. Você pode ativar novamente quando quiser.', 'success');
    }

    setSubmitting(false);
  };

  const handleStartEditPost = (post) => {
    setEditingPostId(post.id);
    setEditingContent(post.content || '');
  };

  const handleCancelEditPost = () => {
    setEditingPostId(null);
    setEditingContent('');
  };

  const handleSaveEditedPost = async () => {
    const content = editingContent.trim();

    if (!content) {
      showNotice('O conteúdo da postagem não pode ficar vazio.', 'error');
      return;
    }

    if (!editingPostId) return;

    setProcessingPostId(editingPostId);

    const { error } = await supabase
      .from('community_posts')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingPostId)
      .eq('author_id', user.id);

    if (error) {
      showNotice(`Não foi possível atualizar a postagem: ${error.message}`, 'error');
      setProcessingPostId(null);
      return;
    }

    showNotice('Postagem atualizada com sucesso.', 'success');
    handleCancelEditPost();
    await loadProfileSocialData();
    setProcessingPostId(null);
  };

  const handleDeletePost = async (postId) => {
    setProcessingPostId(postId);

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id);

    if (error) {
      showNotice(`Não foi possível remover a postagem: ${error.message}`, 'error');
      setProcessingPostId(null);
      return;
    }

    showNotice('Postagem removida do perfil e do feed.', 'success');
    if (editingPostId === postId) {
      handleCancelEditPost();
    }
    await loadProfileSocialData();
    setProcessingPostId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <section className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs uppercase tracking-widest text-indigo-500 font-bold mb-2">Seu perfil público</p>

        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${currentBgClass}`}>
            {currentAvatar.emoji}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Prévia</p>
            <p className="text-sm font-semibold text-gray-800">{formName || displayName}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome de exibição</label>
            <input
              type="text"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              disabled={submitting}
              maxLength={50}
              className="w-full rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Avatar</p>
            <div className="grid grid-cols-2 gap-2">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setAvatarKey(option.key)}
                  disabled={submitting}
                  className={`rounded-lg border px-2.5 py-2 flex items-center gap-2 transition-all ${avatarKey === option.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                >
                  <span className="text-lg" aria-hidden="true">{option.emoji}</span>
                  <span className="text-xs font-medium text-gray-700">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Cor de fundo</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_BG_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setAvatarBgColor(option.key)}
                  disabled={submitting}
                  className={`w-8 h-8 rounded-full ${option.className} ${avatarBgColor === option.key ? 'ring-4 ring-indigo-200' : 'ring-2 ring-transparent'}`}
                  aria-label={`Cor ${option.key}`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSaveProfile}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-4 py-2.5 transition-colors"
          >
            {submitting ? 'Salvando...' : 'Salvar perfil'}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handlePauseSharing}
            className="w-full rounded-xl border border-gray-300 text-gray-700 font-semibold px-4 py-2.5 hover:border-gray-400 transition-colors"
          >
            {submitting ? 'Salvando...' : 'Pausar compartilhamento'}
          </button>
        </div>
      </section>

      <section className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Posts</p>
            <p className="text-xl font-black text-[#1E1B4B] mt-1">{metrics.postsCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Seguidores</p>
            <p className="text-xl font-black text-[#1E1B4B] mt-1">{metrics.followersCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Seguindo</p>
            <p className="text-xl font-black text-[#1E1B4B] mt-1">{metrics.followingCount}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-indigo-600 mt-0.5" />
          <p className="text-sm font-semibold text-indigo-900">Convivência e responsabilidade</p>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          Seu perfil é público apenas na comunidade e pode ser pausado a qualquer momento. Existe moderação ativa,
          e condutas que violem regras podem resultar em suspensão.
        </p>
        <p className="text-sm text-gray-600 mt-3">
          Leia os{' '}
          <Link to="/terms-of-service" className="text-indigo-600 font-semibold hover:underline">
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link to="/privacy-policy" className="text-indigo-600 font-semibold hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <h3 className="text-sm font-bold text-[#1E1B4B] mb-3">Minhas postagens</h3>
          {myPosts.length === 0 ? (
            <p className="text-sm text-gray-500">Você ainda não publicou no feed.</p>
          ) : (
            <ul className="space-y-2">
              {myPosts.map((post) => (
                <li key={post.id} className="rounded-lg border border-gray-200 px-3 py-2.5">
                  {editingPostId === post.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        maxLength={500}
                        className="w-full min-h-[84px] rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 px-3 py-2 text-sm"
                        disabled={processingPostId === post.id}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500">{editingContent.length}/500</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEditPost}
                            disabled={processingPostId === post.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold px-2.5 py-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditedPost}
                            disabled={processingPostId === post.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold px-2.5 py-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {processingPostId === post.id ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{post.content}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('pt-BR')}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditPost(post)}
                            disabled={processingPostId === post.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold px-2.5 py-1.5 hover:border-indigo-300 hover:text-indigo-600"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={processingPostId === post.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 text-xs font-semibold px-2.5 py-1.5 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {processingPostId === post.id ? 'Removendo...' : 'Excluir'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default CommunityProfile;
