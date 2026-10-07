-- Traditional Chinese (2026-10-07): Taiwan is now the first audience of the Instagram account
-- (38 % of viewers) and the app speaks 繁體中文 since PR #196 (lang 'zh'). The language was
-- still refused by the database: the player's language could not be saved (notifications
-- stayed in English) and a support message sent from the app in Chinese failed. The site's
-- waitlist gets the new /zh/ page too. Server-written notifications stay in English for 'zh'
-- (localize_notification falls back to the original text) until they are translated.

alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check check (language in ('en', 'fr', 'ja', 'ko', 'zh'));
alter table public.support_messages drop constraint if exists support_messages_language_check;
alter table public.support_messages add constraint support_messages_language_check check (language in ('en', 'fr', 'ja', 'ko', 'zh'));
alter table public.waitlist drop constraint if exists waitlist_lang_check;
alter table public.waitlist add constraint waitlist_lang_check check (lang in ('en', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'));
