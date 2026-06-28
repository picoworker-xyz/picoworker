-- Task givers can specify the proof (screenshot) they want and attach example images.
alter table tasks add column if not exists proof_instructions text;
alter table tasks add column if not exists reference_images jsonb not null default '[]'::jsonb;

drop function if exists create_campaign(text, text, text, text, numeric, int, boolean, text);
create or replace function create_campaign(
  p_type text, p_title text, p_subtitle text, p_target text,
  p_reward numeric, p_goal int, p_auto boolean, p_category text,
  p_proof_instructions text default null, p_reference_images jsonb default '[]'::jsonb)
returns tasks language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); row tasks;
begin
  insert into tasks(owner_id, type, title, subtitle, target, reward, goal_count, auto_verify, status, category,
                    est_seconds, proof_instructions, reference_images)
  values (me, p_type, p_title, p_subtitle, nullif(p_target,''), p_reward, p_goal, p_auto, 'paused', p_category,
          case when p_type='survey' then 240 when p_type='app_install' then 120 else 30 end,
          nullif(p_proof_instructions,''), coalesce(p_reference_images, '[]'::jsonb))
  returning * into row;
  return row;
end; $$;
