# Kiểm duyệt độc lập module Quản lý đơn hàng (CaseCraft)

Bạn là reviewer độc lập cho phần việc của mình trong đồ án môn Phát triển web kinh doanh. Bạn chưa từng tham gia làm phần này, nên đừng tin bất kỳ báo cáo nào trong repo. Hãy tự kiểm chứng bằng cách đọc code, chạy test và chạy web.

## Bối cảnh
- Web bán ốp lưng (Angular 22 + Tailwind v4 + Supabase), repo `E:\UEL\ECOMMERCE-WEB-CASEYEs`, nhánh `feature/order-tracking`. Mỗi thành viên phụ trách một module; mình làm **Quản lý đơn hàng & giao vận**.
- Nguồn sự thật nghiệp vụ: `C:\Users\admin\Downloads\BRDSRD_Quan_ly_don_hang_Giao_van_v8.docx` (BR, FR-OT-01…20, EX-01…16, Bảng 3.1–3.6, UC, US). Quy tắc chi tiết và các quyết định đã chốt: `C:\Users\admin\Downloads\PROMPT_ClaudeCode_Quan_ly_don_hang_v8.md` (mục 11 "Quyết định v8" thắng mọi chỗ khác). Nếu tài liệu và code mâu thuẫn, tài liệu đúng, trừ khi `docs/ui-review/report-v8.md` ghi rõ đó là giả định có lý do.
- Quy ước của team: `docs/SKILL.md` (conventions Angular), `docs/GIT_WORKFLOW.md`, token màu ở `src/styles/tokens.css`.
- Phạm vi đã chốt: chỉ giao diện khách là sản phẩm thật. Dữ liệu là mock trong localStorage, sau lớp `OrderRepository`. Demo Console (`/order-tracking/demo?demo=1`) là công cụ mô phỏng, thay cho Thanh toán, Operator, CSKH, Admin, 3PL và cron. Không có cổng thanh toán; hoàn tiền do Admin chuyển khoản tay.
- Code của mình nằm trong `src/app/features/order-tracking/**`, cộng với `public/order-tracking/*.svg` và `docs/ui-review/`, `docs/order-policy-links.md`. Phần còn lại của repo là của team: chỉ đọc để đối chiếu, không đánh giá như lỗi của mình. Nếu phần của team mâu thuẫn với module (ví dụ migration `supabase/migrations/*orders*.sql` mới từ develop), hãy nêu thành "điểm cần bàn với team".

## Việc cần làm
Đánh giá xem module có đúng nghiệp vụ v8, chạy đúng, dùng được và sẵn sàng để nộp hay chưa. Tự chọn cách kiểm tra phù hợp, nhưng kết luận nào cũng phải có bằng chứng (đường dẫn `file:dòng`, kết quả lệnh, hoặc thao tác tái hiện trên web).

Các vùng mình lo nhất, theo thứ tự ưu tiên:
1. **Đúng nghiệp vụ:**
   - Máy trạng thái và các luồng chuyển: không nhảy cóc; đơn custom luôn qua duyệt bản thiết kế.
   - Ba đường hủy: COD trong thời gian đổi ý, yêu cầu hủy cho đơn trả trước (tạm giữ đơn, CSKH quyết, rút lại được), hủy khi thiết kế bị từ chối.
   - Các tình huống hoàn tiền S1, S2, S3a, S3b, S3c, S4 (Bảng 3.4); hoàn tiền không bao giờ tự động, và chỉ Admin được duyệt tiền.
   - EDD: giờ cắt 16:00 và Hỏa tốc 14:00. Kiểm tra lại 4 ví dụ bắt buộc ở FR-OT-04.
   - Giao thất bại, lưu kho 14 ngày, đóng băng và cộng bù đồng hồ 72 giờ và 14 ngày; Job 1–4; webhook idempotent; retry queue.
   - Bảng 3.1 (đơn chưa khép) và quy tắc "không hiện đồng hồ đếm ngược cho khách".
