# Đối chiếu luồng tiếp đón - khám bệnh với HIS ISOFH

Ngày chuẩn bị: 05/06/2026  
Ngày báo cáo dự kiến: 06/06/2026  
Phạm vi rà soát: dự án hiện tại trong repo, tập trung màn hình **Tiếp đón**, **Danh sách tiếp đón**, **Khám bệnh bác sĩ**, **Chỉ định dịch vụ/DVKT**, **Thu ngân**, **Thực hiện DVKT**.

## 1. Kết luận nhanh để báo cáo

Hệ thống hiện tại của tôi đã mô phỏng được luồng ngoại trú cốt lõi của một HIS: từ tiếp nhận người bệnh, kiểm tra bệnh nhân cũ, tạo hồ sơ trong ngày, ghi sinh hiệu, phân khu/quầy tiếp đón, chọn dịch vụ/phòng, thanh toán, đưa vào hàng đợi khám, bác sĩ khám, chỉ định cận lâm sàng, nhận kết quả, kê đơn, kết luận và in giấy tờ.

Điểm nên nhấn mạnh khi trình bày không phải chỉ là "có form nhập bệnh nhân", mà là hệ thống đã có kiểm soát nghiệp vụ theo trạng thái. Đây là phần bệnh viện hay phản ánh nhất khi dùng phần mềm: người bệnh bị tạo trùng hồ sơ, đi sai khu/phòng, đã thanh toán nhưng vẫn bị hủy/chuyển sai, bác sĩ không thấy đúng hàng đợi, kết quả cận lâm sàng không quay về phòng khám, hoặc hồ sơ đã kết thúc nhưng vẫn bị sửa lung tung.

## 2. Luồng nghiệp vụ chính hiện tại

### 2.1. Tiếp đón người bệnh

Luồng hiện tại:

1. Nhân viên tiếp đón đăng nhập và vào màn hình tiếp đón.
2. Hệ thống kiểm tra bệnh nhân theo CCCD, số điện thoại, mã bệnh nhân, mã hồ sơ hoặc thông tin định danh.
3. Nếu bệnh nhân chưa có, hệ thống tạo mới bệnh nhân.
4. Nếu bệnh nhân đã có, hệ thống cập nhật thông tin và kiểm tra hồ sơ trong ngày.
5. Hệ thống chọn khu tiếp đón/quầy tiếp đón mặc định theo phân quyền người dùng.
6. Nhân viên nhập thông tin tiếp đón: nguồn tiếp nhận, loại khám, lý do khám, triệu chứng ban đầu, mức ưu tiên, đối tượng thanh toán, thông tin BHYT, thông tin sàng lọc nhanh.
7. Nhân viên nhập sinh hiệu: nhiệt độ, huyết áp, mạch, nhịp thở, SpO2, cân nặng, chiều cao, BMI, đau, dị ứng, bệnh nền, thai kỳ, triệu chứng nguy hiểm.
8. Hệ thống tạo hồ sơ bệnh án/lượt khám hoặc tái sử dụng hồ sơ active trong ngày.

Code đối chiếu:

- Backend: `TiepDonV2Controller` có API tra cứu bệnh nhân, danh mục khu/quầy, tạo/cập nhật bệnh nhân, lưu hồ sơ tiếp đón.
- Frontend: `TiepDon.jsx` gọi `lookupPatientV2`, `upsertPatientV2`, `saveEncounterV2`, `getReceptionAreasV2`.
- DTO: `ReceptionDtos.cs` có `PatientLookupRequest`, `PatientCreateRequest`, `ReceptionInfoDto`, `SinhHieuDto`, `ReceptionCreateRecordRequest`.

### 2.2. Chọn dịch vụ, phòng và thanh toán

Luồng hiện tại:

1. Sau tiếp đón, nhân viên chuyển sang đăng ký/chỉ định dịch vụ.
2. Hệ thống lấy danh mục dịch vụ theo khu tiếp đón, phòng, đối tượng thanh toán.
3. Nếu phòng chưa map khu hoặc phòng thuộc khu khác, hệ thống chặn.
4. Nếu chọn trùng dịch vụ trong cùng hồ sơ/lượt, hệ thống cảnh báo/chặn.
5. Hệ thống tính đơn giá theo phòng và đối tượng thanh toán.
6. Khi xác nhận dịch vụ, hồ sơ chuyển trạng thái chờ thanh toán hoặc chờ khám tùy cấu hình.
7. Thu ngân xác nhận thanh toán, in phiếu thu, sau đó người bệnh vào hàng đợi khám hoặc thực hiện dịch vụ.

