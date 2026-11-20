import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterLink {
  label: string;
  url: string;
}

interface SocialLink {
  name: string;
  url: string;
  iconUrl: string;
  ariaLabel: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-footer',
  styleUrl: './footer.scss',
  templateUrl: './footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Footer {
  readonly currentYear = new Date().getFullYear();
  // Menu điều hướng nhanh (Dùng placeholder '#' theo yêu cầu)
  readonly quickLinks: readonly FooterLink[] = [
    { label: 'Trang chủ', url: '/' },
    { label: 'Cửa hàng', url: '/shop' },
    { label: 'Studio Thiết Kế', url: '/design-studio' },
  ];

  // Menu hỗ trợ khách hàng (Dùng placeholder '#')
  readonly supportLinks: readonly FooterLink[] = [
    { label: 'FAQ', url: '#' },
    { label: 'Chính sách & Điều khoản', url: '/customer-support' },
    { label: 'Liên hệ', url: '#' },
  ];

  // Mạng xã hội dùng CDN logo trực tuyến (Simple Icons & Iconify)
  readonly socialLinks: readonly SocialLink[] = [
    {
      name: 'Facebook',
      url: 'https://facebook.com',
      iconUrl: 'https://cdn.simpleicons.org/facebook/0A0A0A',
      ariaLabel: 'Trang Facebook CaseEYEs',
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com',
      iconUrl: 'https://cdn.simpleicons.org/instagram/0A0A0A',
      ariaLabel: 'Trang Instagram CaseEYEs',
    },
    {
      name: 'TikTok',
      url: 'https://tiktok.com',
      iconUrl: 'https://cdn.simpleicons.org/tiktok/0A0A0A',
      ariaLabel: 'Kênh TikTok CaseEYEs',
    },
    {
      name: 'YouTube',
      url: 'https://cdn.simpleicons.org/youtube/0A0A0A',
      iconUrl: 'https://cdn.simpleicons.org/youtube/0A0A0A',
      ariaLabel: 'Kênh YouTube CaseEYEs',
    },
    {
      name: 'Pinterest',
      url: 'https://pinterest.com',
      iconUrl: 'https://cdn.simpleicons.org/pinterest/0A0A0A',
      ariaLabel: 'Trang Pinterest CaseEYEs',
    },
  ];
}
