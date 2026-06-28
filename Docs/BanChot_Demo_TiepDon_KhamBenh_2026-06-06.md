# Bản chốt demo tiếp đón - khám bệnh

Ngày chuẩn bị: 05/06/2026  
Ngày báo cáo: 06/06/2026  
Phạm vi: đối chiếu phần mềm mô phỏng hiện tại với luồng HIS/SAKURA ISOFH ở nhóm nghiệp vụ ngoại trú: tiếp đón, đăng ký dịch vụ, thu ngân, khám bệnh, CLS/DVKT, kết luận và in giấy tờ.

## 1. Câu chốt mở đầu khi báo cáo

Phần mềm của em mô phỏng luồng ngoại trú trọng tâm của HIS: tiếp nhận người bệnh, kiểm tra bệnh nhân cũ, tạo hồ sơ trong ngày, ghi sinh hiệu, phân khu/quầy, chọn dịch vụ/phòng, thanh toán, đưa vào hàng đợi bác sĩ, khám bệnh, chỉ định cận lâm sàng, nhận kết quả, kê đơn, kết luận và in giấy tờ.

Điểm em muốn nhấn mạnh không phải là một form nhập liệu đơn giản, mà là hệ thống có kiểm soát nghiệp vụ bằng trạng thái hồ sơ. Đây là phần bệnh viện hay phát sinh phản ánh nhất: trùng mã hồ sơ, tiếp đón sai khu, sai phòng khám, sai giá thanh toán, bệnh nhân chưa thanh toán nhưng đã vào luồng khám, kết quả LIS/PACS không quay về, phiếu in thiếu thông tin, hoặc hồ sơ đã kết thúc vẫn bị sửa không kiểm soát.

## 2. Nghiệp vụ xảy ra nhiều nhất và nên show nhất

### 2.1. Tiếp đón bệnh nhân cũ/mới và chống trùng hồ sơ

Đây là nghiệp vụ xảy ra nhiều nhất vì mọi lượt khám đều bắt đầu từ quầy tiếp đón. Theo biên bản nghiệm thu tháng 07/2025 và 08/2025, các lỗi thực tế từng phát sinh gồm: thẻ/scan không đổ đúng thông tin người bệnh, phát sinh nhiều mã hồ sơ cho cùng một người bệnh, mã hồ sơ tái khám không đồng bộ, hồ sơ đã ở khu khác nên không thể tiếp đón tại khu hiện tại.

Phần mềm hiện tại có:

- Tra cứu bệnh nhân theo nhiều khóa định danh.
- Tạo/cập nhật bệnh nhân nhưng chặn trùng CCCD/SĐT.
- Khi lưu tiếp đón, kiểm tra hồ sơ hoạt động trong ngày và trả lỗi nếu bệnh nhân đã có hồ sơ active.
- Nếu bệnh nhân đã khám xong trong ngày mà muốn tạo lượt mới, hệ thống bắt nhập lý do tạo thêm lượt.
- Có `idempotency key` để hạn chế bấm lưu nhiều lần tạo trùng.

Code đối chiếu:

- `TiepDonV2Controller.LookupPatient`: tra cứu bệnh nhân và trả hồ sơ trong ngày.
- `TiepDonV2Controller.UpsertPatient`: kiểm tra trùng CCCD/SĐT.
- `TiepDonV2Controller.SaveEncounter`: kiểm tra active record trong ngày, lý do tạo thêm lượt, idempotency.
- `HoSoTrangThaiService`: định nghĩa trạng thái hồ sơ active/đóng/hủy.

Kịch bản demo:

1. Nhập CCCD/SĐT bệnh nhân cũ.
2. Cho thấy hệ thống tự nhận diện bệnh nhân và hiển thị hồ sơ trong ngày nếu có.
3. Thử lưu tiếp đón khi đã có hồ sơ active để thấy hệ thống chặn.
4. Tạo bệnh nhân mới và lưu hồ sơ tiếp đón thành công.