2. **Trải nghiệm khách:** chạy 8 kịch bản nghiệm thu ở mục 8 của file prompt UI (nếu không có, dùng 8 kịch bản sau) bằng 2 tab, một tab khách và một tab Demo Console:
   1. COD hủy trong thời gian đổi ý.
   2. COD để quá hạn, nút Hủy biến mất.
   3. Đơn custom trả trước gửi yêu cầu hủy, CSKH chấp nhận, khách nhận hoàn bằng tài khoản.
   4. Như 3 nhưng CSKH từ chối, thanh tiến trình sáng lại.
   5. Operator từ chối thiết kế, khách hủy và nhận hoàn.
   6. Hỏa tốc COD đặt trước và sau 14:00.
   7. Giao thất bại, rồi giao lại.
   8. Đã giao, báo sự cố, rồi đánh giá.

   Kiểm tra thêm: 375/768/1280px không cuộn ngang ngoài ý muốn, nút ≥ 44px, dùng được bằng bàn phím, không lộ từ nội bộ (`Pending_*`, `Action_Required`, "Epic", "Giao nhanh", vùng Z1–Z3).
3. **Chất lượng code theo quy ước team:**
   - Standalone + OnPush, signals, `@if`/`@for`.
   - Không import chéo giữa các feature; logic nghiệp vụ nằm trong service hoặc hàm thuần, không nằm trong component.
   - Màu trạng thái gom về một file map.
   - Không có lỗ hổng rõ ràng: dữ liệu khách trong URL, XSS qua binding, tin nội dung localStorage mà không kiểm tra.
4. **Test:** test hiện có kiểm tra đúng điều quan trọng chưa, hay chỉ kiểm tra cho có? Kịch bản quan trọng nào chưa có test?
5. **Tài liệu và git:** `docs/ui-review/report-v8.md` và `audit-v8.md` có nói đúng sự thật không: có mục nào ghi "đã làm" mà thực tế chưa làm hay làm sai không? Lịch sử commit có lẫn file của người khác không?

## Cách chạy
```bash
npm ci
npx ng build
npx ng test --watch=false --include="src/app/features/order-tracking/**/*.spec.ts"
npm start
```
Mở `http://localhost:4200/order-tracking/demo?demo=1` trước để bật chế độ demo. Trong đó tạo đơn mẫu, đổi vai trò Operator / CSKH / Admin, tua giờ, chạy Job, bấm webhook. Trang khách ở `http://localhost:4200/order-tracking`. Dữ liệu nằm trong localStorage (`casecraft.ot.db.v2`); nút "Xóa dữ liệu demo" ở cuối Console.

## Giới hạn
- **Chỉ đọc và chạy, không sửa code, không commit, không push**, kể cả lỗi nhỏ. Mình sẽ quyết định sửa gì sau khi đọc báo cáo. Được tạo file tạm ngoài repo để thử.
- Không chạy lệnh làm thay đổi git (merge, reset, checkout file) và không cài thêm package vào `package.json`.
- Nếu phải giả định điều gì để kết luận, ghi rõ giả định đó.

## Kết quả mong muốn (viết bằng tiếng Việt, ngắn gọn, đi thẳng vào vấn đề)
1. **Kết luận 3–5 dòng:** module đã sẵn sàng để nộp hay chưa, rủi ro lớn nhất là gì.
2. **Bảng phát hiện**, xếp theo mức độ (Nghiêm trọng / Cao / Trung bình / Thấp), mỗi dòng gồm:
   - mã tham chiếu tài liệu (FR-OT-xx, EX-xx, Bảng 3.x, P0/P1-x);
   - mô tả ngắn;
   - bằng chứng (`file:dòng`, lệnh và kết quả, hoặc các bước tái hiện);
   - hậu quả cho khách hoặc cho shop;
   - đề xuất sửa trong 1–2 câu.

   Chỉ đưa vào những gì đã tự kiểm chứng; điều nghi ngờ mà chưa kiểm được thì để mục riêng "Cần xác minh thêm".
3. **Kết quả 8 kịch bản:** đạt / không đạt, kèm ghi chú.
4. **Điều đã làm tốt:** tối đa 5 ý, để mình biết chỗ nào không cần đụng vào.
5. **Điểm cần bàn với team:** mâu thuẫn giữa module và code hoặc migration của người khác.
