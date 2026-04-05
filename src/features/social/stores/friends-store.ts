import { observable } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
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
  await fetchFriends();
}

export async function respondToRequest(friendshipId: string, accept: boolean) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'rejected' })
    .eq('id', friendshipId);

  if (error) throw error;
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