Câu nói nên dùng: "Ở bệnh viện, lỗi trùng hồ sơ rất dễ phát sinh do người bệnh quay lại nhiều lần hoặc tiếp đón ở nhiều khu. Vì vậy em đặt bước tra cứu và kiểm tra hồ sơ active trong ngày trước khi cho tạo lượt mới."

### 2.2. Phân khu/quầy/phòng và tránh đi sai luồng

Đây là điểm rất giống tình huống thực tế ở Chợ Rẫy/SAKURA: hồ sơ khu B muốn chuyển sang Khám Bệnh II, khu khác hủy tiếp đón nhưng khu hiện tại vẫn bị ảnh hưởng, hoặc chỉ định phòng khám in/hiển thị sai phòng.

Phần mềm hiện tại có:

- Danh mục khu tiếp đón, quầy tiếp đón.
- Phân quyền người dùng theo khu.
- Hồ sơ lưu `IdKhuTiepDon`, `IdQuayTiepDon`.
- Dịch vụ/phòng phải thuộc đúng khu của hồ sơ.
- Có yêu cầu chuyển khu, nhận khu mới, hủy chuyển khu, bắt nhập lý do.
- Đổi phòng phải nhập lý do và bị chặn nếu không đúng khu hoặc đã thanh toán/thực hiện.

Code đối chiếu:

- `TiepDonV2Controller.GetReceptionAreas`: lấy khu/quầy theo phân quyền.
- `TiepDonV2Controller.RequestAreaTransfer`: yêu cầu chuyển khu và ghi trạng thái.
- `ServiceRegistrationV2Controller.GetServiceCatalog`: dịch vụ/phòng khác khu bị disable.
- `ServiceRegistrationV2Controller.SaveOrderInternal`: backend chặn dịch vụ/phòng sai khu.
- `ServiceRegistrationV2Controller.ChangeQueueRoom`: đổi phòng có lý do, kiểm tra trạng thái.

Kịch bản demo:

1. Chọn khu/quầy tiếp đón.
2. Sang chọn dịch vụ, show danh sách phòng/dịch vụ đúng khu.
3. Nếu có dữ liệu test, chọn dịch vụ thuộc khu khác để show cảnh báo/chặn.
4. Demo chuyển khu hoặc đổi phòng có bắt lý do.

Câu nói nên dùng: "Em gắn hồ sơ với khu, quầy, phòng và dịch vụ để tránh tình trạng người bệnh đi sai khu hoặc nhân viên khu này xử lý nhầm hồ sơ của khu khác."

### 2.3. Thanh toán trước khi vào hàng đợi khám

Đây là nhóm nghiệp vụ bệnh viện rất nhạy vì liên quan doanh thu, hoàn/hủy dịch vụ, phiếu thu và BHYT. Biên bản có nhiều lỗi thực tế: sai giá do loại hình thanh toán, BHYT chi trả không đúng, hủy dịch vụ sau ứng tiền/thanh toán, người bệnh chưa hoàn tất thanh toán nhưng không duyệt được BHYT.

Phần mềm hiện tại có:

- Phiếu dịch vụ/hóa đơn đăng ký dịch vụ.
- Trạng thái `CHO_THANH_TOAN`, `DA_THANH_TOAN`.
- Xác nhận thanh toán từ thu ngân.
- Sau thanh toán, hệ thống tạo hàng đợi khám theo phòng.
- Nếu phiếu đã thanh toán thì không cho sửa trực tiếp.
- Khi thanh toán, backend kiểm tra lại dịch vụ/phòng có đúng khu trước khi tạo hàng đợi.

Code đối chiếu:

- `ServiceRegistrationV2Controller.SaveOrderInternal`: tạo phiếu dịch vụ, tính tiền, chuyển trạng thái chờ thanh toán/chờ khám.
- `HoaDonController.ConfirmPaymentCoreAsync`: xác nhận thanh toán.
- `HoaDonController.CompleteServiceOrderAfterPaymentAsync`: sau thanh toán tạo hàng đợi khám.
- `PricingService`: lấy đơn giá theo dịch vụ/phòng/đối tượng thanh toán.

Kịch bản demo:

1. Tạo phiếu dịch vụ từ màn hình tiếp đón.
2. Qua màn hình thu ngân, xác nhận thanh toán.
3. Quay sang bác sĩ, thấy bệnh nhân nằm trong hàng đợi phòng khám.

Câu nói nên dùng: "Luồng này giúp tránh trường hợp bệnh nhân chưa thanh toán nhưng đã vào phòng khám, hoặc phiếu đã thanh toán vẫn bị sửa/hủy làm lệch số liệu."

### 2.4. Hàng đợi bác sĩ và ưu tiên cấp cứu

Đây là nghiệp vụ xuất hiện liên tục trong ngày ở phòng khám. Biên bản có phản ánh số ưu tiên chỉ có hiệu lực ở một phòng, khi chuyển phòng thì không còn hiệu lực. Vì vậy lúc báo cáo nên nhấn mạnh hệ thống có lưu mức ưu tiên và sắp xếp danh sách chờ khám.

Phần mềm hiện tại có:

- Danh sách chờ khám theo bác sĩ/phòng.
- Kiểm tra bác sĩ có được phân công phòng hay không.
- Bắt đầu khám chuyển trạng thái từ `CHO_KHAM` sang `DANG_KHAM`.
- Hàng đợi có ưu tiên cấp cứu, ưu tiên, VIP, hẹn trước.

Code đối chiếu:

- `LanKhamController.GetChoKham`: lấy danh sách chờ khám theo phòng và bác sĩ.
- `LanKhamController.StartKham`: bác sĩ bắt đầu khám, khóa người phụ trách và chuyển trạng thái.
- `LanKhamController.GetHomNay`: danh sách trong ngày theo phòng.
- Frontend `PatientList.jsx`, `BacSi.jsx`: hiển thị danh sách người bệnh cho bác sĩ.

Kịch bản demo:

1. Tạo một bệnh nhân thường.
2. Tạo một bệnh nhân cấp cứu/ưu tiên.
3. Vào màn hình bác sĩ, chọn phòng và xem thứ tự hàng đợi.
4. Bấm bắt đầu khám để thấy trạng thái chuyển sang đang khám.

Câu nói nên dùng: "Dữ liệu từ tiếp đón không dừng ở quầy mà đi tiếp sang hàng đợi bác sĩ, nên bác sĩ nhìn được đúng bệnh nhân của phòng mình."

### 2.5. Chỉ định CLS/DVKT và kết quả quay về bác sĩ

Đây là nghiệp vụ bệnh viện hay phản ánh vì liên quan nhiều bộ phận: bác sĩ, thu ngân, xét nghiệm/CĐHA, LIS/PACS và kết quả quay về HIS. Biên bản tháng 07/2025 ghi nhiều lỗi LIS không trả kết quả, PACS tiếp nhận nhưng không trả kết quả, chỉ định xét nghiệm in sai phòng, biểu đồ xét nghiệm không hiển thị đúng.

Phần mềm hiện tại có:

- Bác sĩ chỉ định DVKT/CLS.
- Nhân viên DVKT nhận, nhập kết quả, duyệt, gửi, hoàn thành.
- Bác sĩ xem tổng hợp DVKT theo lượt khám.
- Có đánh dấu bác sĩ đã đọc kết quả.
- Có PDF kết quả DVKT và phiếu chỉ định.
- Khi còn CLS đang chờ/đang thực hiện, bác sĩ chưa được kết luận khám.

Code đối chiếu:

- `ChiDinhDVKTController`: tạo/cập nhật/hủy/tổng hợp chỉ định DVKT.
- `ThucHienDVKTController`: pending/processing/done, nhập/duyệt/gửi/hoàn thành kết quả.
- `LanKhamController.UpdateKetQua`: chặn kết luận nếu còn CLS pending/processing.
- Frontend `ResultForm.jsx`: tab DVKT, xem kết quả, đánh dấu đã đọc, in phiếu/PDF.

Kịch bản demo:

1. Bác sĩ thêm chỉ định DVKT.
2. Qua màn hình thực hiện DVKT, nhận và nhập kết quả.
3. Quay lại bác sĩ, xem kết quả và đánh dấu đã đọc.
4. Thử kết luận khi CLS chưa xong để show hệ thống chặn.

