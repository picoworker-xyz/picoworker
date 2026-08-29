-- The paged sync replaced replace_notik_offers(jsonb) with a two-argument
-- version. The single-argument original still deletes every row the caller did
-- not send, so leaving it in place is a loaded footgun for anything that
-- resolves the overload the old way.
drop function if exists replace_notik_offers(jsonb);
notify pgrst, 'reload schema';
