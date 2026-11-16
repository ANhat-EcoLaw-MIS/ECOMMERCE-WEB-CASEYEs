figma.showUI(__html__, { width: 340, height: 210, themeColors: true });

const C = {
  brand900: '#2A1D4D',
  brand800: '#433075',
  brand600: '#6A53B0',
  brand400: '#A58CF4',
  brand200: '#D4C8FA',
  brand100: '#ECE6FD',
  brand50: '#F6F3FE',
  ink: '#0A0A0A',
  text: '#1A1B23',
  soft: '#52525B',
  line: '#E8E6EF',
  surface: '#FAFAFA',
  white: '#FFFFFF',
  success: '#16A34A',
  successBg: '#F0FDF4',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  night: '#120A24'
} as const;

const FONT: FontName = { family: 'Inter', style: 'Regular' };
const FONT_MEDIUM: FontName = { family: 'Inter', style: 'Medium' };
const FONT_BOLD: FontName = { family: 'Inter', style: 'Bold' };

type ComponentMap = {
  primaryButton: ComponentNode;
  secondaryButton: ComponentNode;
  input: ComponentNode;
  chip: ComponentNode;
  status: ComponentNode;
  productCard: ComponentNode;
  header: ComponentNode;
  orderCard: ComponentNode;
};

function rgb(hex: string): RGB {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255
  };
}

function solid(hex: string, opacity = 1): SolidPaint {
  return { type: 'SOLID', color: rgb(hex), opacity };
}

function setFill(node: GeometryMixin, hex: string, opacity = 1) {
  node.fills = [solid(hex, opacity)];
}

function setStroke(node: GeometryMixin, hex: string, width = 1) {
  node.strokes = [solid(hex)];
  if ('strokeWeight' in node) node.strokeWeight = width;
}

function auto(
  name: string,
  direction: 'HORIZONTAL' | 'VERTICAL' = 'VERTICAL',
  gap = 0,
  padding = 0,
  fill?: string
): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  node.layoutMode = direction;
  node.primaryAxisSizingMode = 'AUTO';
  node.counterAxisSizingMode = 'AUTO';
  node.itemSpacing = gap;
  node.paddingTop = padding;
  node.paddingRight = padding;
  node.paddingBottom = padding;
  node.paddingLeft = padding;
  node.clipsContent = false;
  node.fills = fill ? [solid(fill)] : [];
  return node;
}

function fixedFrame(name: string, width: number, height: number, fill: string = C.white): FrameNode {
  const node = figma.createFrame();
  node.name = name;
  node.resize(width, height);
  setFill(node, fill);
  node.clipsContent = true;
  return node;
}

function text(
  value: string,
  size = 14,
  color: string = C.text,
  weight: 'regular' | 'medium' | 'bold' = 'regular',
  name?: string
): TextNode {
  const node = figma.createText();
  node.name = name || value.slice(0, 32);
  node.fontName = weight === 'bold' ? FONT_BOLD : weight === 'medium' ? FONT_MEDIUM : FONT;
  node.fontSize = size;
  node.characters = value;
  node.fills = [solid(color)];
  node.lineHeight = { unit: 'PERCENT', value: size >= 28 ? 112 : 145 };
  return node;
}

function label(value: string, color: string = C.brand600): TextNode {
  const node = text(value.toUpperCase(), 11, color, 'bold');
  node.letterSpacing = { unit: 'PERCENT', value: 18 };
  return node;
}

function pill(value: string, bg: string = C.brand50, fg: string = C.brand800): FrameNode {
  const node = auto(`Chip / ${value}`, 'HORIZONTAL', 6, 8, bg);
  node.cornerRadius = 999;
  const t = text(value, 12, fg, 'bold');
  node.appendChild(t);
  node.paddingTop = 7;
  node.paddingBottom = 7;
  node.paddingLeft = 12;
  node.paddingRight = 12;
  return node;
}

function buttonNode(value: string, primary = true, width = 170): FrameNode {
  const node = auto(`Button / ${primary ? 'Primary' : 'Secondary'}`, 'HORIZONTAL', 8, 12, primary ? C.brand800 : C.white);
  node.cornerRadius = 999;
  node.resize(width, 44);
  node.primaryAxisAlignItems = 'CENTER';
  node.counterAxisAlignItems = 'CENTER';
  if (!primary) setStroke(node, C.brand200);
  node.appendChild(text(value, 13, primary ? C.white : C.brand800, 'bold'));
  return node;
}

function iconCircle(symbol: string, bg: string = C.brand100, fg: string = C.brand800, size = 40): FrameNode {
  const node = fixedFrame(`Icon / ${symbol}`, size, size, bg);
  node.cornerRadius = size / 2;
  const t = text(symbol, Math.round(size * 0.38), fg, 'bold');
  node.appendChild(t);
  t.x = (size - t.width) / 2;
  t.y = (size - t.height) / 2;
  return node;
}

