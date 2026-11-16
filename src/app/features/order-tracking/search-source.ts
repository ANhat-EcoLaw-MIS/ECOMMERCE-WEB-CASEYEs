import { Injectable } from '@angular/core';
import { SearchSource } from '../../core/search/search.service';
import { SearchDoc } from '../../shared/search/search.types';
import { POLICY_SECTIONS } from './config/order-policy';

/** Quản lý đơn hàng → Tìm kiếm: help pages (order policy sections and customer support). */
@Injectable({ providedIn: 'root' })
export class HelpSearchSource implements SearchSource {
  readonly id = 'help';
  private readonly list: readonly SearchDoc[] = [
    ...POLICY_SECTIONS.map(
      (s): SearchDoc => ({
        id: `help:${s.id}`,
        type: 'help',
        title: s.title,
        subtitle: 'Chính sách đơn hàng',
        text: `${s.points.join(' ')} chính sách hỗ trợ`,
        link: '/order-tracking/chinh-sach',
        fragment: s.id,
      }),
    ),
    {
      id: 'help:cskh',
      type: 'help',
      title: 'Liên hệ chăm sóc khách hàng',
      subtitle: 'Hỗ trợ',
      text: 'cskh hỗ trợ liên hệ khiếu nại báo sự cố chat tư vấn hotline',
      link: '/customer-support',
    },
    {
      id: 'help:orders',
      type: 'help',
      title: 'Theo dõi đơn hàng của tôi',
      subtitle: 'Tài khoản',
      text: 'đơn hàng theo dõi tra cứu giao hàng vận chuyển trạng thái',
      link: '/account',
      queryParams: { tab: 'orders' },
    },
  ];

  docs(): readonly SearchDoc[] {
    return this.list;
  }
}
