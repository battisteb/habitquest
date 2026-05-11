import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { profileStore$ } from '../../gamification/stores/profile-store';
import { persistPlugin } from '../../../lib/storage/persist';
import type { Database } from '../../../lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile: Profile;
}

interface FriendsState {
  friends: Friendship[];
  pendingReceived: Friendship[];
  pendingSent: Friendship[];
  searchResults: Profile[];
  isLoading: boolean;
}

export const friendsStore$ = observable<FriendsState>({
  friends: [],
  pendingReceived: [],
  pendingSent: [],
  searchResults: [],
  isLoading: false,
});

syncObservable(friendsStore$, {
  persist: {
    name: 'habitquest_friends',
    plugin: persistPlugin,
  },
});

export async function fetchFriends() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  friendsStore$.isLoading.set(true);
  try {
    // Fetch accepted friendships where I'm requester
    const { data: asRequester } = await supabase
      .from('friendships')
      .select('*, profile:profiles!friendships_addressee_id_fkey(*)')
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    // Fetch accepted friendships where I'm addressee
    const { data: asAddressee } = await supabase
      .from('friendships')
      .select('*, profile:profiles!friendships_requester_id_fkey(*)')
      .eq('addressee_id', userId)
      .eq('status', 'accepted');

    const friends = [
      ...(asRequester ?? []).map((f: any) => ({ ...f, profile: f.profile })),
      ...(asAddressee ?? []).map((f: any) => ({ ...f, profile: f.profile })),
    ];
    friendsStore$.friends.set(friends);

    // Fetch pending requests received
    const { data: received } = await supabase
      .from('friendships')
      .select('*, profile:profiles!friendships_requester_id_fkey(*)')
      .eq('addressee_id', userId)
      .eq('status', 'pending');

    friendsStore$.pendingReceived.set(
      (received ?? []).map((f: any) => ({ ...f, profile: f.profile })),
    );

    // Fetch pending requests sent
    const { data: sent } = await supabase
      .from('friendships')
      .select('*, profile:profiles!friendships_addressee_id_fkey(*)')
      .eq('requester_id', userId)
      .eq('status', 'pending');

    friendsStore$.pendingSent.set(
      (sent ?? []).map((f: any) => ({ ...f, profile: f.profile })),
    );
  } finally {
    friendsStore$.isLoading.set(false);
  }
}

export async function searchUsers(query: string) {
  if (query.length < 2) {
    friendsStore$.searchResults.set([]);
    return;
  }

  const userId = authStore$.user.get()?.id;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .neq('id', userId ?? '')
    .limit(10);

  friendsStore$.searchResults.set(data ?? []);
}

export async function sendFriendRequest(addresseeId: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { error } = await supabase.from('friendships').insert({
    requester_id: userId,
    addressee_id: addresseeId,
  });

  if (error) throw error;

  const senderName = profileStore$.profile.get()?.username ?? 'A player';
  void supabase.rpc('create_notification', {
    p_user_id: addresseeId,
    p_type: 'friend_request',
    p_title: '👥 Friend request',
    p_body: `${senderName} wants to be your friend.`,
    p_data: { route: '/(tabs)/social', requesterId: userId },
  });

  await fetchFriends();
}

export async function respondToRequest(friendshipId: string, accept: boolean) {
  // Look up the requester to notify them on acceptance
  let requesterId: string | null = null;
  if (accept) {
    const { data } = await supabase
      .from('friendships')
      .select('requester_id')
      .eq('id', friendshipId)
      .single();
    requesterId = data?.requester_id ?? null;
  }

  const { error } = await supabase
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'rejected' })
    .eq('id', friendshipId);

  if (error) throw error;

  if (accept && requesterId) {
    const responderName = profileStore$.profile.get()?.username ?? 'Your friend';
    void supabase.rpc('create_notification', {
      p_user_id: requesterId,
      p_type: 'friend_accepted',
      p_title: '🤝 Friend request accepted',
      p_body: `${responderName} accepted your friend request!`,
      p_data: { route: '/(tabs)/social' },
    });
  }

  await fetchFriends();
}

export async function removeFriend(friendshipId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) throw error;
  await fetchFriends();
}
