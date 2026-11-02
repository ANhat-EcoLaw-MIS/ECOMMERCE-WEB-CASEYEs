import { Injectable, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { fail, ok, Result } from '../../../core/supabase/supabase.types';
import { Order } from '../models/order-tracking.model';

/**
 * Feature Repository Layer for Order Tracking (Convention 6.1 & 6.4)
 * Manages order queries and audit logs according to Supabase architecture.
 */
@Injectable({ providedIn: 'root' })
export class OrderRepository {
  private readonly client = inject(SUPABASE_CLIENT) as unknown as SupabaseClient;
  protected readonly tableName = 'orders';

  /**
   * Fetch customer orders by customer_id or phone
   */
  async getOrdersByCustomerId(customerId: string): Promise<Result<Order[]>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('customer_id', customerId);

      if (error) return fail(error);
      return ok((data ?? []) as unknown as Order[]);
    } catch (e) {
      return fail({ message: e instanceof Error ? e.message : 'Database query error' });
    }
  }

  /**
   * Search order by tracking code (e.g. #CASEYE-8892)
   */
  async getOrderByCode(orderCode: string): Promise<Result<Order | null>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('order_code', orderCode)
        .maybeSingle();

      if (error) return fail(error);
      return ok(data as unknown as Order | null);
    } catch (e) {
      return fail({ message: e instanceof Error ? e.message : 'Database query error' });
    }
  }
}