Câu nói nên dùng: "Đây là luồng liên phòng ban. Một chỉ định của bác sĩ đi sang bộ phận thực hiện, có trạng thái xử lý, rồi kết quả quay lại để bác sĩ kết luận."

### 2.6. Kết luận khám, giấy tờ và khóa hồ sơ

Đây là phần nên show cuối cùng để chứng minh hồ sơ có đầu ra. Biên bản có nhiều phản ánh về in phiếu, đơn thuốc, toa tổng, chữ ký, thiếu chỉ định phòng, thiếu ngày sinh. Vì vậy lúc demo nên chọn các phiếu đang hiển thị ổn.

Phần mềm hiện tại có:

- Nhập kết quả khám, chẩn đoán, ICD, bệnh kèm theo, hướng xử trí.
- Kết luận cho về, hẹn khám, chuyển viện, nhập viện, không khám.
- Bắt thông tin bắt buộc theo hướng xử trí.
- Không cho kết luận nếu còn CLS chưa hoàn thành.
- In giấy hẹn, giấy kết luận, tóm tắt khám, phiếu chỉ định xét nghiệm/DVKT, đơn thuốc.
- Mở lại hồ sơ phải nhập lý do và có audit log.

Code đối chiếu:

- `LanKhamController.UpdateKetQua`: validate kết quả khám, hướng xử trí, sinh hiệu, CLS.
- `LanKhamController.Reopen`: mở lại hồ sơ có lý do.
- `KhamBenhAuditService`: ghi log thao tác khám.
- Frontend `ResultForm.jsx`: lưu kết luận, khóa/mở lại, in giấy tờ.

Kịch bản demo:

1. Nhập kết quả khám, chẩn đoán cuối, ICD.
2. Chọn hướng xử trí "Hẹn khám".
3. Show hệ thống bắt giấy hẹn/ngày hẹn/phòng hẹn.
4. In giấy hẹn hoặc giấy kết luận.

Câu nói nên dùng: "Em có ràng buộc theo từng hướng xử trí để hồ sơ kết thúc không bị thiếu dữ liệu chuyên môn."

## 3. Bảng đối chiếu phần mềm của em với HIS ISOFH/SAKURA

| Nhóm nghiệp vụ | HIS ISOFH/SAKURA theo nguồn công khai | Phần mềm hiện tại của em | Mức độ nên trình bày |
| --- | --- | --- | --- |
| Tiếp đón | Có tiếp đón, xếp hàng lấy số, số hóa quy trình khám chữa bệnh | Có tra cứu bệnh nhân, tạo/cập nhật bệnh nhân, tạo hồ sơ, sinh hiệu, khu/quầy, trạng thái | Mạnh, nên show đầu tiên |
| Kiosk/QMS | Có kiosk lấy số, phân luồng, QMS và điều phối theo thời gian thực | Có hàng đợi bác sĩ và ưu tiên, chưa có kiosk/gọi số real-time | Nói là đạt lõi nghiệp vụ, chưa phải QMS đầy đủ |
| Phân khu/điều phối | ISOFH nhấn mạnh điều phối nội viện, trạng thái phòng khám, mật độ bệnh nhân | Có khu/quầy, phân quyền khu, chuyển khu, chặn dịch vụ/phòng sai khu | Rất nên show vì bám phản ánh thực tế |
| Thu ngân | Có thu ngân, viện phí, thanh toán trong hệ sinh thái HIS | Có phiếu dịch vụ/hóa đơn, xác nhận thanh toán, tạo hàng đợi sau thanh toán | Nên show nối tiếp tiếp đón |
| Khám bệnh | Có hồ sơ chuyên môn, bác sĩ khám, chỉ định, kết luận | Có hàng đợi, bắt đầu khám, chẩn đoán, ICD, hướng xử trí, khóa/mở hồ sơ | Mạnh |
| CLS/LIS/PACS | Có xét nghiệm, CĐHA/PACS trong chuỗi HIS | Có DVKT mô phỏng: nhận, nhập, duyệt, gửi, hoàn thành, PDF | Nói rõ chưa tích hợp máy/LIS/PACS thật |
| Đơn thuốc/nhà thuốc | Có bán thuốc/nhà thuốc | Có kê đơn, in đơn, hóa đơn thuốc mức mô phỏng | Có thể show phụ nếu còn thời gian |
| Báo cáo | Có báo cáo dịch vụ/phòng khám và dữ liệu vận hành | Có thống kê, export, giấy tờ/PDF; chưa phải BI | Nói là hướng phát triển |
| Ký số/EMR | ISOFH có hướng bệnh án điện tử/ký số, gồm VNeID trong bài công bố | Có giấy tờ và chữ ký mô phỏng, chưa có ký số VNeID/EMR chuẩn | Không demo như chức năng chính |
| AI sinh hiệu | ISOFH công bố AI trích xuất sinh hiệu tự động | Có nhập sinh hiệu thủ công, BMI tự tính | Nói là chưa có AI, nhưng có nền dữ liệu sinh hiệu |

