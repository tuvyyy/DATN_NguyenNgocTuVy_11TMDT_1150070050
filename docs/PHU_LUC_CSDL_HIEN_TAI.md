# CƠ SỞ DỮ LIỆU TRỌNG TÂM

CSDL có **58 bảng**; dưới đây là **14 bảng trọng tâm** của quy trình khám, kê đơn, thanh toán và dự báo. Mỗi bảng trích ba bản ghi đang lưu, chỉ chọn các cột chính. Các mẫu được lấy riêng theo từng bảng, không đại diện cho một ca khám xuyên suốt. Dữ liệu có bao gồm bản ghi demo.

**Liên kết chính:** Bệnh nhân → Hồ sơ → Lượt khám → Dịch vụ / Chỉ định cận lâm sàng / Đơn thuốc / Hóa đơn. Mỗi chỉ định có kết quả; mỗi đơn thuốc và hóa đơn có các dòng chi tiết. Danh mục bệnh, dịch vụ, kỹ thuật và thuốc cung cấp thông tin tham chiếu.

## 1. Bệnh nhân — `benh_nhan`

| id | ma_bn | gioi_tinh |
| --- | --- | --- |
| 1 | BN-20251103-130951 | Nam |
| 10006 | BN-20251105-482357 | NULL |
| 10007 | BN-20251105-253817 | NULL |

## 2. Hồ sơ bệnh án — `ho_so_benh_an`

| id | id_benh_nhan | trang_thai |
| --- | --- | --- |
| 1 | 1 | DANG_KHAM |
| 2 | 2 | MOI |
| 3 | 3 | MOI |

## 3. Lượt khám và nguồn dự báo — `lan_kham`

| id | id_ho_so | id_benh | trang_thai |
| --- | --- | --- | --- |
| 3 | 1 | NULL | CHO_THUC_HIEN |
| 4 | 1 | NULL | DANG_KHAM |
| 5 | 1 | 9 | DANG_KHAM |

## 4. Danh mục bệnh — `benh`

| id | ma | ten |
| --- | --- | --- |
| 2 | B001 | Tăng huyết áp |
| 3 | B002 | Đái tháo đường |
| 4 | B003 | Loét dạ dày tá tràng |

## 5. Dịch vụ khám — `dich_vu`

| id | ma | ten |
| --- | --- | --- |
| 1 | DV01 | Khám tại Phòng khám Nội tổng quát |
| 2 | DV02 | Khám tại Phòng khám Ngoại thần kinh |
| 3 | DV03 | Khám tại Phòng khám Tai Mũi Họng |

## 6. Dịch vụ đăng ký trong lượt khám — `lan_kham_dich_vu`

| id | id_lan_kham | id_dich_vu | don_gia |
| --- | --- | --- | --- |
| 2 | 4 | 1 | 150000.00 |
| 10010 | 5 | 1 | 150000.00 |
| 10011 | 5 | 2 | 150000.00 |

## 7. Danh mục kỹ thuật cận lâm sàng — `dvkt`

| id | ma_dvkt | ten_dvkt |
| --- | --- | --- |
| 1 | XN-MAU-TONGQUAT | Xét nghiệm máu tổng quát (CBC) |
| 2 | XN-DUONG-HUYET | Xét nghiệm đường huyết |
| 3 | XN-MAU-NHIEMM | Xét nghiệm máu nhiễm mỡ |

## 8. Chỉ định cận lâm sàng — `chi_dinh_dvkt`

| id | id_lan_kham | id_dvkt | trang_thai |
| --- | --- | --- | --- |
| 1 | 3 | 1 | done |
| 2 | 5 | 1 | canceled |
| 3 | 10011 | 5 | canceled |

## 9. Kết quả cận lâm sàng — `dvkt_ket_qua`

| id | id_chi_dinh_dvkt | trang_thai |
| --- | --- | --- |
| 2 | 1 | pending |
| 10002 | 1 | pending |
| 10003 | 10010 | draft |

## 10. Danh mục thuốc — `thuoc`

| id | ma | ten |
| --- | --- | --- |
| 1 | TH001 | Paracetamol 500mg |
| 2 | TH002 | Amoxicillin 500mg |
| 3 | TH003 | Vitamin C 100mg |

## 11. Đơn thuốc — `don_thuoc`

| id | id_lan_kham | tong_tien |
| --- | --- | --- |
| 1 | 3 | 0.00 |
| 2 | 3 | 45000.00 |
| 7 | 30011 | 13500.00 |

## 12. Thuốc kê trong đơn — `chi_tiet_don_thuoc`

| id | id_don_thuoc | id_thuoc | so_luong |
| --- | --- | --- | --- |
| 1 | 2 | 2 | 10 |
| 2 | 7 | 1 | 1 |
| 3 | 7 | 3 | 1 |

## 13. Hóa đơn thanh toán — `hoa_don`

| id | id_lan_kham | tong_tien | trang_thai |
| --- | --- | --- | --- |
| 1 | NULL | 300000.00 | DA_THANH_TOAN |
| 2 | NULL | 150000.00 | TAO |
| 3 | NULL | 300000.00 | TAO |

## 14. Các khoản thu trong hóa đơn — `chi_tiet_hoa_don`

| id | id_hoa_don | loai_tham_chieu | thanh_tien |
| --- | --- | --- | --- |
| 1 | 1 | PHONG_KHAM | 150000.00 |
| 2 | 1 | PHONG_KHAM | 150000.00 |
| 10002 | 2 | PHONG_KHAM | 150000.00 |