Code đối chiếu:

- Backend: `ServiceRegistrationV2Controller` có API lấy tóm tắt hồ sơ, danh mục dịch vụ, lưu nháp, xác nhận dịch vụ, đổi phòng.
- Backend: `PricingService` ưu tiên giá theo phòng và đối tượng thanh toán.
- Backend: `HoaDonController` có tạo hóa đơn khám, CLS, thuốc và xác nhận thanh toán.
- Frontend: `TiepDonApi.js` có `getServiceCatalogV2`, `saveServiceOrderDraftV2`, `confirmServiceOrderV2`, `changeQueueRoomV2`.

### 2.3. Hàng đợi và khám bệnh bác sĩ

Luồng hiện tại:

1. Bác sĩ chọn phòng được phân công.
2. Hệ thống hiển thị danh sách chờ khám theo phòng.
3. Danh sách ưu tiên bệnh nhân cấp cứu/ưu tiên/VIP/hẹn trước trước bệnh nhân thường.
4. Bác sĩ bấm bắt đầu khám, lượt khám chuyển từ `CHO_KHAM` sang `DANG_KHAM`.
5. Bác sĩ xem thông tin bệnh nhân, hồ sơ, khu/quầy tiếp đón, phòng, sinh hiệu, bệnh sử và lịch sử khám.
6. Bác sĩ nhập chẩn đoán sơ bộ, chẩn đoán cuối, ICD/bệnh chính, bệnh kèm theo, kết quả khám, hướng xử trí.
7. Bác sĩ có thể chỉ định DVKT, kê đơn, in phiếu chỉ định, in đơn thuốc, in giấy hẹn/giấy kết luận/tóm tắt khám.
8. Khi kết thúc khám, hệ thống kiểm tra dữ liệu bắt buộc theo hướng xử trí: cho về, hẹn khám, nhập viện, chuyển viện, không khám.

Code đối chiếu:

- Backend: `LanKhamController` có API `cho-kham`, `hom-nay`, `da-kham`, `start`, cập nhật kết quả khám, in PDF, reopen, cancel.
- Frontend: `BacSi.jsx`, `PatientList.jsx`, `ResultForm.jsx` hiển thị danh sách, chi tiết khám, tab DVKT, đơn thuốc, giấy tờ.
- Backend: `KhamBenhAuditService` và `KhamBenhAuditLog` ghi log thao tác khám bệnh.

### 2.4. Cận lâm sàng và kết quả quay về bác sĩ

Luồng hiện tại:

1. Bác sĩ chỉ định DVKT/CLS.
2. Nhân viên thực hiện DVKT thấy danh sách pending/processing/done.
3. Nhân viên nhận chỉ định, nhập kết quả, nhập chỉ tiêu chi tiết, duyệt, gửi kết quả, hoàn thành.
4. Bác sĩ xem tổng hợp DVKT theo lượt khám và đánh dấu đã đọc kết quả.
5. Hệ thống có xuất PDF kết quả DVKT và phiếu chỉ định xét nghiệm.

Code đối chiếu:

- Backend: `ChiDinhDVKTController` có chỉ định, cập nhật, hủy, tổng hợp theo lượt khám, bác sĩ đọc kết quả.
- Backend: `ThucHienDVKTController` có pending/processing/done, nhận, nhập kết quả, duyệt, gửi, hoàn thành, PDF, log.
- Frontend: `ThucHienDVKT.jsx`, `ModalChiDinhDVKT.jsx`, `ResultForm.jsx`.

## 3. Nghiệp vụ xảy ra nhiều nhất và nên làm nổi bật

### 3.1. Tiếp đón bệnh nhân cũ/mới và chống trùng hồ sơ

Đây là nghiệp vụ xảy ra nhiều nhất ở quầy tiếp đón. Mỗi lượt bệnh nhân đến khám đều bắt đầu bằng tra cứu thông tin. Nếu hệ thống không kiểm soát tốt, bệnh viện dễ bị:

- Tạo trùng bệnh nhân do nhập sai số điện thoại/CCCD.
- Tạo nhiều hồ sơ trong cùng ngày cho một bệnh nhân.
- Hồ sơ cũ chưa xử lý xong nhưng vẫn tạo tiếp hồ sơ mới.
- Người bệnh quay lại hỏi nhưng nhân viên không biết đang ở trạng thái nào.

Phần mềm của tôi đã có:

- Tra cứu theo nhiều khóa định danh.
- Cảnh báo hồ sơ trong ngày.
- Chặn hồ sơ cũ chưa hoàn tất.
- Có idempotency key để hạn chế bấm lưu nhiều lần tạo trùng.
- Có trạng thái hồ sơ và timeline thao tác.

Khi demo: nhập CCCD/SĐT của bệnh nhân cũ, cho thấy hệ thống tự đổ thông tin và báo hồ sơ trong ngày nếu có.

### 3.2. Phân khu/quầy/phòng và tránh đi sai luồng

Đây là nghiệp vụ rất thực tế ở bệnh viện đông bệnh nhân. Nếu phân khu sai, người bệnh đến nhầm phòng, phiếu dịch vụ sai khu, hoặc nhân viên khu này xử lý nhầm hồ sơ khu khác.

Phần mềm của tôi đã có:

- Danh mục khu tiếp đón và quầy tiếp đón.
- Phân quyền người dùng theo khu.
- Hồ sơ lưu `id_khu_tiep_don`, `id_quay_tiep_don`.
- Dịch vụ/phòng bị chặn nếu không đúng khu.
- Có nghiệp vụ yêu cầu chuyển khu, nhận khu mới, hủy chuyển khu.

Khi demo: chọn khu/quầy, sau đó chọn dịch vụ/phòng cùng khu. Nếu có dữ liệu test, thử chọn dịch vụ/phòng khác khu để show thông báo chặn.

### 3.3. Thanh toán trước khi vào hàng đợi khám/thực hiện

Đây là điểm bệnh viện hay kiểm soát vì liên quan trực tiếp doanh thu, phiếu thu và công nợ. Lỗi thường gặp:

- Bệnh nhân đã chỉ định nhưng chưa thanh toán vẫn vào phòng.
- Đã thanh toán nhưng hủy hồ sơ làm lệch tiền.
- Dịch vụ đã thực hiện nhưng vẫn cho xóa/hủy trực tiếp.

Phần mềm của tôi đã có:

- Hóa đơn khám/CLS/thuốc.
- Xác nhận thanh toán theo hóa đơn.
- Chặn hủy/chuyển khu khi đã có hóa đơn đã thanh toán.
- Chặn đổi phòng/hủy dịch vụ khi đã thực hiện hoặc có kết quả.
- Tạo hàng đợi khám/dòng dịch vụ sau xác nhận tùy cấu hình.

Khi demo: tạo dịch vụ, chuyển sang thu ngân, xác nhận thanh toán, quay lại danh sách khám để thấy bệnh nhân vào hàng đợi.

### 3.4. Hàng đợi bác sĩ và ưu tiên cấp cứu

Đây là nghiệp vụ có tần suất cao ở phòng khám. Nếu hàng đợi sai, bác sĩ không thấy bệnh nhân hoặc thứ tự sai thì người dùng phản ánh ngay.

Phần mềm của tôi đã có:

- Danh sách chờ khám theo bác sĩ/phòng.
- Kiểm tra bác sĩ có được phân công phòng hay không.
- Sắp xếp ưu tiên: cấp cứu, ưu tiên/VIP/người già/trẻ em, hẹn trước, thường.
- Bác sĩ bắt đầu khám và hệ thống tự đổi trạng thái.

Khi demo: tạo một bệnh nhân thường và một bệnh nhân cấp cứu/ưu tiên, show danh sách bác sĩ sắp xếp STT khám.

### 3.5. Chỉ định cận lâm sàng và kết quả quay về phòng khám

Đây là điểm kết nối nhiều bộ phận: bác sĩ, thu ngân, phòng CLS, trả kết quả. Bệnh viện hay phản ánh nếu kết quả không quay về, thiếu trạng thái, hoặc bác sĩ không biết kết quả đã có.

