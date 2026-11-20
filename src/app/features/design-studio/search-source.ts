import { Injectable, signal } from '@angular/core';
import { SearchSource } from '../../core/search/search.service';
import { paletteFromCss } from '../../shared/search/color';
import { SearchDoc } from '../../shared/search/search.types';
import { DEVICES } from '../../shared/devices/devices';

const DEVICE_IDS = DEVICES.map((m) => m.id);

/**
 * Design Studio → Tìm kiếm: design templates (opened in the template browser).
 * The catalog lives in the template-browser file, so it is loaded lazily (first search) to keep
 * the Design Studio component out of the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class DesignTemplateSearchSource implements SearchSource {
  readonly id = 'design-studio';
  private readonly list = signal<readonly SearchDoc[]>([]);
  private requested = false;

  docs(): readonly SearchDoc[] {
    if (!this.requested) {
      this.requested = true;
      void import('./components/template-browser/template-browser').then(({ TEMPLATE_CATALOG }) =>
        this.list.set(
          TEMPLATE_CATALOG.map(
            (t): SearchDoc => ({
              id: `template:${t.id}`,
              type: 'template',
              title: t.name,
              subtitle: `${t.styleLabel} · ${t.creator}`,
              text: `${t.hashtags.join(' ')} ${t.tagLabel} ${t.description} ${t.categories.join(' ')} ${t.category}`,
              style: t.styleLabel,
              image: t.elementImage ?? t.bgImage,
              background: t.gradient,
              link: '/design-studio/templates',
              queryParams: { template: t.id },
              badge: t.isTrending ? 'Đang hot' : undefined,
              boost: t.isTrending ? 2 : t.isBlankCanvas ? 1 : 0,
              // Background colors until ColorIndex reads the artwork itself.
              palette: paletteFromCss(t.gradient),
              // A template can be designed on any phone model the studio offers.
              devices: DEVICE_IDS,
            }),
          ),
        ),
      );
    }
    return this.list();
  }
}
