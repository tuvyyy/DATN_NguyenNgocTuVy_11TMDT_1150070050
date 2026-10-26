# Thống kê phân tích xu hướng và dự báo lượt khám

Chức năng bổ sung cho đồ án tốt nghiệp, tương ứng các mục 2.4, 2.5, 3.4 và 3.5 trong đề cương: thống kê lượt khám, xác định giờ cao điểm, hồi quy tuyến tính, Holt-Winters và đánh giá dự báo.

## Cách sử dụng

1. Khởi động backend và frontend theo README.
2. Đăng nhập tài khoản quản trị có quyền xem Báo cáo.
3. Vào **Báo cáo**, chọn **Phân tích và dự báo lượt khám**.
4. Chọn nguồn dữ liệu, ngày bắt đầu/kết thúc, số tháng dự báo và số tháng cuối để kiểm tra.
5. Bấm **Phân tích dữ liệu**.
6. Xem biểu đồ tháng, xu hướng, giờ cao điểm, số lượt theo bác sĩ/chuyên khoa/nhóm mã ICD; mở phần dữ liệu ngày/tháng để đối chiếu.
7. Xuất CSV để xem bảng; xuất JSON để giữ đầy đủ dữ liệu đầu vào, cấu hình và kết quả thực nghiệm. Các nút xuất sử dụng bộ lọc của kết quả đang hiển thị, không sử dụng chỉnh sửa chưa áp dụng.

API cũng kiểm tra quyền quản trị (`ADMIN` hoặc `QUAN_TRI`), bao gồm cả truy cập dữ liệu mô phỏng và xuất tệp. Chức năng không mở dữ liệu toàn phòng khám cho tài khoản bác sĩ, tiếp đón, kỹ thuật viên hoặc thu ngân.

## Hai nguồn dữ liệu

**Dữ liệu phòng khám** đọc từ SQL Server. Kết quả có `dataKind = database`. Nếu chưa đủ lịch sử, thống kê và hồi quy vẫn hiển thị khi đủ điều kiện; hệ thống trả thông báo thiếu dữ liệu thay vì tạo dự báo giả.

**Dữ liệu mô phỏng** dùng bộ sinh xác định `synthetic-monthly-v1`, có xu hướng, mùa vụ năm và biến động nhỏ. Nguồn này chỉ tạo dữ liệu trong bộ nhớ, không ghi bệnh nhân/lượt khám vào SQL Server. Giao diện có thông báo riêng, JSON có `dataKind = synthetic`, tên tệp xuất có `MO-PHONG`. Toàn bộ kết quả chỉ minh họa thuật toán; không dùng sai số mô phỏng để khẳng định chất lượng dự báo trên dữ liệu thật.

Dữ liệu demo đã có trong SQL Server được nhận diện theo tiền tố mã bệnh nhân `DEMO-`, `DM` hoặc mã hồ sơ `HS-DEMO-`, `HS-DM`. Đây chỉ là quy tắc nhận diện theo mã, không bảo đảm phát hiện mọi dữ liệu giả lập. Báo cáo ghi lại số lượt nhận diện được.

## Nguồn và quy tắc đếm

| Nội dung đề cương | Trường thực tế trong mã nguồn |
| --- | --- |
| Mã lượt khám làm khóa đếm | `LanKham.Id` / `lan_kham.id` |
| Hồ sơ bệnh án | `IdHoSo` / `id_ho_so` |
| Liên kết lịch khám | `IdDatLich` / `id_dat_lich` |
| Bác sĩ và phòng khám | `IdBacSi`, `IdPhong` |
| Ngày giờ khám | `ThoiGianBatDau`; nếu null, dùng `CreatedAt` |
| Trạng thái | `TrangThai` của lượt khám và hồ sơ liên quan |
| Nhóm bệnh | Ba ký tự đầu mã bệnh chính từ `IdBenhNavigation.Ma` |

Mỗi ID lượt khám chỉ được tính một lần. Truy vấn không nối với các tập nhiều dòng như đơn thuốc hoặc chỉ định dịch vụ; do đó một lượt có nhiều thuốc/dịch vụ không làm tăng số lượt thống kê. Bác sĩ được phân biệt theo ID, kể cả khi trùng họ tên.