Phần mềm của tôi đã có:

- Bác sĩ chỉ định DVKT.
- Nhân viên DVKT nhận, xử lý, nhập/duyệt/gửi/hoàn thành kết quả.
- Bác sĩ xem tổng hợp DVKT và đánh dấu đã đọc.
- In phiếu chỉ định và PDF kết quả.

Khi demo: từ màn hình bác sĩ tạo chỉ định, qua màn hình thực hiện DVKT nhập kết quả, quay lại bác sĩ xem kết quả.

### 3.6. Kết luận khám, giấy tờ và audit

Đây là phần nên show cuối cùng để chứng minh hồ sơ có đầu ra rõ ràng.

Phần mềm của tôi đã có:

- Kết luận cho về, hẹn khám lại, nhập viện, chuyển viện, không khám.
- Ràng buộc dữ liệu bắt buộc theo từng hướng xử trí.
- In giấy hẹn khám lại, giấy kết luận, phiếu chỉ định xét nghiệm, tóm tắt khám, đơn thuốc.
- Reopen hồ sơ khi cần chỉnh sửa sau khi kết luận.
- Audit log khám bệnh.

Khi demo: chọn hướng xử trí "Hẹn khám", show hệ thống bắt ngày hẹn/phòng hẹn/chẩn đoán, sau đó in giấy hẹn.

## 4. State machine hồ sơ hiện tại

Hệ thống hiện dùng các trạng thái chuẩn:

| Nhóm | Trạng thái |
| --- | --- |
| Tiếp đón | `MOI_TAO`, `DA_TIEP_DON`, `CHO_DICH_VU`, `DICH_VU_NHAP` |
| Thanh toán | `CHO_THANH_TOAN`, `DA_THANH_TOAN` |
| Chuyển khu | `CHO_CHUYEN_KHU`, `DA_NHAN_KHU_MOI`, `HUY_CHUYEN_KHU` |
| Khám bệnh | `CHO_KHAM`, `DANG_KHAM`, `CHO_CAN_LAM_SANG`, `CHO_KET_QUA`, `CHO_KET_LUAN`, `DA_KHAM` |
| Kết thúc | `DA_DONG`, `DA_HUY` |

Ý nghĩa khi trình bày: trạng thái giúp các bộ phận không xử lý chồng chéo. Tiếp đón biết hồ sơ đã tới đâu, thu ngân biết phiếu nào cần thu, bác sĩ biết bệnh nhân nào chờ khám, CLS biết chỉ định nào cần thực hiện.

## 5. Đối chiếu với HIS ISOFH/Sakura

Theo thông tin công khai, giải pháp quản lý bệnh viện Sakura của ISOFH hướng tới nền tảng tích hợp nhiều phân hệ, dùng trục dữ liệu chung để kết nối các hệ thống/phân hệ. ISOFH mô tả Sakura số hóa toàn bộ quy trình từ tiếp đón, xếp hàng lấy số, ký số, khám bệnh, xét nghiệm, chẩn đoán hình ảnh, thu ngân, bán thuốc/nhà thuốc và báo cáo. Các bài viết gần đây của ISOFH cũng nhấn mạnh QMS/hàng đợi, điều phối nội viện theo thời gian thực, dữ liệu vận hành, giảm thời gian chờ và giảm nhập liệu thủ công.

