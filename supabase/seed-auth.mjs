// LOCAL DEVELOPMENT ONLY. Never point this script at a hosted or production project.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the local Supabase stack.');
}

const parsedUrl = new URL(supabaseUrl);
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
if (parsedUrl.protocol !== 'http:' || !localHosts.has(parsedUrl.hostname)) {
  throw new Error('Refusing to seed a non-local Supabase URL.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  {
    email: 'test.email@example.com',
    password: 'EmailDev123!',
    metadata: {},
    profile: null,
  },
  {
    email: 'test.google@example.com',
    password: 'MockGoogle123!',
    metadata: {
      avatar_url: 'https://example.com/mock-google-avatar.jpg',
      email: 'test.google@example.com',
      email_verified: true,
      family_name: 'User',
      full_name: 'Mock Google User',
      given_name: 'Mock',
      iss: 'https://accounts.google.com',
      name: 'Mock Google User',
      picture: 'https://example.com/mock-google-avatar.jpg',
      provider_id: 'mock-google-test-user',
      sub: 'mock-google-test-user',
    },
    profile: null,
  },
  {
    email: 'test.done@example.com',
    password: 'DoneDev123!',
    metadata: {},
    profile: {
      display_name: 'Returning Test User',
      avatar_url: null,
      device_type: null,
      preferences: [],
      onboarding_status: 'completed',
    },
  },
];

async function findUser(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const match = data.users.find((user) => user.email === email);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
}

for (const seedUser of users) {
  const existingUser = await findUser(seedUser.email);
  const result = existingUser
    ? await supabase.auth.admin.updateUserById(existingUser.id, {
        password: seedUser.password,
        email_confirm: true,
        user_metadata: seedUser.metadata,
      })
    : await supabase.auth.admin.createUser({
        email: seedUser.email,
        password: seedUser.password,
        email_confirm: true,
        user_metadata: seedUser.metadata,
      });

  if (result.error) throw result.error;
  const user = result.data.user;
  if (!user) throw new Error(`Supabase did not return the seeded user ${seedUser.email}.`);

  if (seedUser.profile) {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...seedUser.profile }, { onConflict: 'id' });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    if (error) throw error;
  }

  console.log(`Seeded ${seedUser.email}`);
}