Luồng tiếp đón tạo một lượt nền trước khi thu ngân tạo lượt theo phòng khám. Lượt chưa có cả `IdPhong` lẫn `IdBacSi` được loại khỏi số lượt khám, kể cả khi trạng thái là `TIEP_DON`; số này nằm trong `excludedInvalid` và được giải thích thêm bằng `excludedReceptionOnly`. Vì vậy một ca tiếp đón vào một phòng không bị đếm thành hai lượt. Các lượt theo nhiều phòng thực sự khác nhau vẫn được đếm theo từng ID lượt khám.

Loại các lượt có trạng thái của lượt hoặc hồ sơ là `HUY`, `DA_HUY`, `CANCELLED`, `CANCELED` sau khi bỏ khoảng trắng và không phân biệt hoa/thường. Các bản nháp `NHAP`, `DRAFT`, lượt thiếu ID hợp lệ, bệnh nhân, thời điểm hoặc trạng thái cũng bị loại. Các trạng thái không rỗng còn lại, bao gồm chờ khám, được tính là lượt phát sinh; không đồng nhất chỉ số này với số ca đã khám xong.

`rawCount` là số ID lượt có thời điểm nằm trong khoảng chọn. Trong nhóm này:

```text
rawCount = validCount + excludedCancelled + excludedInvalid
```

Các lượt thiếu cả `ThoiGianBatDau` và `CreatedAt` không thể gán vào một khoảng thời gian. `undatedCount` đếm riêng các lượt này trong toàn database, không cộng vào `rawCount` của khoảng lọc.

Khung giờ lấy theo giờ của thời điểm thống kê; đây có thể là giờ tạo lượt đối với lượt chưa bắt đầu khám. Không diễn giải chỉ số này thành thời gian chờ hoặc thời lượng khám. Thời điểm trong database được giả định là giờ địa phương Việt Nam. Ngày hiện tại phía API dùng UTC+7.

Chuyên khoa lấy từ phòng khám, sau đó từ bác sĩ nếu phòng chưa có dữ liệu. Nhóm bệnh hiện là nhóm mã ICD ba ký tự của bệnh chính, chưa phải phân chương ICD hoặc thống kê toàn bộ bệnh kèm theo. Thông tin chưa có được xếp vào **Chưa xác định**.

## Chuẩn bị chuỗi tháng

- Tổng hợp lượt hợp lệ thành ngày và tháng; thống kê giờ/bác sĩ/chuyên khoa/nhóm bệnh dùng toàn khoảng ngày chọn.
- Hồi quy và Holt-Winters chỉ dùng các tháng đã hoàn tất, được bộ lọc bao phủ đầy đủ. Tháng hiện tại luôn bị loại, kể cả khi truy vấn vào ngày cuối tháng.
- Chuỗi bắt đầu không sớm hơn tháng có lượt hợp lệ đầu tiên trong khoảng chọn. Không thêm hàng loạt số 0 vào thời gian trước khi có dữ liệu.
- Các tháng không có lượt sau mốc đó đến hết khoảng tháng hợp lệ được điền 0 để chuỗi liên tục. Đây là giả định cần xác nhận: thiếu dữ liệu nhập không tự động có nghĩa là phòng khám không có lượt.
- Nếu hoàn toàn không có lượt hợp lệ, trả chuỗi tháng rỗng, không tạo chuỗi 0 để vượt điều kiện dự báo.
- Khoảng truy vấn tối đa 10 năm; không chấp nhận ngày kết thúc trong tương lai, ngày đảo ngược hoặc tham số ngoài giới hạn.

## Hồi quy tuyến tính

Dùng bình phương tối thiểu thông thường (OLS) trên toàn chuỗi tháng đầy đủ. Đặt `x = 0, 1, ..., n-1`, `y` là số lượt từng tháng:

```text
b = Σ((x - mean(x)) × (y - mean(y))) / Σ((x - mean(x))²)
a = mean(y) - b × mean(x)
y_hat = a + b × x
R² = 1 - SSE / SST
```