| Nhóm nghiệp vụ | HIS ISOFH/Sakura theo nguồn công khai | Phần mềm của tôi hiện có | Mức độ |
| --- | --- | --- | --- |
| Tiếp đón | Có tiếp đón, xếp hàng lấy số, số hóa quy trình khám chữa bệnh | Có tra cứu BN, tạo/cập nhật BN, tạo hồ sơ, khu/quầy, sinh hiệu, trạng thái | Đạt mức mô phỏng tốt |
| QMS/hàng đợi | Có định hướng QMS, theo dõi mật độ/chờ theo thời gian thực | Có hàng đợi bác sĩ theo phòng và ưu tiên khám; chưa có kiosk/màn hình gọi số real-time | Đạt lõi nghiệp vụ, thiếu QMS đầy đủ |
| Phân khu/điều phối | ISOFH nhấn mạnh điều phối nội viện, nhận diện điểm nóng, tối ưu công suất | Có khu/quầy, phân quyền khu, chuyển khu, chặn sai khu/phòng | Điểm mạnh để show |
| Thu ngân | Có thu ngân, thanh toán điện tử/viện phí trong hệ sinh thái | Có hóa đơn khám/CLS/thuốc, xác nhận thanh toán, phiếu thu | Đạt mô phỏng nghiệp vụ chính |
| Khám bệnh | Có khám bệnh, hồ sơ chuyên môn | Có danh sách chờ khám, bắt đầu khám, chẩn đoán, ICD, hướng xử trí, in giấy tờ | Đạt tốt trong phạm vi ngoại trú |
| CLS/LIS/PACS | Có xét nghiệm, chẩn đoán hình ảnh trong chuỗi Sakura | Có DVKT/CLS ở mức mô phỏng: nhận, nhập kết quả, duyệt, gửi, PDF | Đạt mô phỏng, chưa tích hợp máy/LIS/PACS thật |
| Đơn thuốc/nhà thuốc | Có bán thuốc/nhà thuốc | Có kê đơn, in đơn, hóa đơn thuốc; mức nhà thuốc còn mô phỏng | Đạt cơ bản |
| Báo cáo | ISOFH nhấn mạnh báo cáo dịch vụ/phòng khám, số liệu vận hành | Có thống kê tiếp đón, export CSV, một số báo cáo/hóa đơn/PDF | Đạt cơ bản, nên nói là chưa phải BI |
| Ký số/EMR | Có bài công bố thao tác ký số người bệnh qua VNeID và bệnh án điện tử | Có lưu giấy tờ, ký bác sĩ mức mô phỏng; chưa có ký số VNeID/EMR chuẩn | Chưa đạt, nêu là hướng phát triển |
| AI/sinh hiệu tự động | ISOFH công bố hướng trích xuất sinh hiệu tự động bằng AI | Có nhập sinh hiệu thủ công, BMI tự tính | Chưa có AI, nhưng có nền dữ liệu sinh hiệu |

## 6. Những điểm nên show trong buổi báo cáo

### Demo 1: Tiếp đón bệnh nhân cũ và chống trùng

Mục tiêu: chứng minh hệ thống xử lý nghiệp vụ đông nhất ở quầy.

Kịch bản:

1. Nhập CCCD/SĐT bệnh nhân cũ.
2. Hệ thống tự nhận diện và đổ thông tin.
3. Nếu đã có hồ sơ trong ngày, hệ thống cảnh báo.
4. Nếu chưa có, tạo hồ sơ mới.
5. Nhập sinh hiệu và thông tin tiếp đón.

Câu nói khi báo cáo: "Ở bệnh viện, lỗi trùng hồ sơ và tạo nhiều lượt trong ngày rất dễ xảy ra, nên em thiết kế bước tra cứu trước khi tạo mới và kiểm soát trạng thái hồ sơ trong ngày."

### Demo 2: Khu/quầy, chọn dịch vụ đúng khu và thanh toán

Mục tiêu: show phần dễ bị bệnh viện phản ánh nhất ở khu tiếp đón.

Kịch bản:

1. Chọn khu/quầy tiếp đón.
2. Chọn dịch vụ/phòng đúng khu.
3. Xác nhận chỉ định dịch vụ.
4. Qua thu ngân xác nhận thanh toán.
5. Hệ thống chuyển hồ sơ sang chờ khám.

Câu nói khi báo cáo: "Em không để hồ sơ chỉ là một dòng dữ liệu rời rạc, mà gắn hồ sơ với khu, quầy, phòng, dịch vụ và hóa đơn để hạn chế đi sai luồng."

### Demo 3: Hàng đợi bác sĩ và ưu tiên

Mục tiêu: chứng minh luồng tiếp đón kết nối được tới phòng khám.

Kịch bản:

1. Bác sĩ chọn phòng.
2. Xem danh sách chờ khám.
3. Bệnh nhân ưu tiên/cấp cứu được xếp trước.
4. Bác sĩ bấm bắt đầu khám.
5. Trạng thái chuyển sang đang khám.

