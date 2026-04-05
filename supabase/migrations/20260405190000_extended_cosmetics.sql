-- Migration: extended_cosmetics
-- Adds new hats, outfits, accessories, and backgrounds to the shop

insert into public.shop_items (name, description, category, price_gold, rarity, required_level, sprite_key) values
  -- New hats
  ('Pirate Tricorn', 'Arr! A fearsome pirate hat', 'avatar_hat', 75, 'uncommon', 3, 'hat_pirate'),
  ('Samurai Kabuto', 'Honor and discipline', 'avatar_hat', 200, 'rare', 6, 'hat_samurai'),
  ('Holy Halo', 'A glowing ring of light', 'avatar_hat', 600, 'epic', 8, 'hat_halo'),
  ('Viking Helm', 'For raiders and warriors', 'avatar_hat', 150, 'rare', 5, 'hat_viking'),
  -- New outfits
  ('Forest Ranger', 'One with nature', 'avatar_outfit', 75, 'uncommon', 3, 'outfit_forest'),
  ('Ice Armor', 'Frozen enchanted plates', 'avatar_outfit', 200, 'rare', 6, 'outfit_ice'),
  ('Crimson Battlegear', 'Forged in battle', 'avatar_outfit', 300, 'rare', 7, 'outfit_crimson'),
  ('Royal Vestments', 'Fit for a king', 'avatar_outfit', 750, 'epic', 10, 'outfit_royal'),
  -- New accessories (matching sprite_keys in pixel-avatar.tsx)
  ('Iron Shield', 'A solid shield', 'avatar_accessory', 40, 'common', 2, 'acc_shield'),
  ('Steel Sword', 'A trusty blade', 'avatar_accessory', 60, 'uncommon', 3, 'acc_sword'),
  ('Royal Cape', 'A flowing red cape', 'avatar_accessory', 120, 'rare', 5, 'acc_cape'),
  ('Celestial Wings', 'Wings of light', 'avatar_accessory', 800, 'epic', 9, 'acc_wings'),
  ('Adventurer Scarf', 'Keeps you warm on quests', 'avatar_accessory', 25, 'common', 0, 'acc_scarf'),
  ('Mystic Aura', 'A faint magical glow', 'avatar_accessory', 1200, 'legendary', 12, 'acc_aura'),
  -- New backgrounds
  ('Ocean Depths', 'Deep blue waters', 'avatar_background', 80, 'uncommon', 3, 'bg_ocean'),
  ('Sunset Peaks', 'Mountains at dusk', 'avatar_background', 100, 'uncommon', 4, 'bg_sunset'),
  ('Ice Cavern', 'A frozen wonderland', 'avatar_background', 150, 'rare', 6, 'bg_ice'),
  ('Neon City', 'Cyberpunk skyline', 'avatar_background', 400, 'epic', 8, 'bg_neon');
