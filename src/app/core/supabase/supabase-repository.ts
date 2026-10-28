import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase.client';
import type { Database } from './database.types';
import { Result, Row, TableName, ok, fail } from './supabase.types';

type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type Update<T extends TableName> = Database['public']['Tables'][T]['Update'];

/**
 * Generic CRUD base class. Subclasses only declare the table name:
 *
 *   @Injectable({ providedIn: 'root' })
 *   export class ProfilesRepository extends SupabaseRepository<'profiles'> {
 *     protected readonly table = 'profiles';
 *   }
 */
export abstract class SupabaseRepository<T extends TableName> {
  protected abstract readonly table: T;

  // Deliberately UNTYPED client inside this class.
  // supabase-js derives column names and result shapes from the table name with deep
  // conditional types. TypeScript cannot resolve those while T is still a generic
  // parameter, which causes both errors ("id" not assignable, ok(data) not assignable).
  // Type safety is restored at the public API below through Row<T>, Insert<T>, Update<T>.
  private readonly db = inject(SUPABASE_CLIENT) as unknown as SupabaseClient;

  async list(): Promise<Result<Row<T>[]>> {
    const { data, error } = await this.db.from(this.table).select('*');
    return error ? fail(error) : ok((data ?? []) as Row<T>[]);
  }

  async getById(id: string): Promise<Result<Row<T> | null>> {
    const { data, error } = await this.db
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return error ? fail(error) : ok(data as Row<T> | null);
  }

  async create(values: Insert<T>): Promise<Result<Row<T>>> {
    const { data, error } = await this.db
      .from(this.table)
      .insert(values as never)
      .select()
      .single();
    return error ? fail(error) : ok(data as Row<T>);
  }

  async update(id: string, values: Update<T>): Promise<Result<Row<T>>> {
    const { data, error } = await this.db
      .from(this.table)
      .update(values as never)
      .eq('id', id)
      .select()
      .single();
    return error ? fail(error) : ok(data as Row<T>);
  }

  async remove(id: string): Promise<Result<true>> {
    const { error } = await this.db.from(this.table).delete().eq('id', id);
    return error ? fail(error) : ok(true as const);
  }
}

@Injectable({ providedIn: 'root' })
export class TestRepository extends SupabaseRepository<'test'> {
  protected readonly table = 'test';
}