function card(name: string, width: number, padding = 20, gap = 12): FrameNode {
  const node = auto(name, 'VERTICAL', gap, padding, C.white);
  node.resize(width, 100);
  node.counterAxisSizingMode = 'FIXED';
  node.cornerRadius = 20;
  setStroke(node, C.line);
  node.effects = [{ type: 'DROP_SHADOW', color: { ...rgb(C.brand800), a: 0.08 }, offset: { x: 0, y: 8 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }];
  return node;
}

function phoneCase(width = 150, height = 290, accent: string = C.brand400): FrameNode {
  const wrap = fixedFrame('Phone case artwork', width, height, C.brand100);
  wrap.cornerRadius = 28;
  setStroke(wrap, C.brand600, 5);
  const glow = figma.createEllipse();
  glow.name = 'Gradient orb';
  glow.resize(width * 1.05, width * 1.05);
  glow.x = width * 0.15;
  glow.y = height * 0.35;
  glow.fills = [{
    type: 'GRADIENT_RADIAL',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0, color: { ...rgb(accent), a: 0.95 } },
      { position: 1, color: { ...rgb(accent), a: 0 } }
    ]
  }];
  wrap.appendChild(glow);
  const camera = fixedFrame('Camera island', 56, 56, C.brand900);
  camera.cornerRadius = 18;
  camera.x = 14;
  camera.y = 14;
  wrap.appendChild(camera);
  for (let i = 0; i < 3; i++) {
    const lens = figma.createEllipse();
    lens.name = 'Lens';
    lens.resize(16, 16);
    lens.x = i === 1 ? 32 : 8;
    lens.y = i === 2 ? 32 : 8;
    lens.fills = [solid(i === 1 ? C.brand400 : C.ink)];
    camera.appendChild(lens);
  }
  const signature = text("CasEYE's", 15, C.brand900, 'bold');
  signature.x = (width - signature.width) / 2;
  signature.y = height - 48;
  wrap.appendChild(signature);
  return wrap;
}

function titleBlock(eyebrow: string, title: string, body: string, width: number): FrameNode {
  const group = auto('Title block', 'VERTICAL', 10);
  group.resize(width, 100);
  group.counterAxisSizingMode = 'FIXED';
  group.appendChild(label(eyebrow));
  const h = text(title, 36, C.brand900, 'bold');
  h.textAutoResize = 'HEIGHT';
  h.resize(width, h.height);
  group.appendChild(h);
  const p = text(body, 14, C.soft);
  p.textAutoResize = 'HEIGHT';
  p.resize(width, p.height);
  group.appendChild(p);
  return group;
}

function sectionHeader(title: string, subtitle: string, width: number): FrameNode {
  const node = auto('Section heading', 'HORIZONTAL', 16);
  node.resize(width, 80);
  node.counterAxisSizingMode = 'FIXED';
  node.primaryAxisAlignItems = 'SPACE_BETWEEN';
  node.counterAxisAlignItems = 'MAX';
  const copy = auto('Copy', 'VERTICAL', 5);
  copy.appendChild(text(title, 25, C.brand900, 'bold'));
  copy.appendChild(text(subtitle, 13, C.soft));
  node.appendChild(copy);
  node.appendChild(pill('Xem tất cả'));
  return node;
}

function makeComponent(name: string, source: FrameNode): ComponentNode {
  const component = figma.createComponent();
  component.name = name;
  component.resize(source.width, source.height);
  component.fills = source.fills;
  component.strokes = source.strokes;
  component.cornerRadius = source.cornerRadius;
  component.layoutMode = source.layoutMode;
  component.primaryAxisSizingMode = source.primaryAxisSizingMode;
  component.counterAxisSizingMode = source.counterAxisSizingMode;
  component.primaryAxisAlignItems = source.primaryAxisAlignItems;
  component.counterAxisAlignItems = source.counterAxisAlignItems;
  component.itemSpacing = source.itemSpacing;
  component.paddingTop = source.paddingTop;
  component.paddingRight = source.paddingRight;
  component.paddingBottom = source.paddingBottom;
  component.paddingLeft = source.paddingLeft;
  component.effects = source.effects;
  for (const child of [...source.children]) component.appendChild(child);
  source.remove();
  return component;
}

function swatch(name: string, value: string): FrameNode {
  const node = auto(`Color / ${name}`, 'VERTICAL', 10);
  const sample = fixedFrame(name, 150, 92, value);
  sample.cornerRadius = 16;
  node.appendChild(sample);
  node.appendChild(text(name, 13, C.text, 'bold'));
  node.appendChild(text(value, 11, C.soft));
  return node;
}

function pageSection(title: string, note: string, x: number, y: number, width: number): FrameNode {
  const section = auto(title, 'VERTICAL', 24, 40, C.surface);
  section.resize(width, 200);
  section.counterAxisSizingMode = 'FIXED';
  section.x = x;
  section.y = y;
  section.cornerRadius = 28;
  section.appendChild(label("CASEYE'S DESIGN SYSTEM"));
  section.appendChild(text(title, 36, C.brand900, 'bold'));
  const n = text(note, 14, C.soft);
  n.textAutoResize = 'HEIGHT';
  n.resize(width - 80, n.height);
  section.appendChild(n);
  return section;
}