Cần ít nhất hai tháng. Báo cáo trả hệ số chặn, hệ số góc, R² và từng điểm trên đường hồi quy. Với chuỗi hằng, quy ước R² = 1. Nhãn tăng/giảm/ổn định phản ánh dấu của hệ số góc, không phải kết luận kiểm định ý nghĩa thống kê. Đường hồi quy mô tả dữ liệu và không được dùng thay thế sai số kiểm tra của Holt-Winters.

## Holt-Winters cộng

Mùa vụ cố định `m = 12` tháng theo phạm vi dự báo tháng của đề cương. Chọn mô hình cộng để xử lý được tháng có số lượt 0. Đây là lựa chọn thực nghiệm của phiên bản này; chưa tự động so sánh mô hình cộng/nhân hoặc xác nhận chuỗi có mùa vụ năm.

Các bước cập nhật với giá trị trước cập nhật là `L`, `B`, `S`:

```text
L_new = α × (y - S_old) + (1 - α) × (L_old + B_old)
B_new = β × (L_new - L_old) + (1 - β) × B_old
S_new = γ × (y - L_old - B_old) + (1 - γ) × S_old
forecast(h) = max(0, L_last + h × B_last + seasonal_for_month(h))
```

Khởi tạo từ hai chu kỳ đầu của tập huấn luyện: độ dốc bằng chênh lệch trung bình chu kỳ hai và một chia cho 12; level được căn chỉnh về cuối chu kỳ một; các chỉ số mùa vụ chu kỳ một được loại thành phần xu hướng. Sau đó cập nhật từ chu kỳ hai trở đi.

Tìm tham số bằng lưới xác định:

- `α ∈ {0.1, 0.3, 0.5, 0.7, 0.9}`.
- `β ∈ {0.0, 0.1, 0.3}`.
- `γ ∈ {0.0, 0.1, 0.3, 0.5}`, giữ `γ ≤ 1 - α`.

Chọn tổ hợp có tổng bình phương sai số khớp một bước trên tập huấn luyện nhỏ nhất. Việc khởi tạo và tìm tham số đều chỉ đọc tập huấn luyện. Tổ hợp có cùng SSE giữ kết quả xuất hiện trước để tái hiện được. Chưa sử dụng tối ưu liên tục hoặc khoảng dự báo xác suất.

## Chia dữ liệu và đánh giá

1. Giữ `testMonths` tháng cuối làm tập kiểm tra, phần trước là huấn luyện; không xáo trộn.
2. Tập huấn luyện cần ít nhất 24 tháng. Với mặc định 6 tháng kiểm tra, tổng cộng cần ít nhất 30 tháng đầy đủ. Đây là điều kiện của cài đặt, không bảo đảm dữ liệu phù hợp hoặc mô hình chính xác.
3. Chọn tham số trên tập huấn luyện; dự báo toàn tập kiểm tra từ thời điểm kết thúc tập huấn luyện, không cập nhật bằng giá trị thực của các tháng kiểm tra.
4. Tính MAE, RMSE và MAPE trên tập kiểm tra. MAPE chỉ dùng tháng có số lượt thực tế khác 0; báo rõ số tháng được tính và số tháng bị loại. Nếu tất cả bằng 0, MAPE là `null`, giao diện hiển thị `—`; MAE/RMSE vẫn tính toàn bộ.
5. So sánh với seasonal naive: lấy lại số lượt cùng tháng của năm trước từ tập huấn luyện. Cùng cách chia và quy tắc MAPE, không dùng số thực tế của tập kiểm tra để tạo mốc so sánh.
6. Khớp lại mô hình trên toàn chuỗi, giữ tham số đã chọn, để dự báo các tháng sau cuối chuỗi. Phần này tách với các dự báo dùng tính sai số kiểm tra.

`horizon` và `testMonths` nhận từ 1 đến 12. Nếu dự báo xa hơn độ dài tập kiểm tra, các chỉ số không chứng minh chất lượng cho toàn khoảng dự báo dài hơn. Khi chọn khoảng lịch sử cũ, các tháng dự báo tiếp theo có thể vẫn nằm trong quá khứ so với hôm nay.

## API và xuất kết quả

```text
GET /api/bao-cao/visits
GET /api/bao-cao/visits/export
```

