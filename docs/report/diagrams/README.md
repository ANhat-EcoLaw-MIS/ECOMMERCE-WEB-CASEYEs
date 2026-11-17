# Sơ đồ Chương 3

Có 31 sơ đồ, mỗi sơ đồ một file `.drawio`. File mở và sửa được bằng [draw.io / diagrams.net](https://app.diagrams.net) (bản web hoặc desktop): chọn File → Open from → Device.
Ảnh PNG dùng để chèn vào Word nằm ở `png/`.

| Nhóm | File |
|---|---|
| BPMN | `BPMN-ASIS-01`, `BPMN-00`, `BPMN-AUTH-01`, `BPMN-PM-01`, `BPMN-SH-01`, `BPMN-DES-01`, `BPMN-P-01`, `BPMN-OT-01`, `BPMN-OT-02`, `BPMN-CS-01`, `BPMN-SR-01` |
| Use case | `UC-00`, `UC-AUTH`, `UC-PM`, `UC-SH`, `UC-DES`, `UC-P`, `UC-OT`, `UC-CS`, `UC-SR` |
| Biểu đồ lớp | `CD-AUTH`, `CD-PM`, `CD-SH`, `CD-DES`, `CD-P`, `CD-OT`, `CD-CS`, `CD-SR` |
| Trạng thái | `ST-OT` |
| Dữ liệu | `CDM`, `ERD` |

## Hai cách sửa

**Cách 1: sửa tay trong draw.io**, sau đó File → Export as → PNG rồi thay ảnh trong Word. Cách này nhanh khi chỉ sửa một sơ đồ.

**Cách 2: sửa mã nguồn rồi sinh lại toàn bộ sơ đồ và file Word.** Giữ được bố cục đồng nhất giữa các sơ đồ.
- Mã nguồn nằm trong `docs/report/build/`:
  - `d_bpmn.py`: các sơ đồ BPMN.
  - `d_uc.py`: use case.
  - `d_cd.py`: biểu đồ lớp.
  - `d_data.py`: sơ đồ trạng thái, CDM, ERD.
  - `c31.py` … `c35.py`: nội dung chữ của Chương 3.
- Chạy hai lệnh dưới (cần Python có Pillow và python-docx):

```bash
cd docs/report/build && python -c "import d_bpmn,d_uc,d_cd,d_data; [f().save('../diagrams') for m in (d_bpmn,d_uc,d_cd,d_data) for f in m.ALL]"
```

```bash
cd docs/report/build && python build_docx.py
```

Lưu ý: chạy cách 2 sẽ **ghi đè** các file `.drawio` đã sửa tay. Nếu đã sửa tay, hãy đổi tên file đó trước khi chạy.