function buildFoundations(page: PageNode) {
  const colors = pageSection('01 / Color foundations', 'Production palette extracted from src/styles/tokens.css. Brand, surface, semantic, and onboarding-night colors remain editable.', 80, 80, 1360);
  const colorGrid = auto('Color grid', 'HORIZONTAL', 16);
  [
    ['Brand 900', C.brand900], ['Brand 800', C.brand800], ['Brand 600', C.brand600],
    ['Brand 400', C.brand400], ['Brand 100', C.brand100], ['Surface', C.surface],
    ['Ink', C.ink], ['Success', C.success], ['Warning', C.warning], ['Error', C.error]
  ].forEach(([name, value]) => colorGrid.appendChild(swatch(name, value)));
  colors.appendChild(colorGrid);
  page.appendChild(colors);

  const type = pageSection('02 / Typography', 'Inter is used for editable compatibility. The web product pairs Inter with Plus Jakarta Sans for display moments.', 80, 640, 1360);
  [
    ['Display / 56 / Bold', 56, 'Ốp lưng có gu của bạn.'],
    ['Heading / 36 / Bold', 36, 'Thiết kế câu chuyện riêng.'],
    ['Title / 24 / Bold', 24, 'The Case Edit'],
    ['Body / 16 / Regular', 16, 'Khám phá những thiết kế chỉ có tại CasEYE’s.'],
    ['Caption / 12 / Medium', 12, 'CASEYE’S ORIGINAL · BLOOM CLUB']
  ].forEach(([name, size, sample]) => {
    const row = auto(String(name), 'VERTICAL', 6);
    row.appendChild(text(String(name), 11, C.brand600, 'bold'));
    row.appendChild(text(String(sample), Number(size), C.brand900, Number(size) >= 24 ? 'bold' : 'regular'));
    type.appendChild(row);
  });
  page.appendChild(type);

  const rules = pageSection('03 / Spacing, radius & elevation', 'A compact 4/8-based spacing system, rounded cards, full pills, and purple-tinted shadows define the interface rhythm.', 80, 1180, 1360);
  const metrics = auto('Metric cards', 'HORIZONTAL', 16);
  [['Spacing', '4 · 8 · 16 · 24 · 32 · 48'], ['Radius', '12 · 20 · 28 · 999'], ['Elevation', 'Soft · Lift · Glow'], ['Grid', 'Desktop 1280 · Mobile 375']].forEach(([a, b]) => {
    const item = card(a, 300);
    item.appendChild(text(a, 17, C.brand900, 'bold'));
    item.appendChild(text(b, 13, C.soft));
    metrics.appendChild(item);
  });
  rules.appendChild(metrics);
  page.appendChild(rules);
}

function buildComponents(page: PageNode): ComponentMap {
  const intro = pageSection('Editable component system', 'Reusable components mirror the Angular shared UI and key commerce patterns. Screen compositions use component instances where practical.', 80, 80, 1460);
  page.appendChild(intro);

  const buttons = auto('Buttons', 'HORIZONTAL', 20);
  const primaryButton = makeComponent('Button / Variant=Primary, Size=Medium', buttonNode('Thiết kế ngay', true));
  const secondaryButton = makeComponent('Button / Variant=Secondary, Size=Medium', buttonNode('Khám phá', false));
  buttons.appendChild(primaryButton);
  buttons.appendChild(secondaryButton);
  intro.appendChild(buttons);

  const fields = auto('Form controls', 'HORIZONTAL', 20);
  const inputSource = auto('Input source', 'VERTICAL', 7);
  inputSource.appendChild(text('Email', 12, C.text, 'bold'));
  const field = auto('Field', 'HORIZONTAL', 8, 14, C.white);
  field.resize(320, 48);
  field.counterAxisSizingMode = 'FIXED';
  field.cornerRadius = 14;
  setStroke(field, C.line);
  field.appendChild(text('name@example.com', 13, C.soft));
  inputSource.appendChild(field);
  const input = makeComponent('Input / State=Default', inputSource);
  const chip = makeComponent('Chip / State=Selected', pill('Bloom Club', C.brand800, C.white));
  fields.appendChild(input);
  fields.appendChild(chip);
  intro.appendChild(fields);

  const statusSource = auto('Status source', 'HORIZONTAL', 8, 10, C.successBg);
  statusSource.cornerRadius = 999;
  statusSource.appendChild(iconCircle('✓', C.success, C.white, 20));
  statusSource.appendChild(text('Đã giao', 12, C.success, 'bold'));
  const status = makeComponent('Status badge / Status=Delivered', statusSource);
  intro.appendChild(status);

  const productSource = card('Product source', 260, 0, 0);
  productSource.clipsContent = true;
  const art = fixedFrame('Product image', 260, 280, C.brand50);
  const phone = phoneCase(110, 210, C.brand400);
  phone.x = 75;
  phone.y = 35;
  art.appendChild(phone);
  productSource.appendChild(art);
  const productMeta = auto('Product info', 'VERTICAL', 7, 18, C.white);
  productMeta.resize(260, 150);
  productMeta.counterAxisSizingMode = 'FIXED';
  productMeta.appendChild(label('BLOOM CLUB'));
  productMeta.appendChild(text('Lilac Dream', 17, C.brand900, 'bold'));
  productMeta.appendChild(text('Ốp nhám chống sốc', 12, C.soft));
  productMeta.appendChild(text('329.000đ', 14, C.brand800, 'bold'));
  productSource.appendChild(productMeta);
  const productCard = makeComponent('Product card / State=Default', productSource);

  const headerSource = auto('Header source', 'HORIZONTAL', 28, 16, C.brand900);
  headerSource.resize(1280, 72);
  headerSource.counterAxisSizingMode = 'FIXED';
  headerSource.counterAxisAlignItems = 'CENTER';
  headerSource.appendChild(text("CasEYE's", 22, C.white, 'bold'));
  ['Trang chủ', 'Thiết kế', 'Cửa hàng', 'Hỗ trợ'].forEach((item) => headerSource.appendChild(text(item, 13, C.white, 'medium')));
  const spacer = fixedFrame('Flexible spacer', 390, 1, C.brand900);
  headerSource.appendChild(spacer);
  headerSource.appendChild(pill('Tìm kiếm', C.brand800, C.brand100));
  headerSource.appendChild(iconCircle('B', C.brand800, C.white, 40));
  headerSource.appendChild(iconCircle('A', C.brand800, C.white, 40));
  const header = makeComponent('Navigation / Viewport=Desktop', headerSource);

  const orderSource = card('Order source', 720);
  const orderTop = auto('Order header', 'HORIZONTAL', 16);
  orderTop.resize(680, 40);
  orderTop.counterAxisSizingMode = 'FIXED';
  orderTop.primaryAxisAlignItems = 'SPACE_BETWEEN';
  orderTop.appendChild(text('#CASEYE-2026-018', 14, C.brand900, 'bold'));
  orderTop.appendChild(status.createInstance());
  orderSource.appendChild(orderTop);
  const orderBody = auto('Order body', 'HORIZONTAL', 16);
  orderBody.appendChild(phoneCase(70, 130, C.brand400));
  const orderCopy = auto('Details', 'VERTICAL', 8);
  orderCopy.appendChild(text('Purple Orbit · iPhone 16 Pro', 16, C.text, 'bold'));
  orderCopy.appendChild(text('Ốp bóng · Số lượng 1', 12, C.soft));
  orderCopy.appendChild(text('329.000đ', 14, C.brand800, 'bold'));
  orderBody.appendChild(orderCopy);
  orderSource.appendChild(orderBody);
  const orderCard = makeComponent('Order card / Status=Delivered', orderSource);

  const showcase = pageSection('Commerce & navigation', 'High-value patterns used across product discovery, cart, account, and order tracking.', 80, 720, 1460);
  const row = auto('Showcase row', 'HORIZONTAL', 28);
  row.appendChild(productCard);
  row.appendChild(orderCard);
  showcase.appendChild(row);
  showcase.appendChild(header);
  page.appendChild(showcase);

  return { primaryButton, secondaryButton, input, chip, status, productCard, header, orderCard };
}

