import { Injectable, inject } from '@angular/core';
import type { Database } from '../../../core/supabase/database.types';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { fail, ok, type Result } from '../../../core/supabase/supabase.types';

/** One comment under a Design Studio template (table `template_comments`). */
export interface TemplateComment {
  readonly id: string;
  readonly templateId: string;
  readonly authorName: string;
  readonly deviceModel: string | null;
  readonly comment: string;
  readonly createdAt: string;
}

type CommentInsert = Database['public']['Tables']['template_comments']['Insert'];

type CommentRow = {
  id: string;
  template_id: string;
  author_name: string;
  device_model: string | null;
  comment: string;
  created_at: string;
};

/** Only these columns are readable through the API (user_id stays private). */
const COLUMNS = 'id, template_id, author_name, device_model, comment, created_at';

const toComment = (r: CommentRow): TemplateComment => ({
  id: r.id,
  templateId: r.template_id,
  authorName: r.author_name,
  deviceModel: r.device_model,
  comment: r.comment,
  createdAt: r.created_at,
});

/**
 * "Bình luận & Góp ý thẩm mỹ" of the template preview, stored in Supabase.
 * Anyone can read; posting needs a signed-in customer (the database sets the author).
 */
@Injectable({ providedIn: 'root' })
export class TemplateCommentsRepository {
  private readonly db = inject(SUPABASE_CLIENT);

  async list(templateId: string): Promise<Result<TemplateComment[]>> {
    const { data, error } = await this.db
      .from('template_comments')
      .select(COLUMNS)
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(100);
    return error ? fail(error) : ok(((data ?? []) as CommentRow[]).map(toComment));
  }

  async add(templateId: string, comment: string, deviceModel: string | null): Promise<Result<TemplateComment>> {
    // user_id and author_name are filled by the database (trigger + defaults) and cannot be sent by
    // the browser (no insert grant); types generated before 20261120090600 still list them as required.
    const values = { template_id: templateId, comment, device_model: deviceModel } as CommentInsert;
    const { data, error } = await this.db
      .from('template_comments')
      .insert(values)
      .select(COLUMNS)
      .single();
    return error ? fail(error) : ok(toComment(data as CommentRow));
  }
}

/** "Vừa xong", "5 phút trước", "3 giờ trước", else dd/MM/yyyy. */
export function commentAge(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} giờ trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
