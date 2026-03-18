import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MessageSquarePlus, Sparkles, ThumbsUp, Trophy, Users } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useTopRanking } from '../../hooks/useTopRanking';
import { useUserRanking } from '../../hooks/useUserRanking';

const REACTIONS = [
  { key: 'like', label: 'Curtir', emoji: '👍' },
  { key: 'celebrate', label: 'Celebrar', emoji: '🎉' },
  { key: 'support', label: 'Apoiar', emoji: '💜' }
];

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'abuso', label: 'Abuso' },
  { key: 'conteudo_inadequado', label: 'Conteúdo inadequado' },
  { key: 'desinformacao', label: 'Desinformação' },
  { key: 'outro', label: 'Outro' }
];

const CommunityFeed = ({ user }) => {
  const { showNotice } = useOutletContext();
  const { topUsers } = useTopRanking();
  const { ranking } = useUserRanking(user?.id);

  const [composerValue, setComposerValue] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const [reactingPostId, setReactingPostId] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [posts, setPosts] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [communityMemberIds, setCommunityMemberIds] = useState([]);
  const [reactionsByPost, setReactionsByPost] = useState({});
  const [reportingPostId, setReportingPostId] = useState(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].key);
  const [reportDetails, setReportDetails] = useState('');
  const [savingReport, setSavingReport] = useState(false);

  const loadCommunityProfiles = useCallback(async () => {
    const { data: optedProfiles, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_key, avatar_bg_color')
      .eq('community_opt_in', true)
      .eq('is_banned', false)
      .limit(500);

    if (error || !optedProfiles) {
      setCommunityMemberIds([]);
      setProfilesMap({});
      return [];
    }

    const ids = optedProfiles.map((member) => member.id);
    const map = optedProfiles.reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {});

    setCommunityMemberIds(ids);
    setProfilesMap(map);
    return ids;
  }, []);

  const loadActivityFeed = useCallback(async (ids) => {
    if (!ids || ids.length === 0) {
      setActivityFeed([]);
      return;
    }

    const { data: eventsData, error } = await supabase
      .from('assessment_events')
      .select('id, user_id, user_display_name, activity_name, activity_type, created_at')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !eventsData) {
      setActivityFeed([]);
      return;
    }

    setActivityFeed(eventsData);
  }, []);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select('id, author_id, content, created_at, updated_at')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) {
      setPosts([]);
      return [];
    }

    setPosts(data);
    return data;
  }, []);

  const loadReactions = useCallback(async (postRows) => {
    if (!postRows || postRows.length === 0) {
      setReactionsByPost({});
      return;
    }

    const postIds = postRows.map((post) => post.id);

    const { data, error } = await supabase
      .from('community_post_reactions')
      .select('id, post_id, user_id, reaction_type')
      .in('post_id', postIds);

    if (error || !data) {
      setReactionsByPost({});
      return;
    }

    const grouped = data.reduce((acc, reaction) => {
      const prev = acc[reaction.post_id] || {
        counts: { like: 0, celebrate: 0, support: 0 },
        currentUserReaction: null
      };

      prev.counts[reaction.reaction_type] = (prev.counts[reaction.reaction_type] || 0) + 1;
      if (reaction.user_id === user?.id) {
        prev.currentUserReaction = reaction.reaction_type;
      }

      acc[reaction.post_id] = prev;
      return acc;
    }, {});

    setReactionsByPost(grouped);
  }, [user?.id]);

  const refreshAll = useCallback(async () => {
    const ids = await loadCommunityProfiles();
    await loadActivityFeed(ids);
    const postRows = await loadPosts();
    await loadReactions(postRows);
  }, [loadActivityFeed, loadCommunityProfiles, loadPosts, loadReactions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        refreshAll();
      }
    };

    const handleWindowFocus = () => {
      refreshAll();
    };

    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [refreshAll]);

  useEffect(() => {
    const channel = supabase
      .channel('community-feed-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_posts' },
        () => {
          refreshAll();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_post_reactions' },
        async () => {
          const postRows = await loadPosts();
          await loadReactions(postRows);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          refreshAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts, loadReactions, refreshAll]);

  const topCommunityUsers = useMemo(() => {
    const allowedUsers = new Set(communityMemberIds);
    return (topUsers || [])
      .filter((member) => allowedUsers.has(member.user_id))
      .map((member, index) => ({
        ...member,
        community_rank: index + 1
      }))
      .slice(0, 5);
  }, [communityMemberIds, topUsers]);

  const handleCreatePost = async () => {
    const content = composerValue.trim();

    if (!content) {
      showNotice('Escreva algo para publicar.', 'error');
      return;
    }

    setSavingPost(true);

    const { error } = await supabase
      .from('community_posts')
      .insert([{ author_id: user.id, content }]);

    if (error) {
      showNotice(`Não foi possível publicar: ${error.message}`, 'error');
      setSavingPost(false);
      return;
    }

    setComposerValue('');
    showNotice('Post publicado na comunidade.', 'success');
    await refreshAll();
    setSavingPost(false);
  };

  const handleReact = async (postId, reactionType) => {
    const current = reactionsByPost[postId]?.currentUserReaction;
    setReactingPostId(postId);

    if (current === reactionType) {
      const { error } = await supabase
        .from('community_post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        showNotice(`Não foi possível remover reação: ${error.message}`, 'error');
      }

      const postRows = await loadPosts();
      await loadReactions(postRows);
      setReactingPostId(null);
      return;
    }

    const { error } = await supabase
      .from('community_post_reactions')
      .upsert([
        {
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType
        }
      ], { onConflict: 'post_id,user_id' });

    if (error) {
      showNotice(`Não foi possível reagir ao post: ${error.message}`, 'error');
      setReactingPostId(null);
      return;
    }

    const postRows = await loadPosts();
    await loadReactions(postRows);
    setReactingPostId(null);
  };

  const handleOpenReport = (postId) => {
    setReportingPostId(postId);
    setReportReason(REPORT_REASONS[0].key);
    setReportDetails('');
  };

  const handleCloseReport = () => {
    setReportingPostId(null);
    setReportReason(REPORT_REASONS[0].key);
    setReportDetails('');
  };

  const handleSubmitReport = async (post) => {
    setSavingReport(true);

    const { error } = await supabase
      .from('community_post_reports')
      .insert([
        {
          post_id: post.id,
          reporter_id: user.id,
          reason: reportReason,
          details: reportDetails.trim() || null
        }
      ]);

    if (error) {
      showNotice(`Não foi possível enviar a denúncia: ${error.message}`, 'error');
      setSavingReport(false);
      return;
    }

    showNotice('Denúncia enviada para moderação.', 'success');
    setSavingReport(false);
    handleCloseReport();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <section className="lg:col-span-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquarePlus className="w-5 h-5 text-indigo-500" />
          <p className="font-bold text-gray-900">Publicar no feed</p>
        </div>
        <textarea
          value={composerValue}
          onChange={(event) => setComposerValue(event.target.value)}
          maxLength={500}
          placeholder="Compartilhe uma conquista, insight ou aprendizado de hoje..."
          className="w-full min-h-[96px] rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 px-4 py-3 text-sm"
          disabled={savingPost}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">{composerValue.length}/500</p>
          <button
            type="button"
            disabled={savingPost}
            onClick={handleCreatePost}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
          >
            {savingPost ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </section>

      <section className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          <p className="font-bold text-gray-900">Seu ranking</p>
        </div>
        <p className="text-sm text-gray-600">Posição atual</p>
        <p className="text-3xl font-black text-indigo-700 mt-1">#{ranking?.rank || '-'}</p>
        <p className="text-sm text-gray-500 mt-2">Top {ranking?.percentile_rank ? `${100 - ranking.percentile_rank + 1}%` : '—'}</p>
      </section>

      <section className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-indigo-500" />
          <p className="font-bold text-gray-900">Top comunidade</p>
        </div>
        <ul className="space-y-2">
          {topCommunityUsers.map((member) => (
            <li key={member.user_id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-medium text-gray-700">#{member.community_rank} {member.display_name || 'Membro'}</span>
              <span className="font-semibold text-indigo-600">{member.total_xp || 0} XP</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="lg:col-span-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <p className="font-bold text-gray-900">Feed social</p>
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum post ainda. Seja a primeira pessoa a publicar.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => {
              const author = profilesMap[post.author_id];
              const postReactions = reactionsByPost[post.id] || { counts: { like: 0, celebrate: 0, support: 0 }, currentUserReaction: null };

              return (
                <li key={post.id} className="rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-800">{author?.display_name || 'Membro'}</p>
                    <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {REACTIONS.map((reaction) => {
                      const active = postReactions.currentUserReaction === reaction.key;
                      const count = postReactions.counts[reaction.key] || 0;

                      return (
                        <button
                          key={reaction.key}
                          type="button"
                          disabled={reactingPostId === post.id}
                          onClick={() => handleReact(post.id, reaction.key)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${active ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700'}`}
                        >
                          <span className="mr-1">{reaction.emoji}</span>
                          {reaction.label} ({count})
                        </button>
                      );
                    })}
                    <span className="inline-flex items-center text-xs text-gray-400 ml-1">
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Interaja
                    </span>
                    {post.author_id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => handleOpenReport(post.id)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 ml-auto"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Denunciar
                      </button>
                    )}
                  </div>

                  {reportingPostId === post.id && (
                    <div className="mt-3 rounded-xl border border-red-100 bg-red-50/70 p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-red-900 mb-1">Motivo</label>
                        <select
                          value={reportReason}
                          onChange={(event) => setReportReason(event.target.value)}
                          className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-700"
                          disabled={savingReport}
                        >
                          {REPORT_REASONS.map((reason) => (
                            <option key={reason.key} value={reason.key}>{reason.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-red-900 mb-1">Detalhes (opcional)</label>
                        <textarea
                          value={reportDetails}
                          onChange={(event) => setReportDetails(event.target.value)}
                          className="w-full min-h-[80px] rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-700"
                          maxLength={300}
                          disabled={savingReport}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCloseReport}
                          disabled={savingReport}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitReport(post)}
                          disabled={savingReport}
                          className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          {savingReport ? 'Enviando...' : 'Enviar denúncia'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="lg:col-span-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <p className="font-bold text-gray-900">Atividade recente da comunidade</p>
        </div>
        {activityFeed.length === 0 ? (
          <p className="text-sm text-gray-500">Ainda não há atividades públicas recentes.</p>
        ) : (
          <ul className="space-y-2">
            {activityFeed.map((event) => (
              <li key={event.id} className="rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-800">
                  <span className="font-semibold">{profilesMap[event.user_id]?.display_name || event.user_display_name || 'Membro'}</span> concluiu{' '}
                  <span className="font-semibold">{event.activity_name || event.activity_type || 'uma atividade'}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(event.created_at).toLocaleString('pt-BR')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CommunityFeed;