function screenFrame(name: string, width: number, height: number, x: number, y: number): FrameNode {
  const screen = fixedFrame(name, width, height, C.surface);
  screen.x = x;
  screen.y = y;
  screen.cornerRadius = 20;
  setStroke(screen, C.line);
  screen.effects = [{ type: 'DROP_SHADOW', color: { ...rgb(C.brand900), a: 0.12 }, offset: { x: 0, y: 12 }, radius: 34, spread: 0, visible: true, blendMode: 'NORMAL' }];
  return screen;
}

function screenLabel(name: string, x: number, y: number): FrameNode {
  const tag = auto('Screen label', 'VERTICAL', 3);
  tag.x = x;
  tag.y = y;
  tag.appendChild(label(name.split('/')[0].trim()));
  tag.appendChild(text(name.split('/').slice(1).join('/').trim(), 18, C.brand900, 'bold'));
  return tag;
}

function addDesktopHeader(screen: FrameNode, components: ComponentMap) {
  const header = components.header.createInstance();
  header.resize(screen.width, 72);
  header.x = 0;
  header.y = 0;
  screen.appendChild(header);
}

function heroComposition(screen: FrameNode, components: ComponentMap, mobile = false) {
  const width = screen.width;
  const hero = fixedFrame('Hero', width - (mobile ? 32 : 64), mobile ? 650 : 520, C.brand900);
  hero.x = mobile ? 16 : 32;
  hero.y = mobile ? 88 : 104;
  hero.cornerRadius = mobile ? 24 : 30;
  const copy = auto('Hero copy', 'VERTICAL', 18);
  copy.x = mobile ? 24 : 60;
  copy.y = mobile ? 36 : 70;
  copy.resize(mobile ? width - 80 : 540, 260);
  copy.counterAxisSizingMode = 'FIXED';
  copy.appendChild(label("CASEYE'S ORIGINAL", C.brand400));
  const heading = text('ỐP LƯNG\nCÓ GU CỦA BẠN.', mobile ? 42 : 58, C.white, 'bold');
  copy.appendChild(heading);
  copy.appendChild(text('Tự thiết kế hoặc chọn một phiên bản độc quyền.', 15, C.brand200));
  const actions = auto('Hero actions', 'HORIZONTAL', 12);
  actions.appendChild(components.primaryButton.createInstance());
  actions.appendChild(components.secondaryButton.createInstance());
  if (mobile) {
    actions.layoutMode = 'VERTICAL';
  }
  copy.appendChild(actions);
  hero.appendChild(copy);
  const phone = phoneCase(mobile ? 150 : 190, mobile ? 290 : 370, C.brand400);
  phone.x = mobile ? (width - 150) / 2 - 16 : width - 380;
  phone.y = mobile ? 340 : 70;
  hero.appendChild(phone);
  screen.appendChild(hero);
}

