/**
 * Tests for avatar color defaults and the saveAvatarConfig / loadAvatarConfig logic.
 */

jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })),
  },
}));

jest.mock('../../../lib/storage/mmkv', () => ({
  storage: {
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
  },
}));

import { avatarConfigStore$, saveAvatarConfig } from '../stores/avatar-config-store';

describe('avatarConfigStore$ default values', () => {
  it('default skin color is a valid hex', () => {
    expect(avatarConfigStore$.skinColor.peek()).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('default hair color is a valid hex', () => {
    expect(avatarConfigStore$.hairColor.peek()).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('default eye color is a valid hex', () => {
    expect(avatarConfigStore$.eyeColor.peek()).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('has expected default values matching PixelAvatar', () => {
    expect(avatarConfigStore$.skinColor.peek()).toBe('#f4c98a');
    expect(avatarConfigStore$.hairColor.peek()).toBe('#4a3728');
    expect(avatarConfigStore$.eyeColor.peek()).toBe('#1a1a2e');
  });
});

describe('saveAvatarConfig', () => {
  it('updates the store immediately', async () => {
    await saveAvatarConfig('#ffffff', '#000000', '#aabbcc', undefined);
    expect(avatarConfigStore$.skinColor.peek()).toBe('#ffffff');
    expect(avatarConfigStore$.hairColor.peek()).toBe('#000000');
    expect(avatarConfigStore$.eyeColor.peek()).toBe('#aabbcc');
  });
});