Câu nói khi báo cáo: "Điểm quan trọng là dữ liệu từ tiếp đón không dừng lại ở quầy, mà đi tiếp sang hàng đợi phòng khám."

### Demo 4: Bác sĩ chỉ định CLS và kết quả quay về

Mục tiêu: show liên thông giữa bác sĩ và bộ phận cận lâm sàng.

Kịch bản:

1. Bác sĩ thêm chỉ định DVKT/CLS.
2. Nhân viên DVKT nhận chỉ định.
3. Nhập/duyệt/gửi kết quả.
4. Bác sĩ xem kết quả trong màn hình khám.
5. In phiếu chỉ định hoặc PDF kết quả.

Câu nói khi báo cáo: "Đây là luồng liên phòng ban: bác sĩ, thu ngân, bộ phận thực hiện và bác sĩ kết luận đều dùng chung một lượt khám."

### Demo 5: Kết luận khám và in giấy tờ

Mục tiêu: show đầu ra cuối cùng của hồ sơ.

Kịch bản:

1. Nhập chẩn đoán cuối và ICD.
2. Chọn hướng xử trí: cho về/hẹn khám/nhập viện/chuyển viện.
3. Hệ thống bắt các trường cần thiết theo từng hướng.
4. In giấy kết luận hoặc giấy hẹn.

Câu nói khi báo cáo: "Em có tách ràng buộc theo từng hướng xử trí để tránh hồ sơ kết thúc thiếu thông tin chuyên môn."

## 7. Điểm mạnh của dự án hiện tại

- Luồng ngoại trú đi được xuyên suốt từ tiếp đón tới khám bệnh, CLS, thu ngân, đơn thuốc và giấy tờ.
- Có state machine hồ sơ, không chỉ CRUD đơn giản.
- Có khu/quầy tiếp đón, phân quyền theo khu và chuyển khu.
- Có kiểm soát nghiệp vụ chống trùng hồ sơ, hồ sơ active trong ngày, dịch vụ sai khu, phòng sai khu, hóa đơn đã thanh toán.
- Có audit/timeline cho tiếp đón và khám bệnh.
- Có in PDF nhiều giấy tờ phục vụ báo cáo/demonstration.
- Có export danh sách tiếp đón và thống kê nhanh.

## 8. Hạn chế nên nói trước để tránh bị hỏi khó

- Chưa có kiosk lấy số, gọi số, màn hình QMS real-time như hệ thống HIS lớn.
- Chưa tích hợp BHYT thật, VNeID, ký số người bệnh, hóa đơn điện tử thật.
- Chưa tích hợp LIS/PACS/máy xét nghiệm/chẩn đoán hình ảnh thật.
- Chưa có dashboard điều hành theo thời gian thực cấp bệnh viện.
- Một số chuỗi tiếng Việt trong code/tài liệu có dấu hiệu lỗi encoding, nên khi demo cần chọn màn hình đang hiển thị tốt.
- Đây là hệ thống mô phỏng phục vụ báo cáo thực tập/đồ án, không phải HIS triển khai production.

## 9. Cách trả lời nếu giảng viên hỏi "so với HIS ISOFH thì khác gì?"

Có thể trả lời:

"HIS ISOFH/Sakura là hệ thống bệnh viện tổng thể, có nhiều phân hệ và tích hợp sâu với vận hành thực tế như QMS, ký số, thanh toán, EMR, điều phối nội viện, báo cáo và có thể kết nối các hệ thống khác. Phần mềm của em không đặt mục tiêu thay thế HIS thật, mà mô phỏng luồng ngoại trú trọng tâm. Em chọn làm sâu các nghiệp vụ hay phát sinh nhất: tiếp đón, chống trùng hồ sơ, quản lý trạng thái, khu/quầy/phòng, thanh toán, hàng đợi bác sĩ, chỉ định cận lâm sàng và kết luận khám. Vì vậy, điểm giống là cùng đi theo mạch tiếp đón - khám - CLS - thu ngân - thuốc/giấy tờ; điểm khác là hệ thống của em ở mức mô phỏng, chưa có tích hợp production như kiosk, QMS real-time, BHYT, ký số VNeID, LIS/PACS."

## 10. Checklist chuẩn bị trước khi demo