## 4. Thứ tự demo gọn trong 10-15 phút

1. Tiếp đón bệnh nhân: tra cứu bệnh nhân cũ, tạo bệnh nhân mới, nhập sinh hiệu, chọn khu/quầy.
2. Chống lỗi thực tế: thử tạo hồ sơ trùng trong ngày hoặc hồ sơ khác khu để show hệ thống cảnh báo.
3. Đăng ký dịch vụ: chọn phòng/dịch vụ đúng khu, show dịch vụ sai khu bị chặn nếu có dữ liệu.
4. Thu ngân: xác nhận thanh toán phiếu dịch vụ, quay lại thấy hàng đợi được tạo.
5. Bác sĩ: xem danh sách chờ khám, bắt đầu khám, nhập chẩn đoán.
6. CLS/DVKT: chỉ định, nhập kết quả, bác sĩ xem lại kết quả.
7. Kết luận: chọn hướng xử trí, in giấy hẹn/giấy kết luận.

Nếu thời gian rất ngắn, chỉ cần show 4 phần: tiếp đón chống trùng, đúng khu/phòng, thanh toán tạo hàng đợi, bác sĩ kết luận có CLS.

## 5. Những lỗi thực tế trong biên bản đã được phần mềm mô phỏng xử lý một phần

| Lỗi/phản ánh thực tế trong biên bản tháng 07/08 | Phần mềm hiện tại xử lý bằng gì | Nên nói sao |
| --- | --- | --- |
| Tiếp đón khác khu, phải liên hệ khu cũ hủy tiếp đón | Khu/quầy trên hồ sơ, chuyển khu có lý do, chặn active encounter khác khu | Em có mô phỏng bài toán phân khu và tránh tiếp đón chồng chéo |
| Phát sinh nhiều mã hồ sơ cho cùng người bệnh | Chặn hồ sơ active trong ngày, lý do tạo thêm lượt, idempotency key | Đây là nghiệp vụ em ưu tiên vì xảy ra nhiều ở quầy |
| Sai phòng khám/sai khu khi chỉ định | Catalog disable dịch vụ sai khu, backend chặn service area mismatch | Em kiểm soát cả UI và backend |
| Sai giá loại hình thanh toán/BHYT | Pricing theo dịch vụ/phòng/đối tượng thanh toán ở mức mô phỏng | Chưa tích hợp BHYT thật, nhưng có nền đối tượng thanh toán |
| Hủy dịch vụ khi đã ứng tiền/thanh toán | Phiếu đã thanh toán không cho sửa trực tiếp; guard khi hủy/chuyển khu | Em có ràng buộc sau thanh toán để tránh lệch tiền |
| LIS/PACS không trả kết quả | DVKT có trạng thái nhận, nhập, duyệt, gửi, hoàn thành; bác sĩ xem kết quả | Chưa tích hợp LIS/PACS thật, nhưng mô phỏng vòng đời kết quả |
| In phiếu/đơn thuốc thiếu thông tin | Có PDF giấy hẹn, giấy kết luận, tóm tắt, phiếu chỉ định, đơn thuốc | Khi demo chọn phiếu đã test ổn |
| Kết thúc khám thiếu dữ liệu | Validate kết luận, hướng xử trí, sinh hiệu, CLS chưa xong | Em không cho đóng hồ sơ khi còn thiếu dữ liệu quan trọng |