function shopComposition(screen: FrameNode, components: ComponentMap, mobile = false) {
  const start = mobile ? 86 : 104;
  const heading = titleBlock('THE CASE EDIT', 'Tìm chiếc ốp hợp gu bạn.', 'Khám phá những thiết kế chỉ có tại CasEYE’s.', screen.width - (mobile ? 32 : 80));
  heading.x = mobile ? 16 : 40;
  heading.y = start;
  screen.appendChild(heading);
  const chips = auto('Category tabs', 'HORIZONTAL', 8);
  ['Tất cả', 'Pastel', 'Cá tính', 'Bloom Club'].forEach((name, index) => chips.appendChild(pill(name, index === 0 ? C.brand800 : C.brand50, index === 0 ? C.white : C.brand800)));
  chips.x = mobile ? 16 : 40;
  chips.y = start + 150;
  screen.appendChild(chips);
  const grid = auto('Product grid', mobile ? 'VERTICAL' : 'HORIZONTAL', 16);
  const count = mobile ? 2 : 4;
  for (let i = 0; i < count; i++) grid.appendChild(components.productCard.createInstance());
  grid.x = mobile ? 58 : 40;
  grid.y = start + 220;
  screen.appendChild(grid);
}

function formComposition(screen: FrameNode, components: ComponentMap, title: string, mobile = false) {
  const form = card('Form panel', mobile ? screen.width - 32 : 540, mobile ? 20 : 32, 18);
  form.x = mobile ? 16 : (screen.width - 540) / 2;
  form.y = mobile ? 92 : 130;
  form.appendChild(label("CASEYE'S ACCOUNT"));
  form.appendChild(text(title, mobile ? 27 : 32, C.brand900, 'bold'));
  form.appendChild(text('Tiếp tục để lưu thiết kế và theo dõi đơn hàng của bạn.', 13, C.soft));
  form.appendChild(components.input.createInstance());
  const password = components.input.createInstance();
  password.name = 'Input / Password';
  form.appendChild(password);
  form.appendChild(components.primaryButton.createInstance());
  form.appendChild(text('hoặc', 12, C.soft));
  form.appendChild(components.secondaryButton.createInstance());
  screen.appendChild(form);
}

function studioComposition(screen: FrameNode, components: ComponentMap, mobile = false) {
  const top = fixedFrame('Studio toolbar', screen.width, mobile ? 64 : 72, C.brand900);
  top.appendChild(text('Design Studio', 17, C.white, 'bold'));
  top.children[0].x = 20;
  top.children[0].y = 22;
  screen.appendChild(top);
  const sidebar = fixedFrame('Tools', mobile ? screen.width : 220, mobile ? 74 : screen.height - 72, C.white);
  sidebar.x = 0;
  sidebar.y = mobile ? screen.height - 74 : 72;
  setStroke(sidebar, C.line);
  const tools = mobile ? ['Mẫu', 'Ảnh', 'Text', 'Màu'] : ['Mẫu thiết kế', 'Tải ảnh', 'Văn bản', 'Sticker', 'Màu nền'];
  tools.forEach((item, i) => {
    const t = pill(item, i === 0 ? C.brand100 : C.white, C.brand800);
    t.x = mobile ? 12 + i * 88 : 18;
    t.y = mobile ? 18 : 24 + i * 54;
    sidebar.appendChild(t);
  });
  screen.appendChild(sidebar);
  const canvas = fixedFrame('Canvas area', mobile ? screen.width - 24 : screen.width - 500, mobile ? screen.height - 190 : screen.height - 150, C.brand50);
  canvas.x = mobile ? 12 : 250;
  canvas.y = mobile ? 82 : 104;
  canvas.cornerRadius = 22;
  const phone = phoneCase(mobile ? 150 : 210, mobile ? 290 : 400, C.brand400);
  phone.x = (canvas.width - phone.width) / 2;
  phone.y = (canvas.height - phone.height) / 2;
  canvas.appendChild(phone);
  screen.appendChild(canvas);
  if (!mobile) {
    const properties = card('Properties', 220);
    properties.x = screen.width - 240;
    properties.y = 104;
    properties.appendChild(text('Thuộc tính', 17, C.brand900, 'bold'));
    properties.appendChild(components.input.createInstance());
    properties.appendChild(pill('Căn giữa', C.brand50, C.brand800));
    properties.appendChild(pill('Độ trong suốt 100%', C.brand50, C.brand800));
    screen.appendChild(properties);
  }
}

function cartComposition(screen: FrameNode, components: ComponentMap, mobile = false) {
  const heading = titleBlock('SHOPPING BAG', 'Giỏ hàng của bạn', 'Kiểm tra mẫu, dòng máy và số lượng trước khi thanh toán.', screen.width - 64);
  heading.x = mobile ? 16 : 40;
  heading.y = mobile ? 90 : 110;
  screen.appendChild(heading);
  const list = card('Cart items', mobile ? screen.width - 32 : 760);
  list.x = mobile ? 16 : 40;
  list.y = mobile ? 260 : 280;
  for (let i = 0; i < (mobile ? 2 : 3); i++) {
    const row = auto(`Cart item ${i + 1}`, 'HORIZONTAL', 16);
    row.appendChild(phoneCase(64, 118, i === 1 ? C.brand600 : C.brand400));
    const copy = auto('Details', 'VERTICAL', 7);
    copy.appendChild(text(i === 1 ? 'Midnight Eyes' : 'Lilac Dream', 15, C.text, 'bold'));
    copy.appendChild(text('iPhone 16 Pro · Ốp nhám', 11, C.soft));
    copy.appendChild(text('329.000đ', 13, C.brand800, 'bold'));
    row.appendChild(copy);
    list.appendChild(row);
  }
  screen.appendChild(list);
  const summary = card('Order summary', mobile ? screen.width - 32 : 340);
  summary.x = mobile ? 16 : 840;
  summary.y = mobile ? 650 : 280;
  summary.appendChild(text('Tóm tắt đơn hàng', 19, C.brand900, 'bold'));
  ['Tạm tính       658.000đ', 'Vận chuyển      Miễn phí', 'Tổng cộng       658.000đ'].forEach((line, i) => summary.appendChild(text(line, i === 2 ? 15 : 13, i === 2 ? C.brand800 : C.soft, i === 2 ? 'bold' : 'regular')));
  summary.appendChild(components.primaryButton.createInstance());
  screen.appendChild(summary);
}

