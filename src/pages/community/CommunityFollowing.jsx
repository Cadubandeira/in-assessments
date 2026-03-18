import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { getAvatarBgClass, getAvatarOption } from '../../config/communityProfile';

const CommunityFollowing = ({ user }) => {
  const { showNotice } = useOutletContext();
  const [members, setMembers] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [submittingUserId, setSubmittingUserId] = useState(null);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_key, avatar_bg_color')
      .eq('community_opt_in', true)
      .eq('is_banned', false)
      .limit(80);

    const filtered = (data || []).filter((member) => member.id !== user?.id);
    setMembers(filtered);
  }, [user?.id]);

  const loadFollowing = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('community_follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const ids = new Set((data || []).map((item) => item.following_id));
    setFollowingIds(ids);
  }, [user?.id]);

  useEffect(() => {
    loadMembers();
    loadFollowing();
  }, [loadFollowing, loadMembers]);

  const toggleFollow = async (targetId) => {
    if (!user?.id) return;

    const isFollowing = followingIds.has(targetId);
    setSubmittingUserId(targetId);

    if (isFollowing) {
      const { error } = await supabase
        .from('community_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetId);

      if (error) {
        showNotice(`Não foi possível deixar de seguir: ${error.message}`, 'error');
      } else {
        showNotice('Você deixou de seguir esse perfil.', 'success');
      }
    } else {
      const { error } = await supabase
        .from('community_follows')
        .insert([{ follower_id: user.id, following_id: targetId }]);

      if (error) {
        showNotice(`Não foi possível seguir este perfil: ${error.message}`, 'error');
      } else {
        showNotice('Agora você está seguindo esse perfil.', 'success');
      }
    }

    await loadFollowing();
    setSubmittingUserId(null);
  };

  const followingMembers = useMemo(
    () => members.filter((member) => followingIds.has(member.id)),
    [followingIds, members]
  );

  const discoverMembers = useMemo(
    () => members.filter((member) => !followingIds.has(member.id)),
    [followingIds, members]
  );

  const renderMemberCard = (member) => {
    const isFollowing = followingIds.has(member.id);

    return (
      <div key={member.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${getAvatarBgClass(member.avatar_bg_color)}`}>
            {getAvatarOption(member.avatar_key).emoji}
          </div>
          <p className="text-sm font-semibold text-gray-800">{member.display_name || 'Membro'}</p>
        </div>

        <button
          type="button"
          disabled={submittingUserId === member.id}
          onClick={() => toggleFollow(member.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${isFollowing ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {submittingUserId === member.id ? 'Salvando...' : (isFollowing ? 'Seguindo' : 'Seguir')}
        </button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <section className="lg:col-span-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-[#1E1B4B]">Seguindo</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Perfis que você acompanha na comunidade.</p>

        {followingMembers.length === 0 ? (
          <p className="text-sm text-gray-500">Você ainda não segue ninguém.</p>
        ) : (
          <div className="space-y-2">{followingMembers.map(renderMemberCard)}</div>
        )}
      </section>

      <section className="lg:col-span-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-[#1E1B4B]">Descobrir pessoas</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Explore novos perfis públicos para seguir.</p>

        {discoverMembers.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum perfil sugerido no momento.</p>
        ) : (
          <div className="space-y-2">{discoverMembers.map(renderMemberCard)}</div>
        )}
      </section>
    </div>
  );
};

export default CommunityFollowing;
