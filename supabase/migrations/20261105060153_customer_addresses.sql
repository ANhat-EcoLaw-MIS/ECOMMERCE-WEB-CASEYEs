-- Saved shipping addresses (used by profile page and checkout).

create table public.addresses (
                                id         uuid primary key default gen_random_uuid(),
                                user_id    uuid not null references public.profiles (id) on delete cascade,
                                recipient  text not null,
                                phone      text not null,
                                line       text not null,          -- street and house number
                                ward       text not null,
                                district   text,                   -- optional
                                city       text not null,
                                is_default boolean not null default false,
                                created_at timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id);
