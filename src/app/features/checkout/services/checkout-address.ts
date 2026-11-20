import { Injectable, inject } from '@angular/core';
import type { Database } from '../../../core/supabase/database.types';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import { fail, ok, type Result } from '../../../core/supabase/supabase.types';
import type { ShippingAddress } from '../models/checkout.model';

type AddressRow = Database['public']['Tables']['addresses']['Row'];

/** One line for the checkout card and the order snapshot: "line, ward, district, city". */
export function formatStreetAddress(a: Pick<AddressRow, 'line' | 'ward' | 'district' | 'city'>): string {
  return [a.line, a.ward, a.district, a.city].filter((p) => !!p && p.trim()).join(', ');
}

export function toShippingAddress(row: AddressRow): ShippingAddress {
  return {
    id: row.id,
    user_id: row.user_id,
    fullName: row.recipient,
    phone: row.phone,
    streetAddress: formatStreetAddress(row),
    detailAddress: row.line,
    ward: row.ward,
    district: row.district ?? undefined,
    city: row.city,
    isDefault: row.is_default,
    isVerified: true,
  };
}

/** Empty address for a customer with no saved address yet (name prefilled from the profile). */
export function blankAddress(fullName = ''): ShippingAddress {
  return { fullName, phone: '', streetAddress: '', isDefault: false, isVerified: false };
}

/**
 * Checkout's view of the customer's address book (table `addresses`, owned by PM).
 * Reads the default address of the signed-in customer and saves what the address modal edits,
 * so Checkout never shows a hard-coded recipient.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutAddressBook {
  private readonly db = inject(SUPABASE_CLIENT);
  private readonly auth = inject(SupabaseAuthService);

  /** Default address (else the newest), or a blank one with the profile name. Null when signed out. */
  async load(): Promise<ShippingAddress | null> {
    const userId = this.auth.user()?.id;
    if (!userId) return null;
    const { data: rows } = await this.db
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);
    if (rows?.length) return toShippingAddress(rows[0]);
    const { data: profile } = await this.db.from('profiles').select('display_name, phone').eq('id', userId).maybeSingle();
    return { ...blankAddress(profile?.display_name ?? ''), phone: profile?.phone ?? '' };
  }

  /** Inserts or updates the address; the first address of an account becomes its default. */
  async save(address: ShippingAddress): Promise<Result<ShippingAddress>> {
    const userId = this.auth.user()?.id;
    if (!userId) return fail({ message: 'Vui lòng đăng nhập để lưu địa chỉ.' });
    const values = {
      recipient: address.fullName,
      phone: address.phone,
      line: address.detailAddress ?? address.streetAddress,
      ward: address.ward ?? '',
      district: address.district ?? null,
      city: address.city ?? '',
    };
    if (address.id) {
      const { data, error } = await this.db
        .from('addresses')
        .update(values)
        .eq('id', address.id)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle();
      if (error) return fail(error);
      if (data) return ok(toShippingAddress(data));
    }
    const { count } = await this.db.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    const { data, error } = await this.db
      .from('addresses')
      .insert({ ...values, user_id: userId, is_default: !count })
      .select('*')
      .single();
    return error ? fail(error) : ok(toShippingAddress(data));
  }
}
