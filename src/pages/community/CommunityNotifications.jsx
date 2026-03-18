import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CommunityNotifications = ({ user }) => {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    const loadUpdates = async () => {
      if (!user?.id) {
        setUpdates([]);
        return;
      }

      const { data: following } = await supabase
        .from('community_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(100);

      const followedIds = (following || []).map((item) => item.following_id);

      if (followedIds.length === 0) {
        setUpdates([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', followedIds);

      const nameMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile.display_name;
        return acc;
      }, {});

      const { data: posts } = await supabase
        .from('community_posts')
        .select('id, author_id, content, created_at')
        .eq('is_deleted', false)
        .in('author_id', followedIds)
        .order('created_at', { ascending: false })
        .limit(20);

      const items = (posts || []).map((post) => ({
        ...post,
        display_name: nameMap[post.author_id] || 'Membro'
      }));

      setUpdates(items);
    };

    loadUpdates();
  }, [user?.id]);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold text-[#1E1B4B]">Notificações da comunidade</h2>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Novidades de pessoas que você segue.
      </p>

      {updates.length === 0 ? (
        <p className="text-sm text-gray-500">Sem novas notificações no momento.</p>
      ) : (
        <ul className="space-y-2">
          {updates.map((item) => (
            <li key={item.id} className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">{item.display_name}</span> publicou no feed.
              </p>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.content}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CommunityNotifications;
