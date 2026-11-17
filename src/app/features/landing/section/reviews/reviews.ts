import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CasePreview } from '../../../../shared/ui/case-preview/case-preview';
import { findDevice, DEFAULT_DEVICE } from '../../../../shared/devices/devices';
import { artworkUrl, findDesign } from '../../../shop/catalog';
import { Reveal } from '../../shared/reveal';

interface Review {
  readonly name: string;
  readonly city: string;
  readonly rating: number;
  readonly quote: string;
  readonly designId: string;
  readonly deviceId: string;
  readonly date: string;
  readonly avatar: string;
}

/**
 * Placeholder testimonials (demo content) until reviews come from the orders module.
 * Each one points at a real shop design so the card can show the case.
 */
const REVIEWS: readonly Review[] = [
  {
    name: 'Minh Anh',
    city: 'TP. Hồ Chí Minh',
    rating: 5,
    quote: 'Màu in ngoài đời còn đẹp hơn ảnh! Viền ôm khít camera, cầm rất chắc tay. Mình đã đặt thêm một chiếc cho em gái.',
    designId: 'lavender-water-caustics',
    deviceId: 'iphone-15-pro-max',
    date: '2 tuần trước',
    avatar: 'linear-gradient(135deg, #a58cf4, #ec4899)',
  },
  {
    name: 'Quốc Huy',
    city: 'Hà Nội',
    rating: 5,
    quote: 'Tự thiết kế trong Studio cực dễ, xem trước 3D xoay 360° nên biết chính xác ốp sẽ trông thế nào. Giao hàng chỉ 3 ngày.',
    designId: 'galaxy-glow',
    deviceId: 'galaxy-s24',
    date: '1 tháng trước',
    avatar: 'linear-gradient(135deg, #38bdf8, #6a53b0)',
  },
  {
    name: 'Thu Trang',
    city: 'Đà Nẵng',
    rating: 4.5,
    quote: 'Mẫu Gingham xinh xỉu, chất liệu nhám không bám vân tay. Đóng gói cẩn thận, còn được tặng kèm sticker nữa!',
    designId: 'lavender-gingham',
    deviceId: 'iphone-16-pro',
    date: '3 ngày trước',
    avatar: 'linear-gradient(135deg, #fbbf24, #f97316)',
  },
];

@Component({
  selector: 'app-reviews',
  imports: [RouterLink, CasePreview, Reveal],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Reviews {
  protected readonly reviews = REVIEWS.map((r) => ({
    ...r,
    design: findDesign(r.designId),
    device: findDevice(r.deviceId) ?? DEFAULT_DEVICE,
    initials: r.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  }));
  protected readonly artworkUrl = artworkUrl;

  protected stars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (rating >= i + 1 ? 1 : rating > i ? 0.5 : 0));
  }
}
