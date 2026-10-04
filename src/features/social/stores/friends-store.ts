import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { profileStore$ } from '../../gamification/stores/profile-store';
import { persistPlugin } from '../../../lib/storage/persist';
import type { Database } from '../../../lib/supabase/types';
import { resetOnSignOut } from '../../../lib/storage/user-data';
import { checkAndUnlockAchievements } from '../../gamification/stores/achievements-store';

/** What any player may read about another one (the other columns are private). */
export const PUBLIC_PROFILE_COLUMNS =
  'id, username, xp, level, rank, created_at, gold, active_theme, skin_color, hair_color, eye_color, best_streak';
type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'id'
  | 'username'
  | 'xp'
  | 'level'
  | 'rank'
  | 'created_at'
  | 'gold'
  | 'active_theme'
  | 'skin_color'
  | 'hair_color'
  | 'eye_color'
  | 'best_streak'
>;

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile: Profile;
}

/** A friend's day (G4): quests done today, and today's kudos both ways. */
export interface FriendDay {
  done: number;
  sent: boolean;
  received: number;
}

interface FriendsState {
  friends: Friendship[];
  /** By friend id, refreshed with the friends list. */
  today: Record<string, FriendDay>;
  pendingReceived: Friendship[];
  pendingSent: Friendship[];
  searchResults: Profile[];
  isLoading: boolean;
}

const initialState = (): FriendsState => ({
  friends: [],
  today: {},
  pendingReceived: [],
  pendingSent: [],
  searchResults: [],
  isLoading: false,
});

export const friendsStore$ = observable<FriendsState>(initialState());

resetOnSignOut(friendsStore$, initialState);

syncObservable(friendsStore$, {
  persist: {
    name: 'habitquest_friends',
    plugin: persistPlugin,
  },
});

/** Loads my friends' day: quests done today and kudos (G4). */
export async function fetchFriendsToday(): Promise<void> {
  const { data, error } = await supabase.rpc('friends_today');
  if (error || !data) return;
  const today: Record<string, FriendDay> = {};
  for (const row of data) {
    today[row.friend_id] = { done: row.done_today, sent: row.kudos_sent, received: row.kudos_received };
  }
  friendsStore$.today.set(today);
}

/** Cheers a friend for today's quests (G4): once a day, after they did one. */
export async function giveKudos(friendId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('give_kudos', { p_friend_id: friendId });
  const ok = !error && (data as { success?: boolean } | null)?.success === true;
  if (ok || (data as { reason?: string } | null)?.reason === 'already_sent') {
    const day = friendsStore$.today[friendId].get() ?? { done: 1, sent: false, received: 0 };
    friendsStore$.today[friendId].set({ ...day, sent: true });
  }
  return ok;
}

export async function fetchFriends() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  friendsStore$.isLoading.set(true);
  try {
    // Fetch accepted friendships where I'm requester
    const { data: asRequester } = await supabase
      .from('friendships')
      .select(`*, profile:profiles!friendships_addressee_id_fkey(${PUBLIC_PROFILE_COLUMNS})`)
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    // Fetch accepted friendships where I'm addressee
    const { data: asAddressee } = await supabase
      .from('friendships')
      .select(`*, profile:profiles!friendships_requester_id_fkey(${PUBLIC_PROFILE_COLUMNS})`)
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
      .select(`*, profile:profiles!friendships_requester_id_fkey(${PUBLIC_PROFILE_COLUMNS})`)
      .eq('addressee_id', userId)
      .eq('status', 'pending');

    friendsStore$.pendingReceived.set(
      (received ?? []).map((f: any) => ({ ...f, profile: f.profile })),
    );

    // Fetch pending requests sent
    const { data: sent } = await supabase
      .from('friendships')
      .select(`*, profile:profiles!friendships_addressee_id_fkey(${PUBLIC_PROFILE_COLUMNS})`)
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
    .select(PUBLIC_PROFILE_COLUMNS)
    .ilike('username', `%${query}%`)
    .neq('id', userId ?? '')
    .limit(10);

  friendsStore$.searchResults.set(data ?? []);
}

export async function sendFriendRequest(addresseeId: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  // They already asked us: answer their request instead (the server would too).
  const incoming = friendsStore$.pendingReceived.get().find((f) => f.requester_id === addresseeId);
  if (incoming) return respondToRequest(incoming.id, true);

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
    // Friend achievements (Social Butterfly, Party Leader) show up right away.
    checkAndUnlockAchievements().catch(() => {});
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
