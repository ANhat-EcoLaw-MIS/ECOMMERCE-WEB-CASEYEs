import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../../../app/core/supabase/supabase.client';
import { SUPABASE_CONFIG } from '../../../app/core/supabase/supabase.config';
import { SupabaseRepository } from '../../../app/core/supabase/supabase-repository';
import { FakeSupabaseClient } from '../helpers/supabase-fake';

class TestProfilesRepository extends SupabaseRepository<'profiles'> {
  protected readonly table = 'profiles';
}

describe('Supabase connection and repository unit tests', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  describe('SUPABASE_CLIENT connection', () => {
    it('should create the client and inject it when config is valid', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: SUPABASE_CONFIG, useValue: { url: 'https://example.supabase.co', key: 'anon-key' } }],
      });

      const client = TestBed.inject(SUPABASE_CLIENT);

      expect(client).toBeDefined();
    });

    it('should fail with a readable message when URL or key is missing', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: SUPABASE_CONFIG, useValue: { url: '', key: '' } }],
      });

      expect(() => TestBed.inject(SUPABASE_CLIENT)).toThrowError(/Supabase URL\/key missing in environment/i);
    });

    it('should reuse the same client instance across injections', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: SUPABASE_CONFIG, useValue: { url: 'https://example.supabase.co', key: 'anon-key' } }],
      });

      const first = TestBed.inject(SUPABASE_CLIENT);
      const second = TestBed.inject(SUPABASE_CLIENT);

      expect(second).toBe(first);
    });
  });

  describe('SupabaseRepository CRUD', () => {
    let fakeClient: FakeSupabaseClient;
    let repository: TestProfilesRepository;

    const profile = {
      id: 'user-123',
      display_name: 'Ada',
      avatar_url: 'https://img.example/ada.png',
      device_type: 'desktop',
      preferences: ['dark'],
      status: 'ACTIVE',
      created_at: '2026-10-28T00:00:00.000Z',
    };

    beforeEach(() => {
      fakeClient = new FakeSupabaseClient();
      TestBed.configureTestingModule({
        providers: [
          { provide: SUPABASE_CLIENT, useValue: fakeClient },
          TestProfilesRepository,
        ],
      });
      repository = TestBed.inject(TestProfilesRepository);
    });

    it('should return all rows when listing and an empty array when the table is empty', async () => {
      fakeClient.setTableResult('profiles', { data: [profile], error: null });
      const success = await repository.list();
      expect(success).toEqual({ data: [profile], error: null });
      expect(fakeClient.calls.some((call) => call.table === 'profiles' && call.method === 'select')).toBe(true);

      fakeClient.setTableResult('profiles', { data: [], error: null });
      const empty = await repository.list();
      expect(empty).toEqual({ data: [], error: null });
      expect(empty.data).toEqual([]);
      expect(empty.data).not.toBeNull();
    });

    it('should return the matching row when getById finds a record and null without error when absent', async () => {
      fakeClient.setTableResult('profiles', { data: profile, error: null });
      const found = await repository.getById(profile.id);
      expect(found).toEqual({ data: profile, error: null });
      expect(fakeClient.calls.some((call) => call.table === 'profiles' && call.method === 'eq' && call.args?.[0] === 'id')).toBe(true);

      fakeClient.setTableResult('profiles', { data: null, error: null });
      const missing = await repository.getById('missing-user');
      expect(missing).toEqual({ data: null, error: null });
    });

    it('should send the provided values to the profiles table and return the created row', async () => {
      const payload = {
        id: 'user-321',
        display_name: 'Grace',
        preferences: ['light'],
        status: 'ACTIVE',
      };

      fakeClient.setTableResult('profiles', { data: { ...profile, ...payload }, error: null });

      const result = await repository.create(payload);

      expect(result).toEqual({ data: { ...profile, ...payload }, error: null });
      expect(fakeClient.calls.some((call) => call.table === 'profiles' && call.method === 'insert' && call.payload === payload)).toBe(true);
    });

    it('should update only the changed fields, target the correct id, and return the updated row', async () => {
      const patch = { display_name: 'Ada Lovelace', preferences: ['dark', 'minimal'] };
      const updated = { ...profile, ...patch };
      fakeClient.setTableResult('profiles', { data: updated, error: null });

      const result = await repository.update(profile.id, patch);

      expect(result).toEqual({ data: updated, error: null });
      expect(fakeClient.calls.some((call) => call.table === 'profiles' && call.method === 'update' && call.payload === patch)).toBe(true);
      expect(fakeClient.calls.some((call) => call.table === 'profiles' && call.method === 'eq' && call.args?.[0] === 'id' && call.args?.[1] === profile.id)).toBe(true);
    });

    it('should target the right id and return a success result when removing a row', async () => {
      fakeClient.setTableResult('profiles', { data: null, error: null });

      const result = await repository.remove(profile.id);

      expect(result).toEqual({ data: true, error: null });
      expect(fakeClient.calls.some((call) => call.table === 'profiles' && call.method === 'delete')).toBe(true);
      expect(fakeClient.calls.some((call) => call.table === 'profiles' && call.method === 'eq' && call.args?.[0] === 'id' && call.args?.[1] === profile.id)).toBe(true);
    });

    it.each([
      ['list', () => repository.list(), { message: 'List failed', code: 'PGRST301' }],
      ['getById', () => repository.getById('user-123'), { message: 'Get failed', code: 'PGRST301' }],
      ['create', () => repository.create({ id: 'user-1', display_name: 'New', preferences: ['dark'], status: 'ACTIVE' }), { message: 'Create failed', code: '23505' }],
      ['update', () => repository.update('user-1', { display_name: 'Updated' }), { message: 'Update failed', code: '42501' }],
      ['remove', () => repository.remove('user-1'), { message: 'Delete failed', code: 'PGRST301' }],
    ])('should return a failure result with a readable message and code for %s when the backend fails and never throw', async (_name, operation, expectedError) => {
      fakeClient.setTableResult('profiles', { data: null, error: expectedError });

      const result = await operation();

      expect(result).toEqual({ data: null, error: expectedError });
      expect(result.error).toMatchObject({ message: expectedError.message, code: expectedError.code });
    });
  });

  describe('health checks', () => {
    it.skip('should cover a healthy backend response when a Supabase health probe exists in the module', () => {
      // The current production layer does not expose any health check API or `db.health` façade.
      // This contract is therefore untestable without changing production code.
    });
  });
});
