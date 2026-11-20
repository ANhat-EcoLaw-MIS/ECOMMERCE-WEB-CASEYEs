import { DestroyRef, Injectable, Injector, effect, inject, untracked, type WritableSignal } from '@angular/core';
import type { Database, Json } from '../../../core/supabase/database.types';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { SupabaseAuthService } from '../../../core/supabase/supabase-auth.service';
import type { SavedDesignItem } from './studio-state';

type DesignRow = Pick<Database['public']['Tables']['designs']['Row'], 'id' | 'name' | 'canvas_json' | 'updated_at'>;

/** Guest (signed-out) designs stay in this browser, as before. */
export const GUEST_SAVED_DESIGNS_KEY = 'caseyes_saved_designs_v3';
/** canvas_json version written by "Lưu thiết kế"; rows without `layers` (e.g. made at checkout) are not My Designs. */
const CANVAS_VERSION = 1;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isStored = (id: string) => UUID.test(id);

export function readGuestDesigns(): SavedDesignItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const parsed = JSON.parse(localStorage.getItem(GUEST_SAVED_DESIGNS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestDesigns(items: readonly SavedDesignItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(GUEST_SAVED_DESIGNS_KEY, JSON.stringify(items));
  } catch {
    // Storage full or disabled: the list still works for this page view.
  }
}

/** The editor state saved in designs.canvas_json. */
export function toCanvasJson(item: SavedDesignItem): Json {
  const { id: _id, name: _name, ...rest } = item;
  return { v: CANVAS_VERSION, ...rest } as unknown as Json;
}

export function fromRow(row: DesignRow): SavedDesignItem | null {
  const c = row.canvas_json as Record<string, unknown> | null;
  if (!c || typeof c !== 'object' || !Array.isArray(c['layers'])) return null;
  const { v: _v, ...rest } = c;
  return { ...(rest as unknown as Omit<SavedDesignItem, 'id' | 'name'>), id: row.id, name: row.name };
}

/**
 * "Thiết kế của tôi" backed by the `designs` table (Spec FR-DES-18, fixes B12).
 * Signed in: the list is loaded from Supabase for that account only and every change of the
 * StudioState.savedDesigns signal is written back (insert / update / delete). Signed out: the
 * guest list stays in localStorage. Writers keep using the signal as before.
 */
@Injectable({ providedIn: 'root' })
export class SavedDesignSync {
  private readonly db = inject(SUPABASE_CLIENT);
  private readonly auth = inject(SupabaseAuthService);
  private readonly injector = inject(Injector);

  /** Last state written to / read from the database, per design id (JSON). */
  private readonly synced = new Map<string, string>();
  private readonly inserting = new Set<string>();
  private owner: string | null | undefined = undefined;
  /** False while the list of the current owner is loading: nothing is written then (never a mass delete). */
  private ready = false;
  private modelIds: Map<string, string> | null = null;
  private list: WritableSignal<SavedDesignItem[]> | null = null;

  attach(list: WritableSignal<SavedDesignItem[]>): void {
    if (this.list) return;
    this.list = list;
    const watchUser = effect(
      () => {
        const id = this.auth.user()?.id ?? null;
        if (id !== this.owner) untracked(() => void this.load(id));
      },
      { injector: this.injector },
    );
    const watchList = effect(
      () => {
        const items = list();
        untracked(() => void this.push(items));
      },
      { injector: this.injector },
    );
    this.injector.get(DestroyRef).onDestroy(() => {
      watchUser.destroy();
      watchList.destroy();
    });
  }

  private async load(userId: string | null): Promise<void> {
    const list = this.list!;
    this.owner = userId;
    this.ready = false;
    this.synced.clear();
    if (!userId) {
      list.set(readGuestDesigns());
      this.ready = true;
      return;
    }
    list.set([]);
    const { data, error } = await this.db
      .from('designs')
      .select('id, name, canvas_json, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (this.owner !== userId) return; // signed out / switched meanwhile
    if (error) {
      console.error('Không tải được thiết kế đã lưu', error);
      return;
    }
    const items = (data ?? []).map(fromRow).filter((x): x is SavedDesignItem => x !== null);
    for (const item of items) this.synced.set(item.id, JSON.stringify(item));
    list.set(items);
    this.ready = true;
  }

  private async push(items: readonly SavedDesignItem[]): Promise<void> {
    const userId = this.owner;
    if (userId === undefined || !this.ready) return; // still loading this owner's list
    if (userId === null) {
      writeGuestDesigns(items);
      return;
    }
    const current = new Set(items.map((i) => i.id));
    for (const item of items) {
      const json = JSON.stringify(item);
      if (!isStored(item.id)) await this.insert(userId, item);
      else if (this.synced.get(item.id) !== json) await this.update(item, json);
    }
    for (const id of [...this.synced.keys()]) {
      if (!current.has(id)) await this.remove(id);
    }
  }

  private async insert(userId: string, item: SavedDesignItem): Promise<void> {
    if (this.inserting.has(item.id)) return;
    const phoneModelId = await this.phoneModelId(item.modelId);
    if (!phoneModelId) {
      console.error(`Dòng máy ${item.modelId} chưa có trong phone_models: thiết kế chưa được lưu lên tài khoản.`);
      return;
    }
    this.inserting.add(item.id);
    const { data, error } = await this.db
      .from('designs')
      .insert({ user_id: userId, phone_model_id: phoneModelId, name: item.name, canvas_json: toCanvasJson(item) })
      .select('id')
      .single();
    this.inserting.delete(item.id);
    if (error || !data || this.owner !== userId) {
      if (error) console.error('Không lưu được thiết kế', error);
      return;
    }
    // Swap the temporary id for the database id (the list is re-checked by the effect, nothing left to write).
    const saved = { ...item, id: data.id };
    this.synced.set(data.id, JSON.stringify(saved));
    this.list!.update((list) => list.map((i) => (i.id === item.id ? { ...i, id: data.id } : i)));
  }

  private async update(item: SavedDesignItem, json: string): Promise<void> {
    this.synced.set(item.id, json);
    const phoneModelId = await this.phoneModelId(item.modelId);
    const { error } = await this.db
      .from('designs')
      .update({
        name: item.name,
        canvas_json: toCanvasJson(item),
        updated_at: new Date().toISOString(),
        ...(phoneModelId ? { phone_model_id: phoneModelId } : {}),
      })
      .eq('id', item.id);
    if (error) console.error('Không cập nhật được thiết kế', error);
  }

  private async remove(id: string): Promise<void> {
    this.synced.delete(id);
    const { error } = await this.db.from('designs').delete().eq('id', id);
    // A design already used by an order cannot be deleted (order_items keeps the reference).
    if (error) console.error('Không xoá được thiết kế', error);
  }

  /** phone_models.id for a studio model slug (cached). */
  private async phoneModelId(slug: string): Promise<string | null> {
    if (!this.modelIds) {
      const { data } = await this.db.from('phone_models').select('id, slug');
      this.modelIds = new Map((data ?? []).map((m) => [m.slug, m.id]));
    }
    return this.modelIds.get(slug) ?? null;
  }
}
