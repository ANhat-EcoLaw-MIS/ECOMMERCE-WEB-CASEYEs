import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { TemplateCommentsRepository, commentAge } from './template-comments';

const ROW = {
  id: 'c1',
  template_id: 'tpl-cloud-kittens',
  author_name: 'Lan Anh',
  device_model: 'iPhone 15 Pro Max',
  comment: 'Màu rất xinh',
  created_at: '2026-11-20T08:00:00Z',
};

/** Minimal stand-in for the Supabase query builder used by the repository. */
function fakeClient(calls: { table?: string; insert?: unknown; eq?: unknown[] }) {
  const builder = {
    select: () => builder,
    eq: (...args: unknown[]) => ((calls.eq = args), builder),
    order: () => builder,
    limit: () => Promise.resolve({ data: [ROW], error: null }),
    insert: (values: unknown) => ((calls.insert = values), builder),
    single: () => Promise.resolve({ data: ROW, error: null }),
  };
  return { from: (table: string) => ((calls.table = table), builder) };
}

describe('TemplateCommentsRepository', () => {
  it('reads the comments of one template from template_comments', async () => {
    const calls: { table?: string; eq?: unknown[] } = {};
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: fakeClient(calls) }] });
    const result = await TestBed.inject(TemplateCommentsRepository).list('tpl-cloud-kittens');
    expect(calls.table).toBe('template_comments');
    expect(calls.eq).toEqual(['template_id', 'tpl-cloud-kittens']);
    expect(result.data?.[0]).toEqual(expect.objectContaining({ authorName: 'Lan Anh', comment: 'Màu rất xinh' }));
  });

  it('sends only the template, the text and the device (the database sets the author)', async () => {
    const calls: { insert?: unknown } = {};
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: fakeClient(calls) }] });
    await TestBed.inject(TemplateCommentsRepository).add('tpl-cloud-kittens', 'Màu rất xinh', 'iPhone 15 Pro Max');
    expect(calls.insert).toEqual({ template_id: 'tpl-cloud-kittens', comment: 'Màu rất xinh', device_model: 'iPhone 15 Pro Max' });
  });
});

describe('commentAge', () => {
  const now = Date.parse('2026-11-20T10:00:00Z');
  it('shows recent comments relative to now', () => {
    expect(commentAge('2026-11-20T09:59:40Z', now)).toBe('Vừa xong');
    expect(commentAge('2026-11-20T09:45:00Z', now)).toBe('15 phút trước');
    expect(commentAge('2026-11-20T07:00:00Z', now)).toBe('3 giờ trước');
  });
});
