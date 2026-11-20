import { Injectable, inject } from '@angular/core';
import { AuthSession } from '../supabase/supabase-auth.service';
import { STAFF_SUPABASE_CLIENT } from '../supabase/supabase.client';

/**
 * Staff (mock back-office) session, separate from the customer's SupabaseAuthService.
 * Restored on first use instead of at app start, so customer pages never create the staff client.
 */
@Injectable({ providedIn: 'root' })
export class StaffAuthService extends AuthSession {
  /** Resolves once the stored staff session has been restored. */
  readonly ready: Promise<void>;

  constructor() {
    super(inject(STAFF_SUPABASE_CLIENT));
    this.ready = this.init();
  }
}