- Chuẩn bị sẵn ít nhất 2 bệnh nhân test: một bệnh nhân mới, một bệnh nhân cũ.
- Chuẩn bị một bệnh nhân có mức ưu tiên/cấp cứu để show xếp hàng.
- Chuẩn bị danh mục khu/quầy/phòng/dịch vụ có dữ liệu đúng khu.
- Chuẩn bị một dịch vụ có giá để tránh lỗi không tìm thấy đơn giá.
- Chuẩn bị tài khoản tiếp đón, thu ngân, bác sĩ, nhân viên DVKT.
- Đăng nhập thử từng tài khoản trước khi báo cáo.
- Tạo thử một luồng hoàn chỉnh trước: tiếp đón -> dịch vụ -> thanh toán -> bác sĩ -> CLS -> kết luận.
- Nếu API HTTPS lỗi chứng chỉ, mở sẵn backend/frontend và test trước trên trình duyệt.
- Tránh demo phần chưa chắc dữ liệu như BHYT thật, ký số VNeID, kiosk/QMS.

## 11. Nguồn đối chiếu HIS ISOFH

- Trang chủ ISOFH: https://isofh.com/  
  Nội dung dùng để đối chiếu: ISOFH giới thiệu triển khai số hóa tổng thể, kết nối từ tiếp đón, khám chữa bệnh đến viện phí; nhấn mạnh tối ưu vận hành và trải nghiệm phần mềm cho bác sĩ/nhân viên y tế.

- Bài ra mắt giải pháp quản lý bệnh viện Sakura của ISOFH: https://isofh.com/tin-tuc/%3Cp-style%3Dtext-align-center%3E%3Cstrong%3Enbspisofh-20211103095608965.html  
  Nội dung dùng để đối chiếu: Sakura được mô tả là nền tảng tích hợp nhiều phân hệ qua trục dữ liệu chung, số hóa quy trình từ tiếp đón, xếp hàng lấy số, ký số, khám bệnh, xét nghiệm, chẩn đoán hình ảnh, thu ngân, bán thuốc/nhà thuốc và báo cáo.

- Bài ISOFH về IVI HosMap 3D tích hợp QMS, đăng 28/04/2026: https://isofh.com/tin-tuc/ivi%2Bhosmap%2B3d%2Btich%2Bhop%2Bqms%2Bgiai%2Bphap%2Bdieu%2Bphoi%2Bno%2B20260428104810209.ivi  
  Nội dung dùng để đối chiếu: QMS theo dõi mật độ bệnh nhân, trạng thái phòng khám theo thời gian thực, nhận diện ùn tắc, tối ưu công suất và phân bổ nhân sự.

- Bài ISOFH về chữ ký số người bệnh qua VNeID, đăng 12/06/2025: https://isofh.com/tin-tuc/isofh%2Btrien%2Bkhai%2Bchu%2Bky%2Bso%2Bnguoi%2Bbenh%2Bcho%2Bbenh%2Bvie%2B20250612034818590.ivi  
  Nội dung dùng để đối chiếu: quy trình ký số ở màn hình đợi khám/đã khám/thu ngân/thanh toán, bảng kê KCB và bệnh án điện tử.

- Bài ISOFH về AI trích xuất sinh hiệu tự động, đăng 14/05/2026: https://isofh.com/tin-tuc/isofh%2Bphat%2Btrien%2Btinh%2Bnang%2Bai%2B%E2%80%9Ctrich%2Bxuat%2Bsinh%2Bhie%2B20260514032735735.ivi  
  Nội dung dùng để đối chiếu: hướng giảm nhập liệu thủ công sinh hiệu bằng AI, chuẩn hóa dữ liệu đầu vào.

- Sàn Giao dịch Công nghệ TP.HCM về phần mềm quản lý bệnh viện ISOFH: https://techport.vn/2-cong-nghe-thiet-bi/1/pha-n-me-m-qua-n-ly-be-nh-vie-n-isofh-14091.html  
  Nội dung dùng để đối chiếu: hệ thống ISOFH gồm nhiều nhóm phần mềm/phân hệ, quản lý chuyên môn khám chữa bệnh, hành chính, nhân sự, tài chính, kho, vật tư y tế, dược.

