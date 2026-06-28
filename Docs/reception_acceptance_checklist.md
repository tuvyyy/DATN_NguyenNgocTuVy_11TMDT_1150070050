# Checklist nghiệm thu luồng tiếp đón

Phạm vi: chỉ kiểm tra luồng tiếp đón V2, chia khu, chỉ định dịch vụ ban đầu, thu ngân liên quan phiếu dịch vụ, hàng đợi khám.

## Phase 1 - Khóa form tiếp đón

- BN mới không BHYT: thiếu họ tên, SĐT, ngày sinh, giới tính, lý do khám phải bị chặn.
- BN dưới 16 tuổi: thiếu người giám hộ hoặc SĐT giám hộ phải bị chặn.
- BN thiếu CCCD: phải nhập ghi chú định danh.
- BN BHYT: phải có số thẻ, ngày hết hạn, nơi đăng ký KCB, tuyến khám.
- BN chuyển tuyến/trái tuyến: phải có giấy chuyển tuyến.
- BN cấp cứu: loại khám và mức ưu tiên tự về "Cấp cứu".

## Phase 2 - Nền dữ liệu khu

- Có danh mục khu A/B/C/D/Cấp cứu và quầy theo khu.
- Hồ sơ tiếp đón lưu `id_khu_tiep_don`, `id_quay_tiep_don`.
- Phòng khám/phòng thực hiện có `id_khu_tiep_don`.
- User/quầy/khu có bảng phân quyền thao tác theo khu.

## Phase 3 - Tiếp đón theo khu

- Reception phải chọn khu/quầy trước khi lưu tiếp đón.
- Scan BN có hồ sơ active trong ngày ở khu khác phải cảnh báo khu đang có hồ sơ.
- Nếu hồ sơ trong ngày còn active thì ưu tiên dùng lại.
- Nếu tạo thêm lượt khác khu thì bắt lý do và ghi log.

## Phase 4 - Dịch vụ/phòng theo khu

- Catalog dịch vụ mặc định chỉ chọn được dịch vụ/phòng đúng khu hồ sơ.
- Dịch vụ thuộc khu khác phải bị chặn ở backend.
- Phòng chưa map khu phải bị chặn.
- Dịch vụ/phòng đang tạm ngưng phải bị chặn.
- Dịch vụ trùng trong cùng hồ sơ/ngày phải bị chặn.
- Đơn giá lấy theo phòng và đối tượng thanh toán, rồi mới fallback giá chung.

## Phase 5 - Chuyển khu, hủy khu, đổi phòng

- Chuyển khu tạo trạng thái `CHO_CHUYEN_KHU` và bắt lý do.
- Nhận khu mới chuyển sang `DA_NHAN_KHU_MOI`, cập nhật khu/quầy mới.
- Hủy chuyển khu chuyển sang `HUY_CHUYEN_KHU` và bắt lý do.
- Không hủy/chuyển khu trực tiếp khi đã có hóa đơn thanh toán.
- Không hủy/chuyển khu trực tiếp khi đã có dịch vụ thực hiện/có kết quả.
- Đổi phòng phải nhập lý do.
- Đổi phòng chỉ cho phép trước thanh toán và trước thực hiện.
- Đổi phòng phải cùng khu hồ sơ và không trùng dịch vụ tại phòng mới.

## Phase 6 - BHYT và thanh toán

- Đối tượng thanh toán gồm Tự phí/Bảo hiểm/Dịch vụ yêu cầu/Công ty chi trả/Miễn giảm.
- BHYT hết hạn bị chặn ở tiếp đón.
- Giá dịch vụ ưu tiên theo đối tượng thanh toán.
- Thu ngân không cho thanh toán phiếu sai khu hoặc dòng dịch vụ thiếu khu/phòng.
- Sau thanh toán phiếu dịch vụ, hệ thống tạo hàng đợi khám và dòng dịch vụ.

## Phase 7 - STT, kiosk, in phiếu

- Danh sách tiếp đón trả STT theo ngày + khu + quầy.
- Phiếu khám in đúng mã hồ sơ, mã BN, khu, quầy, STT, phòng và dịch vụ.
- STT không dùng số thứ tự phân trang làm số vận hành.

## Phase 8 - Case nhanh

- BN mới không BHYT.
- BN cũ có BHYT còn hạn.
- BN BHYT hết hạn.
- BN cấp cứu.
- BN ưu tiên.
- BN đặt lịch.
- BN thiếu CCCD có ghi chú định danh.
- BN dưới 16 tuổi có giám hộ.
- Chuyển khu B sang khu D.
- Hủy yêu cầu chuyển khu.
- Scan mã BN từ khu khác.
- Chọn dịch vụ khác khu.
- Chọn dịch vụ trùng.
- Hủy hồ sơ khi chưa thanh toán.
- Hủy hồ sơ khi đã thanh toán.
- Đổi phòng khi chưa thanh toán/chưa thực hiện.
- Đổi phòng sau thanh toán hoặc đã thực hiện.
- Dịch vụ đã thực hiện/có kết quả không được xóa thẳng.
