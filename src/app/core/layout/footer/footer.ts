import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import {TestRepository} from '../../supabase/supabase-repository';

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
  private readonly test=inject(TestRepository)
  readonly currentYear = new Date().getFullYear();
  // Menu điều hướng nhanh (Dùng placeholder '#' theo yêu cầu)
  readonly quickLinks: readonly FooterLink[] = [
    { label: 'Trang chủ', url: '#' },
    { label: 'Cửa hàng', url: '#' },
    { label: 'Studio Thiết Kế', url: '#' },
    { label: 'How it Works', url: '#' },
  ];

  // Menu hỗ trợ khách hàng (Dùng placeholder '#')
  readonly supportLinks: readonly FooterLink[] = [
    { label: 'FAQ', url: '#' },
    { label: 'Chính sách & Điều khoản', url: '#' },
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

  async insertRandomTestData(){
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const insertPayload={
      title: "Test Case 1"
    };
    const result=await this.test.create(insertPayload);
    if (!result.error){
      console.log('✅ Successfully inserted random test data:', result.data);
    } else{
      console.error('❌ Failed to insert test data:', result.error.message);
    }
  }

  async fetchAllTestData(){
    const result= await this.test.list();
    if(!result.error){
      console.table(result.data);
    } else {
      console.error('❌ Failed to fetch test data:', result.error.message);
    }
  }
}