## 6. Hạn chế nên chủ động nói trước

- Hệ thống là mô phỏng phục vụ báo cáo/đồ án, chưa phải HIS production.
- Chưa có kiosk lấy số, gọi số và QMS real-time đầy đủ.
- Chưa tích hợp BHYT thật, VNeID, ký số người bệnh, hóa đơn điện tử thật.
- Chưa tích hợp LIS/PACS/máy xét nghiệm/chẩn đoán hình ảnh thật.
- Một số message backend tiếng Việt bị lỗi encoding; khi demo nên ưu tiên luồng UI đã hiển thị ổn.
- Dữ liệu test phải chuẩn bị trước: khu/quầy/phòng/dịch vụ có giá, tài khoản tiếp đón, thu ngân, bác sĩ, DVKT.

## 7. Câu trả lời nếu bị hỏi "khác gì HIS ISOFH?"

HIS ISOFH/SAKURA là hệ thống bệnh viện tổng thể, có nhiều phân hệ và tích hợp sâu với vận hành thật như kiosk, QMS, BHYT, ký số, EMR, LIS/PACS, thanh toán, báo cáo và điều phối nội viện. Phần mềm của em không thay thế HIS thật mà mô phỏng luồng ngoại trú trọng tâm. Điểm giống là cùng đi theo mạch tiếp đón - đăng ký dịch vụ - thu ngân - khám bệnh - CLS - kê đơn/giấy tờ. Điểm khác là hệ thống của em ở mức mô phỏng, nhưng em làm kỹ các điểm hay phát sinh lỗi khi triển khai: trùng hồ sơ, sai khu/phòng, sai trạng thái thanh toán, hàng đợi bác sĩ, kết quả CLS quay về và kết luận hồ sơ.

## 8. Nguồn đối chiếu

Nguồn nội bộ/tài liệu của em:

- `BBNTCongViec_Thang07.2025_NguyenNgocTuVy.docx`
- `BBNTCongViec_Thang08.2025_NguyenNgocTuVy.docx`
- Code hiện tại trong repo: `TiepDonV2Controller`, `ServiceRegistrationV2Controller`, `HoaDonController`, `LanKhamController`, `ChiDinhDVKTController`, `ThucHienDVKTController`, `HoSoTrangThaiService`, `ResultForm.jsx`, `TiepDon.jsx`, `TiepDonDanhSach.jsx`, `BacSi.jsx`.

Nguồn công khai ISOFH:

- ISOFH ra mắt giải pháp quản lý bệnh viện Sakura: https://isofh.com/tin-tuc/%3Cp-style%3Dtext-align-center%3E%3Cstrong%3Enbspisofh-20211103095608965.html
- IVI HosMap 3D tích hợp QMS, điều phối nội viện: https://isofh.com/tin-tuc/ivi%2Bhosmap%2B3d%2Btich%2Bhop%2Bqms%2Bgiai%2Bphap%2Bdieu%2Bphoi%2Bno%2B20260428104810209.ivi
- ISOFH phát triển AI trích xuất sinh hiệu tự động: https://isofh.com/tin-tuc/isofh%2Bphat%2Btrien%2Btinh%2Bnang%2Bai%2B%E2%80%9Ctrich%2Bxuat%2Bsinh%2Bhie%2B20260514032735735.ivi
- Trang chủ ISOFH/KIOSK: https://isofh.com/
- Bài giới thiệu HIS của ISOFH: https://isofh.com/tin-tuc/%3Cp%3Ehis---he-thong-quan-lyacute-thocircng-tin-b-20190903083051821.html
- ISOFH/SAKURA được vinh danh dịch vụ số xuất sắc năm 2026: https://isofh.com/tin-tuc/giai%2Bphap%2Bsakura%2Bcua%2Bisofh%2Bduoc%2Bvinh%2Bdanh%2Bdich%2Bvu%2B20260601023654065.ivi
