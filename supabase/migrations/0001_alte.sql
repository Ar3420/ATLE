create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'source_file_type') then
    create type source_file_type as enum ('pdf', 'image', 'text');
  end if;
  if not exists (select 1 from pg_type where typname = 'source_file_label') then
    create type source_file_label as enum ('test', 'quiz', 'worksheet', 'notes', 'answer_key', 'rubric', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'question_type') then
    create type question_type as enum ('multiple_choice', 'long_response');
  end if;
  if not exists (select 1 from pg_type where typname = 'test_type') then
    create type test_type as enum ('daily', 'weekly', 'custom');
  end if;
  if not exists (select 1 from pg_type where typname = 'error_type') then
    create type error_type as enum ('concept', 'pattern', 'execution');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  color text not null,
  icon text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.source_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  file_path text not null,
  file_type source_file_type not null,
  label source_file_label not null,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'extracting', 'review_ready', 'failed')),
  uploaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pending_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  question_text text not null,
  type question_type not null,
  topic text,
  subtopic text,
  difficulty integer not null check (difficulty between 1 and 5),
  answer text not null,
  explanation text,
  rubric_json jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  choices_json jsonb not null default '[]'::jsonb,
  uncertain boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  source_file_id uuid references public.source_files (id) on delete set null,
  question_text text not null,
  type question_type not null,
  topic text not null,
  subtopic text not null,
  difficulty integer not null check (difficulty between 1 and 5),
  answer text not null,
  explanation text,
  rubric_json jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  times_used integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  text text not null,
  is_correct boolean not null default false
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  type test_type not null,
  scope_json jsonb not null default '{}'::jsonb,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.test_questions (
  test_id uuid not null references public.tests (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  order_index integer not null,
  primary key (test_id, question_id)
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  score integer not null,
  percentage double precision not null,
  mc_accuracy double precision not null default 0,
  lr_accuracy double precision not null default 0,
  time_taken integer not null default 0,
  notes text,
  taken_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attempt_question_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  is_correct boolean not null,
  error_type error_type,
  user_answer text
);

create table if not exists public.weakness_clusters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  cluster_name text not null,
  topic text not null,
  subtopic text not null,
  error_count integer not null default 0,
  last_updated timestamptz not null default timezone('utc', now())
);

create index if not exists idx_subjects_user_id on public.subjects(user_id);
create index if not exists idx_source_files_user_id on public.source_files(user_id);
create index if not exists idx_questions_user_id on public.questions(user_id);
create index if not exists idx_tests_user_id on public.tests(user_id);
create index if not exists idx_attempts_user_id on public.attempts(user_id);
create index if not exists idx_pending_questions_user_id on public.pending_questions(user_id);
create index if not exists idx_weakness_clusters_user_id on public.weakness_clusters(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.source_files enable row level security;
alter table public.pending_questions enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_question_results enable row level security;
alter table public.weakness_clusters enable row level security;

create policy "users_self_access" on public.users
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "subjects_user_access" on public.subjects
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "source_files_user_access" on public.source_files
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "pending_questions_user_access" on public.pending_questions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "questions_user_access" on public.questions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "choices_user_access" on public.choices
for all
using (exists (select 1 from public.questions q where q.id = choices.question_id and q.user_id = auth.uid()))
with check (exists (select 1 from public.questions q where q.id = choices.question_id and q.user_id = auth.uid()));

create policy "tests_user_access" on public.tests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "test_questions_user_access" on public.test_questions
for all
using (exists (select 1 from public.tests t where t.id = test_questions.test_id and t.user_id = auth.uid()))
with check (exists (select 1 from public.tests t where t.id = test_questions.test_id and t.user_id = auth.uid()));

create policy "attempts_user_access" on public.attempts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "attempt_question_results_user_access" on public.attempt_question_results
for all
using (exists (select 1 from public.attempts a where a.id = attempt_question_results.attempt_id and a.user_id = auth.uid()))
with check (exists (select 1 from public.attempts a where a.id = attempt_question_results.attempt_id and a.user_id = auth.uid()));

create policy "weakness_clusters_user_access" on public.weakness_clusters
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('source-materials', 'source-materials', false)
on conflict (id) do nothing;

create policy "source_materials_authenticated_read" on storage.objects
for select using (bucket_id = 'source-materials' and auth.role() = 'authenticated');

create policy "source_materials_authenticated_write" on storage.objects
for insert with check (bucket_id = 'source-materials' and auth.role() = 'authenticated');

create policy "source_materials_authenticated_update" on storage.objects
for update using (bucket_id = 'source-materials' and auth.role() = 'authenticated');

create policy "source_materials_authenticated_delete" on storage.objects
for delete using (bucket_id = 'source-materials' and auth.role() = 'authenticated');