Tham số chung: `fromDate`, `toDate`, `horizon` (mặc định 6), `testMonths` (mặc định 6), `demo` (mặc định false). Xuất tệp nhận thêm `format=csv|json`.

Ví dụ để thực nghiệm bộ mô phỏng cố định 36 tháng:

```text
/api/bao-cao/visits?fromDate=2022-01-01&toDate=2024-12-31&horizon=6&testMonths=6&demo=true
```

Cần JWT quản trị hợp lệ. JSON lưu chuỗi tháng, OLS, tháng train/test, tham số α/β/γ, số liệu đối chiếu từng tháng, sai số và mốc so sánh, dự báo tiếp theo, nguồn và thời điểm tạo báo cáo. Không xuất thông tin định danh bệnh nhân. CSV có các nhóm `metadata`, `regression`, `parameters`, `holdout_metrics`, `seasonal_naive_metrics`, `monthly`, `test`, `forecast`, các chiều thống kê và ghi chú.

Tệp được tính lại tại thời điểm xuất; nếu database thay đổi giữa lúc xem và xuất thì kết quả có thể khác. Giữ JSON của lần thực nghiệm làm bản dữ liệu đối chiếu.

## Kiểm thử có thể chạy lại

Tại thư mục gốc repo, với .NET 8 SDK và ASP.NET Core Runtime 8:

```powershell
dotnet run --project Tests/VisitAnalytics.Checks/VisitAnalytics.Checks.csproj
dotnet run --project Tests/VisitAnalytics.Checks/VisitAnalytics.Checks.csproj -- --database
```

Lệnh đầu kiểm tra thuật toán, chuỗi biết trước, tháng thiếu, số 0, không rò rỉ tập kiểm tra, đếm trùng và điều kiện dữ liệu. Lệnh `--database` mở máy chủ kiểm thử trên cổng localhost tự chọn, sử dụng cấu hình kết nối của backend và chỉ đọc database. Nó kiểm tra HTTP 401/403/400, dịch truy vấn EF sang SQL Server, đối chiếu số lượng, xuất CSV/JSON và xác nhận không thêm lượt khám. Máy chủ này không chạy SQL bootstrap của ứng dụng chính. Khóa JWT dùng trong bộ kiểm thử chỉ có hiệu lực với máy chủ kiểm thử.

Frontend:

```powershell
cd Frontend/layout-dacn
$env:CI = 'true'
npm test -- --watchAll=false --runInBand VisitAnalytics.test.jsx
npm run build
```

Các kiểm thử giao diện kiểm tra thông báo thiếu lịch sử, chọn mô phỏng có chủ đích, xuất theo bộ lọc đã áp dụng, giới hạn nút xuất, lỗi API và bảng đánh giá.

## Việc cần làm khi viết Chương 3

- Ghi nguồn dữ liệu thật hay mô phỏng, thời gian quan sát, trạng thái tính/loại và số lượt sau xử lý.
- Giữ JSON thực nghiệm, ảnh biểu đồ, bảng sai số và cấu hình train/test. Không thay kết quả mô phỏng bằng nhận định về chất lượng trên dữ liệu thật.
- Đối chiếu số lượt trong ngày/tháng với truy vấn database, không so với số hồ sơ hoặc số dịch vụ.
- Có thể dùng [SQL đối chiếu chỉ đọc](Database/SqlScripts/2026-10-26_verify_visit_analytics.sql), đổi hai ngày đầu vào trùng bộ lọc báo cáo.
- Nêu giới hạn về dữ liệu lịch sử, giả định tháng trống, chất lượng thời điểm, chuyên khoa và mã bệnh chính.
- Kiểm thử luồng khám xuyên suốt và phân quyền các phân hệ nghiệp vụ vẫn cần thực hiện theo kịch bản riêng; bộ kiểm thử bổ sung này tập trung vào thống kê/dự báo.

## Tài liệu phương pháp

- Hyndman và Athanasopoulos, [Forecasting: Principles and Practice — Methods with seasonality](https://otexts.com/fpp3/exponential-smoothing.html#methods-with-seasonality).
- Hyndman và Athanasopoulos, [Evaluating point forecast accuracy](https://otexts.com/fpp3/toolbox.html#evaluating-point-forecast-accuracy).