function ordersComposition(screen: FrameNode, components: ComponentMap, mobile = false) {
  const heading = titleBlock('MY ORDERS', 'Đơn hàng của tôi', 'Theo dõi tiến độ in và giao của từng đơn tại đây.', screen.width - 64);
  heading.x = mobile ? 16 : 40;
  heading.y = mobile ? 88 : 105;
  screen.appendChild(heading);
  const tabs = auto('Status tabs', 'HORIZONTAL', 8);
  ['Tất cả', 'Đang in', 'Đang giao', 'Đã giao'].forEach((name, i) => tabs.appendChild(pill(name, i === 0 ? C.brand800 : C.brand50, i === 0 ? C.white : C.brand800)));
  tabs.x = mobile ? 16 : 40;
  tabs.y = mobile ? 240 : 250;
  screen.appendChild(tabs);
  const list = auto('Order list', 'VERTICAL', 18);
  for (let i = 0; i < 3; i++) {
    const instance = components.orderCard.createInstance();
    if (mobile) instance.resize(screen.width - 32, instance.height);
    list.appendChild(instance);
  }
  list.x = mobile ? 16 : 40;
  list.y = mobile ? 310 : 320;
  screen.appendChild(list);
}

function supportComposition(screen: FrameNode, components: ComponentMap, mobile = false) {
  const hero = fixedFrame('Support hero', screen.width - (mobile ? 32 : 80), mobile ? 430 : 330, C.brand50);
  hero.x = mobile ? 16 : 40;
  hero.y = mobile ? 88 : 104;
  hero.cornerRadius = 30;
  const copy = titleBlock('CUSTOMER SUPPORT', "CasEYE's luôn ở đây khi bạn cần.", 'Tư vấn chọn ốp, hỏi về đơn hàng hoặc gửi yêu cầu hỗ trợ sản phẩm.', mobile ? screen.width - 80 : 640);
  copy.x = 28;
  copy.y = 38;
  hero.appendChild(copy);
  const action = components.primaryButton.createInstance();
  action.x = 28;
  action.y = mobile ? 260 : 235;
  hero.appendChild(action);
  const headset = iconCircle('?', C.brand800, C.white, mobile ? 82 : 130);
  headset.x = mobile ? hero.width - 110 : hero.width - 220;
  headset.y = mobile ? 315 : 90;
  hero.appendChild(headset);
  screen.appendChild(hero);
  const journey = auto('Support journey', mobile ? 'VERTICAL' : 'HORIZONTAL', 14);
  ['Chọn cách liên hệ', 'Mô tả vấn đề', 'Nhận giải pháp', 'Theo dõi kết quả'].forEach((item, i) => {
    const step = card(`Step ${i + 1}`, mobile ? screen.width - 32 : 260);
    step.appendChild(iconCircle(String(i + 1), C.brand800, C.white, 32));
    step.appendChild(text(item, 14, C.brand900, 'bold'));
    journey.appendChild(step);
  });
  journey.x = mobile ? 16 : 40;
  journey.y = mobile ? 550 : 470;
  screen.appendChild(journey);
}

function genericComposition(screen: FrameNode, components: ComponentMap, title: string, kind: string, mobile = false) {
  const heading = titleBlock(kind, title, 'Production-ready composition derived from the current Angular application.', screen.width - 64);
  heading.x = mobile ? 16 : 40;
  heading.y = mobile ? 92 : 110;
  screen.appendChild(heading);
  const content = card('Primary content', screen.width - (mobile ? 32 : 80));
  content.x = mobile ? 16 : 40;
  content.y = mobile ? 260 : 280;
  content.appendChild(sectionHeader('Thông tin chính', 'Nội dung và thao tác được nhóm theo ngữ cảnh.', content.width - 40));
  const row = auto('Content row', mobile ? 'VERTICAL' : 'HORIZONTAL', 20);
  for (let i = 0; i < (mobile ? 2 : 3); i++) {
    const item = card(`Content card ${i + 1}`, mobile ? content.width - 40 : 330);
    item.appendChild(iconCircle(String(i + 1)));
    item.appendChild(text(['Tổng quan', 'Chi tiết', 'Hành động'][i], 17, C.brand900, 'bold'));
    item.appendChild(text('Nội dung có thể chỉnh sửa và thay thế trực tiếp trong Figma.', 12, C.soft));
    item.appendChild(i === 0 ? components.primaryButton.createInstance() : components.secondaryButton.createInstance());
    row.appendChild(item);
  }
  content.appendChild(row);
  screen.appendChild(content);
}

