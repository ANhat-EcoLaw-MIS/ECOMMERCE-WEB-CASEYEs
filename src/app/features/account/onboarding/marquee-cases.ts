import type { TemplateCard } from '../../design-studio/components/template-browser/template-browser';

export interface MarqueeCase {
  readonly id: string;
  readonly name: string;
  readonly styleLabel: string;
  readonly gradient: string;
  readonly backgroundImage?: string;
  readonly elementImage?: string;
}

export interface MarqueeRow {
  readonly id: string;
  readonly direction: 'left' | 'right';
  readonly cases: readonly MarqueeCase[];
}

export function createMarqueeRows(templates: readonly TemplateCard[]): MarqueeRow[] {
  const cases = templates
    .filter((template) => !template.isBlankCanvas)
    .map((template) => ({
      id: template.id,
      name: template.name,
      styleLabel: template.styleLabel,
      gradient: template.gradient,
      backgroundImage: template.bgImage,
      elementImage: template.elementImage,
    }));

  return [
    { id: 'row-1', direction: 'left', cases: cases.filter((_, index) => index % 2 === 0) },
    { id: 'row-2', direction: 'right', cases: cases.filter((_, index) => index % 2 === 1) },
  ];
}
