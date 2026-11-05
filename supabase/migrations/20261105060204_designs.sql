-- Design module: a customer's own artwork on one phone model.

create table public.designs (
                              id             uuid primary key default gen_random_uuid(),
                              user_id        uuid not null references public.profiles (id) on delete cascade,
                              phone_model_id uuid not null references public.phone_models (id),
                              name           text not null default 'My design',
                              canvas_json    jsonb not null,     -- editor state (objects, positions, colors)
                              preview_url    text,               -- PNG of the finished design
                              created_at     timestamptz not null default now(),
                              updated_at     timestamptz not null default now()
);

create index designs_user_idx on public.designs (user_id);