const desktopDefinitions = [
  ['01 / Home', 'home'], ['02 / Shop catalog', 'shop'], ['03 / Product detail', 'product'],
  ['04 / Design model picker', 'model'], ['05 / Template browser', 'templates'], ['06 / Studio editor', 'studio'],
  ['07 / Cart', 'cart'], ['08 / Checkout', 'checkout'], ['09 / Auth login', 'login'],
  ['10 / Auth register', 'register'], ['11 / Account', 'account'], ['12 / Orders', 'orders'],
  ['13 / Order detail', 'order-detail'], ['14 / Customer support', 'support'], ['15 / Search results', 'search'],
  ['16 / Not found', 'not-found']
] as const;

function composeScreen(screen: FrameNode, components: ComponentMap, title: string, kind: string, mobile: boolean) {
  if (!['studio'].includes(kind)) addDesktopHeader(screen, components);
  switch (kind) {
    case 'home': heroComposition(screen, components, mobile); break;
    case 'shop': shopComposition(screen, components, mobile); break;
    case 'studio': studioComposition(screen, components, mobile); break;
    case 'cart': cartComposition(screen, components, mobile); break;
    case 'login': formComposition(screen, components, 'Đăng nhập', mobile); break;
    case 'register': formComposition(screen, components, 'Tạo tài khoản', mobile); break;
    case 'orders': ordersComposition(screen, components, mobile); break;
    case 'support': supportComposition(screen, components, mobile); break;
    default: genericComposition(screen, components, title.split('/').slice(1).join('/').trim(), kind.toUpperCase(), mobile);
  }
}

function buildDesktopScreens(page: PageNode, components: ComponentMap) {
  const columns = 2;
  desktopDefinitions.forEach(([name, kind], index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = 80 + col * 1380;
    const y = 140 + row * 1100;
    page.appendChild(screenLabel(name, x, y - 60));
    const screen = screenFrame(name, 1280, 960, x, y);
    composeScreen(screen, components, name, kind, false);
    page.appendChild(screen);
  });
}

const mobileDefinitions = [
  ['01 / Home', 'home'], ['02 / Shop catalog', 'shop'], ['03 / Product detail', 'product'],
  ['04 / Design model picker', 'model'], ['05 / Studio editor', 'studio'], ['06 / Cart', 'cart'],
  ['07 / Checkout', 'checkout'], ['08 / Orders', 'orders'], ['09 / Customer support', 'support']
] as const;

function buildMobileScreens(page: PageNode, components: ComponentMap) {
  mobileDefinitions.forEach(([name, kind], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 80 + col * 470;
    const y = 140 + row * 1120;
    page.appendChild(screenLabel(name, x, y - 60));
    const screen = screenFrame(name, 375, 1000, x, y);
    composeScreen(screen, components, name, kind, true);
    page.appendChild(screen);
  });
}

function overlayFrame(name: string, width: number, height: number): FrameNode {
  const node = fixedFrame(name, width, height, C.surface);
  node.cornerRadius = 24;
  setStroke(node, C.line);
  return node;
}

