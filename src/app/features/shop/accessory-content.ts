import { ACCESSORIES, type CatalogAccessory } from './catalog';

export function findAccessory(id: string | null | undefined): CatalogAccessory | undefined {
  return id ? ACCESSORIES.find((a) => a.id === id) : undefined;
}

/** Rich content for an accessory's detail page (UI level, static like the rest of the catalog). */
export interface AccessoryDetail {
  readonly tagline: string;
  readonly story: string;
  readonly highlights: readonly string[];
  readonly specs: readonly (readonly [label: string, value: string])[];
  readonly inBox: readonly string[];
  /** Who it works with, shown as a compatibility note. */
  readonly compatibility: string;
  /** Demo rating shown on the page. */
  readonly rating: number;
  readonly reviews: number;
}

export const ACCESSORY_DETAILS: Readonly<Record<string, AccessoryDetail>> = {
  'accessory-charging-puck': {
    tagline: 'Đặt lên là sạc, hít chuẩn không lệch.',
    story: "Đế sạc tròn mỏng nhẹ với nam châm căn chỉnh tự động, tông tím pastel đồng bộ với bộ sưu tập ốp CasEYE's. Đặt máy lên là sạc ngay, không cần tìm cổng hay cắm dây mỗi tối.",
    highlights: ['Nam châm tự căn đúng vị trí sạc', 'Sạc không dây tới 15W', 'Mặt silicone chống trượt, không trầy ốp', 'Dây USB‑C bện dù 1m bền bỉ'],
    specs: [['Công suất', 'Tối đa 15W'], ['Cổng kết nối', 'USB‑C'], ['Chiều dài dây', '1 m'], ['Kích thước', 'Ø 56 × 6 mm'], ['Chất liệu', 'Nhôm + silicone']],
    inBox: ['Đế sạc từ tính', 'Dây USB‑C bện dù 1m', 'Hướng dẫn sử dụng'],
    compatibility: "Dùng với iPhone hỗ trợ MagSafe hoặc khi gắn ốp MagSafe CasEYE's.",
    rating: 4.9,
    reviews: 412,
  },
  'accessory-magnetic-wallet': {
    tagline: 'Thẻ luôn ở bên, gọn trong một chạm.',
    story: 'Ví da mềm gắn từ phía sau ốp, đựng vừa 3 thẻ và thẻ xe. Lực hít đủ chắc để cho vào túi quần mà không rơi, tháo ra chỉ bằng một tay.',
    highlights: ['Đựng 3 thẻ ngân hàng / thẻ xe', 'Da PU mềm chống bám bẩn', 'Lực hít mạnh, tháo lắp một tay', 'Mỏng chỉ 7 mm'],
    specs: [['Sức chứa', '3 thẻ'], ['Chất liệu', 'Da PU cao cấp'], ['Độ dày', '7 mm'], ['Màu', 'Tím Lavender']],
    inBox: ['Ví da từ tính', 'Thẻ hướng dẫn'],
    compatibility: "Gắn được trên ốp MagSafe CasEYE's và iPhone có MagSafe.",
    rating: 4.8,
    reviews: 268,
  },
  'accessory-ring-holder': {
    tagline: 'Cầm chắc tay, dựng máy xem phim.',
    story: 'Nhẫn kim loại hít từ xoay 360°, vừa làm tay cầm khi chụp ảnh một tay vừa gập thành chân đế để xem video. Tháo ra khi cần sạc không dây.',
    highlights: ['Xoay 360°, gập 180°', 'Làm giá đỡ ngang và dọc', 'Hợp kim nhôm nhẹ, không gỉ', 'Không để lại keo trên ốp'],
    specs: [['Chất liệu', 'Hợp kim nhôm'], ['Góc xoay', '360°'], ['Trọng lượng', '18 g'], ['Kích thước', 'Ø 45 mm']],
    inBox: ['Nhẫn giữ từ tính', 'Miếng dán kim loại dự phòng'],
    compatibility: 'Hít trên ốp MagSafe; kèm miếng dán kim loại cho máy không có MagSafe.',
    rating: 4.7,
    reviews: 351,
  },
  'accessory-desk-stand': {
    tagline: 'Góc làm việc gọn gàng, máy luôn trong tầm mắt.',
    story: 'Giá đỡ để bàn hít từ với khớp chỉnh góc linh hoạt, giữ máy ở tư thế ngang hoặc dọc khi gọi video, theo dõi thông báo hay làm màn hình phụ.',
    highlights: ['Chỉnh góc nghiêng và độ cao', 'Đế nặng chống lật', 'Xoay ngang/dọc tức thì', 'Đệm silicone bảo vệ ốp'],
    specs: [['Chất liệu', 'Hợp kim nhôm + silicone'], ['Chiều cao', '12 – 18 cm'], ['Góc nghiêng', '0 – 90°'], ['Trọng lượng', '320 g']],
    inBox: ['Giá đỡ để bàn', 'Khăn lau'],
    compatibility: "Dành cho ốp MagSafe CasEYE's và iPhone có MagSafe.",
    rating: 4.8,
    reviews: 133,
  },
  'accessory-power-bank': {
    tagline: 'Thêm một ngày pin, không thêm dây rối.',
    story: 'Pin dự phòng hít từ siêu mỏng, gắn sau máy là sạc. Có cổng USB‑C để sạc lại pin hoặc sạc dây cho thiết bị khác khi cần.',
    highlights: ['Dung lượng 5.000 mAh', 'Sạc không dây 7.5W khi gắn', 'Cổng USB‑C sạc 2 chiều', 'Đèn báo dung lượng 4 mức'],
    specs: [['Dung lượng', '5.000 mAh'], ['Sạc không dây', '7.5W'], ['Cổng', 'USB‑C (vào/ra 20W)'], ['Độ dày', '12 mm'], ['Trọng lượng', '125 g']],
    inBox: ['Pin dự phòng từ tính', 'Dây USB‑C 30 cm', 'Hướng dẫn sử dụng'],
    compatibility: "Gắn trên ốp MagSafe CasEYE's hoặc iPhone có MagSafe; sạc dây được mọi thiết bị USB‑C.",
    rating: 4.7,
    reviews: 289,
  },
  'accessory-beaded-wristlet': {
    tagline: 'Một chút lấp lánh nơi cổ tay.',
    story: 'Dây đeo cổ tay kết hạt tông tím oải hương, phối cùng ốp pastel cho set đồ thêm điệu. Giữ máy an toàn khi đi dạo, chụp ảnh hay đi cà phê.',
    highlights: ['Hạt acrylic và ngọc trai nhân tạo', 'Dây dù chịu lực bên trong', 'Gắn bằng miếng kẹp dưới ốp', 'Phối hợp mọi mẫu ốp pastel'],
    specs: [['Chiều dài', '28 cm'], ['Chất liệu', 'Hạt acrylic, ngọc trai nhân tạo, dây dù'], ['Tải trọng', 'Tới 500 g']],
    inBox: ['Dây đeo hạt', 'Miếng kẹp gắn ốp'],
    compatibility: "Dùng với mọi ốp CasEYE's qua miếng kẹp đặt dưới ốp.",
    rating: 4.9,
    reviews: 524,
  },
  'accessory-braided-strap': {
    tagline: 'Rảnh tay, yên tâm mọi chuyến đi.',
    story: 'Dây đeo cổ tay bện dù chắc chắn, nhẹ và mềm, giữ điện thoại không tuột khỏi tay khi di chuyển, đạp xe hay đứng trên xe buýt.',
    highlights: ['Dây dù bện chịu lực cao', 'Khoá điều chỉnh độ rộng', 'Nhẹ, không hằn tay', 'Giặt được'],
    specs: [['Chiều dài', '30 cm (điều chỉnh)'], ['Chất liệu', 'Dây dù polyester'], ['Tải trọng', 'Tới 1 kg']],
    inBox: ['Dây đeo bện', 'Miếng kẹp gắn ốp'],
    compatibility: "Dùng với mọi ốp CasEYE's qua miếng kẹp đặt dưới ốp.",
    rating: 4.6,
    reviews: 198,
  },
  'accessory-flower-charm': {
    tagline: 'Đoá hoa trong trẻo đung đưa theo bạn.',
    story: 'Charm hoa acrylic trong suốt ánh tím, treo lên ốp hay móc khoá đều xinh. Món quà nhỏ dễ thương cho bạn bè thích phong cách pastel.',
    highlights: ['Acrylic trong, không ố vàng', 'Móc kim loại mạ chống gỉ', 'Treo ốp, túi hoặc móc khoá'],
    specs: [['Kích thước', '4 × 4 cm'], ['Chất liệu', 'Acrylic + kim loại mạ'], ['Trọng lượng', '8 g']],
    inBox: ['Charm hoa', 'Dây treo'],
    compatibility: 'Treo được trên ốp có lỗ dây hoặc qua miếng kẹp dây đeo.',
    rating: 4.8,
    reviews: 176,
  },
  'accessory-plush-star': {
    tagline: 'Ngôi sao bông mềm, ôm là thấy vui.',
    story: 'Charm ngôi sao bông mềm mịn với gương mặt tươi cười, điểm xuyết cho chiếc ốp thêm đáng yêu. Bông lông ngắn, ít bám bụi và dễ vệ sinh.',
    highlights: ['Bông lông ngắn mềm mịn', 'Thêu mặt cười sắc nét', 'Móc kim loại chắc chắn'],
    specs: [['Kích thước', '6 × 6 cm'], ['Chất liệu', 'Vải bông polyester'], ['Trọng lượng', '12 g']],
    inBox: ['Charm ngôi sao bông', 'Dây treo'],
    compatibility: 'Treo được trên ốp có lỗ dây hoặc qua miếng kẹp dây đeo.',
    rating: 4.9,
    reviews: 307,
  },
  'accessory-astronaut-star': {
    tagline: 'Phi hành gia nhỏ cho người mê vũ trụ.',
    story: 'Charm phi hành gia cùng ngôi sao lấp lánh, hợp với các mẫu ốp Cosmic Edit. Món phụ kiện nhỏ nhắc bạn luôn mơ những giấc mơ thật xa.',
    highlights: ['Nhựa PVC mềm sơn tay', 'Ngôi sao phủ nhũ lấp lánh', 'Hợp bộ sưu tập Cosmic Edit'],
    specs: [['Kích thước', '5 × 3 cm'], ['Chất liệu', 'PVC mềm + kim loại mạ'], ['Trọng lượng', '10 g']],
    inBox: ['Charm phi hành gia', 'Dây treo'],
    compatibility: 'Treo được trên ốp có lỗ dây hoặc qua miếng kẹp dây đeo.',
    rating: 4.8,
    reviews: 92,
  },
};
