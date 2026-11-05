import { Injectable } from '@angular/core';
import type { Database } from '../../../core/supabase/database.types';
import { SupabaseRepository } from '../../../core/supabase/supabase-repository';

export type Profile = Database['public']['Tables']['profiles']['Row'];

@Injectable({ providedIn: 'root' })
export class ProfileRepository extends SupabaseRepository<'profiles'> {
  protected override readonly table = 'profiles';
}