function buildStates(page: PageNode, components: ComponentMap) {
  const intro = pageSection('States & overlays', 'Key production states cover modal, drawer, search, chat, notifications, empty/loading/error, and successful checkout outcomes.', 80, 80, 1460);
  page.appendChild(intro);
  const items: FrameNode[] = [];

  const modal = overlayFrame('Modal / Confirm model change', 520, 360);
  const modalCard = card('Dialog', 440, 28, 16);
  modalCard.x = 40; modalCard.y = 40;
  modalCard.appendChild(iconCircle('!', C.warningBg, C.warning, 46));
  modalCard.appendChild(text('Xác nhận đổi dòng máy?', 23, C.brand900, 'bold'));
  modalCard.appendChild(text('Các phần tử trên canvas có thể được co dãn để phù hợp phôi mới.', 13, C.soft));
  const modalActions = auto('Actions', 'HORIZONTAL', 12);
  modalActions.appendChild(components.secondaryButton.createInstance());
  modalActions.appendChild(components.primaryButton.createInstance());
  modalCard.appendChild(modalActions);
  modal.appendChild(modalCard);
  items.push(modal);

  const drawer = overlayFrame('Drawer / Cart', 520, 640);
  const drawerPanel = fixedFrame('Cart drawer', 410, 640, C.white);
  drawerPanel.x = 110;
  setStroke(drawerPanel, C.line);
  const drawerContent = auto('Drawer content', 'VERTICAL', 18);
  drawerContent.x = 26; drawerContent.y = 26;
  drawerContent.appendChild(text('Giỏ hàng', 22, C.brand900, 'bold'));
  drawerContent.appendChild(text('Đã thêm Lilac Dream vào giỏ.', 12, C.success, 'medium'));
  drawerContent.appendChild(components.orderCard.createInstance());
  drawerContent.appendChild(components.primaryButton.createInstance());
  drawerPanel.appendChild(drawerContent);
  drawer.appendChild(drawerPanel);
  items.push(drawer);

  const search = overlayFrame('Overlay / Global search', 700, 480);
  const searchBox = card('Search command', 620, 24, 16);
  searchBox.x = 40; searchBox.y = 40;
  searchBox.appendChild(text('Tìm kiếm CasEYE’s', 21, C.brand900, 'bold'));
  searchBox.appendChild(components.input.createInstance());
  searchBox.appendChild(label('GỢI Ý NHANH'));
  ['Ốp tím pastel', 'iPhone 16 Pro', 'Bloom Club', 'Tự thiết kế'].forEach((name) => searchBox.appendChild(pill(name)));
  search.appendChild(searchBox);
  items.push(search);

  const chat = overlayFrame('Panel / Support chat', 420, 640);
  const chatCard = card('Chat panel', 370, 24, 14);
  chatCard.x = 25; chatCard.y = 25;
  chatCard.appendChild(label('LIVE SUPPORT'));
  chatCard.appendChild(text("Nhắn CasEYE's", 23, C.brand900, 'bold'));
  const agent = pill('Chào bạn, mình có thể giúp gì?', C.brand50, C.brand800);
  chatCard.appendChild(agent);
  const customer = pill('Mình cần kiểm tra đơn hàng.', C.brand800, C.white);
  chatCard.appendChild(customer);
  chatCard.appendChild(components.input.createInstance());
  chat.appendChild(chatCard);
  items.push(chat);

  const notices = overlayFrame('Notifications / Semantic', 520, 520);
  const noticeStack = auto('Semantic messages', 'VERTICAL', 14);
  noticeStack.x = 30; noticeStack.y = 30;
  [
    ['Success', 'Đã lưu thiết kế thành công.', C.successBg, C.success],
    ['Warning', 'Vui lòng kiểm tra dòng máy.', C.warningBg, C.warning],
    ['Error', 'Thanh toán chưa hoàn tất.', C.errorBg, C.error],
    ['Info', 'Đơn hàng đang được in.', C.brand50, C.brand800]
  ].forEach(([name, message, bg, fg]) => {
    const n = card(`Toast / ${name}`, 460, 18, 6);
    setFill(n, bg);
    n.appendChild(text(name, 13, fg, 'bold'));
    n.appendChild(text(message, 12, C.soft));
    noticeStack.appendChild(n);
  });
  notices.appendChild(noticeStack);
  items.push(notices);

  const states = overlayFrame('Page states / Empty loading error success', 700, 640);
  const stateGrid = auto('State grid', 'HORIZONTAL', 14);
  stateGrid.x = 28; stateGrid.y = 28;
  ['Empty', 'Loading', 'Error', 'Success'].forEach((name, i) => {
    const state = card(`State / ${name}`, 150, 18, 10);
    state.appendChild(iconCircle(i === 2 ? '!' : i === 3 ? '✓' : i === 1 ? '…' : '0', i === 2 ? C.errorBg : i === 3 ? C.successBg : C.brand50, i === 2 ? C.error : i === 3 ? C.success : C.brand800, 48));
    state.appendChild(text(name, 16, C.brand900, 'bold'));
    state.appendChild(text(i === 0 ? 'Chưa có dữ liệu' : i === 1 ? 'Đang tải…' : i === 2 ? 'Có lỗi xảy ra' : 'Hoàn tất', 11, C.soft));
    stateGrid.appendChild(state);
  });
  states.appendChild(stateGrid);
  const checkout = card('Checkout success', 640, 28, 12);
  checkout.x = 30; checkout.y = 260;
  checkout.appendChild(iconCircle('✓', C.success, C.white, 64));
  checkout.appendChild(text('Đặt hàng thành công', 25, C.brand900, 'bold'));
  checkout.appendChild(text('Mã đơn #CASEYE-2026-018 đã được xác nhận.', 13, C.soft));
  checkout.appendChild(components.primaryButton.createInstance());
  states.appendChild(checkout);
  items.push(states);

  items.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    item.x = 80 + col * 760;
    item.y = 560 + row * 760;
    page.appendChild(item);
  });
}

async function generate() {
  await Promise.all([
    figma.loadFontAsync(FONT),
    figma.loadFontAsync(FONT_MEDIUM),
    figma.loadFontAsync(FONT_BOLD)
  ]);

  const generatedNames = ['01 Foundations', '02 Components', '03 Desktop Screens', '04 Mobile Screens', '05 States & Overlays'];
  const oldPages = figma.root.children.filter((page) => generatedNames.includes(page.name));
  const pages = generatedNames.map((name) => {
    const page = figma.createPage();
    page.name = name;
    return page;
  });
  figma.currentPage = pages[0];
  oldPages.forEach((page) => page.remove());

  buildFoundations(pages[0]);
  const components = buildComponents(pages[1]);
  buildDesktopScreens(pages[2], components);
  buildMobileScreens(pages[3], components);
  buildStates(pages[4], components);

  figma.currentPage = pages[2];
  figma.viewport.scrollAndZoomIntoView(pages[2].children.slice(0, 4));
  figma.notify("CasEYE's editable production UI kit generated", { timeout: 5000 });
}

figma.ui.onmessage = async (message: { type?: string }) => {
  if (message.type !== 'generate') return;
  try {
    await generate();
    figma.ui.postMessage({ type: 'done', text: 'Complete: 5 pages, 16 desktop screens, 9 mobile screens, and editable components.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(error);
    figma.notify(`Generation failed: ${message}`, { error: true, timeout: 8000 });
    figma.ui.postMessage({ type: 'error', text: `Generation failed: ${message}` });
  }
};
