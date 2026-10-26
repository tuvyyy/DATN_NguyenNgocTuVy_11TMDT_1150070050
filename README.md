# Hệ thống quản lý phòng khám

Đồ án tốt nghiệp của **Nguyễn Ngọc Tú Vy**, xây dựng ứng dụng web hỗ trợ quy trình khám bệnh ngoại trú: tiếp đón bệnh nhân, khám bệnh, thực hiện cận lâm sàng, kê đơn và thanh toán.

| Thông tin | Nội dung |
| --- | --- |
| Sinh viên thực hiện | Nguyễn Ngọc Tú Vy |
| Mã số sinh viên | 1150070050 |
| Lớp | 11TMDT |
| Mã nguồn | [DATN_NguyenNgocTuVy_11TMDT_1150070050](https://github.com/tuvyyy/DATN_NguyenNgocTuVy_11TMDT_1150070050) |

## Chức năng chính

| Phân hệ | Chức năng |
| --- | --- |
| Tiếp đón | Tra cứu và quản lý bệnh nhân; tạo hồ sơ, ghi nhận sinh hiệu; quản lý khu/quầy tiếp đón; kiểm tra trùng thông tin và hồ sơ trong ngày. |
| Khám bệnh | Tiếp nhận lượt khám, ghi nhận chẩn đoán, chỉ định dịch vụ kỹ thuật, kê đơn, xem kết quả và hẹn tái khám. |
| Cận lâm sàng | Theo dõi chỉ định, tiếp nhận thực hiện, nhập và trả kết quả, xuất phiếu kết quả PDF. |
| Thu ngân | Quản lý hóa đơn, xác nhận thanh toán và tích hợp thanh toán VNPay. |
| Quản trị | Quản lý người dùng, vai trò, phân quyền, danh mục thuốc, dịch vụ và dịch vụ kỹ thuật. |
| Vận hành và báo cáo | Báo cáo, thống kê; thông báo, yêu cầu hỗ trợ và nhật ký thao tác. |
| Phân tích và dự báo | Thống kê lượt khám theo ngày/tháng, giờ, bác sĩ, chuyên khoa và nhóm mã ICD; hồi quy tuyến tính; dự báo Holt-Winters với MAE, RMSE, MAPE và mốc so sánh. |

Luồng nghiệp vụ tổng quát:

```text
Tiếp đón → Chỉ định khám/dịch vụ → Thu ngân → Bác sĩ khám
                                                ↓
                                    Chỉ định cận lâm sàng
                                                ↓
                                        Thực hiện và trả kết quả
                                                ↓
                               Bác sĩ kết luận, kê đơn, hẹn tái khám
                                                ↓
                                  Thanh toán khoản còn lại (nếu có)
```

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | React 19, React Router 7, Tailwind CSS 3, Axios, Create React App |
| Backend | ASP.NET Core Web API, .NET 8, Entity Framework Core 9 |
| Cơ sở dữ liệu | Microsoft SQL Server |
| Xác thực | JWT Bearer, BCrypt |
| Cập nhật thời gian thực | SignalR |
| Tài liệu API | Swagger / OpenAPI |
| Tiện ích | QuestPDF, QRCoder, thư viện xuất Excel, tích hợp VNPay |

## Cấu trúc thư mục

```text
.
├── Backend/
│   └── ThucTapTotNghiep_1150070050_NguyenNgocTuVy/
│       ├── Controllers/       # API theo nghiệp vụ
│       ├── Data/              # DbContext và ánh xạ cơ sở dữ liệu
│       ├── Dtos/              # Đối tượng truyền dữ liệu
│       ├── Hubs/              # SignalR Hub
│       ├── Models/            # Mô hình dữ liệu
│       ├── PDF/               # Xuất đơn thuốc và kết quả PDF
│       ├── Scripts/           # Script dữ liệu demo và tiện ích
│       ├── Services/          # Xử lý nghiệp vụ
│       ├── wwwroot/           # Tài nguyên tĩnh và tệp kết quả
│       └── Program.cs         # Cấu hình ứng dụng và middleware
├── Frontend/
│   └── layout-dacn/
│       └── src/
│           ├── api/           # Gọi API backend
│           ├── components/    # Thành phần giao diện dùng chung
│           ├── controllers/   # Xử lý thao tác phía giao diện
│           ├── layouts/       # Bố cục giao diện
│           ├── pages/         # Màn hình nghiệp vụ
│           └── services/      # Kết nối cập nhật thời gian thực
├── Docs/                     # Hướng dẫn, kịch bản demo và SQL cập nhật
├── province.json             # Dữ liệu tỉnh/thành
├── ward.json                 # Dữ liệu phường/xã
└── README.md
```

Tên thư mục và project backend được giữ theo phiên bản thực tập để tiếp tục sử dụng mã nguồn hiện có.

## Cài đặt và chạy tại máy

### 1. Chuẩn bị môi trường

- Git.
- .NET SDK 8.
- Node.js và npm để cài đặt, chạy frontend.
- Microsoft SQL Server và công cụ quản lý như SQL Server Management Studio (SSMS).
- Cơ sở dữ liệu phòng khám có cấu trúc và dữ liệu phù hợp với các model trong backend.

### 2. Tải mã nguồn

```powershell
git clone https://github.com/tuvyyy/DATN_NguyenNgocTuVy_11TMDT_1150070050.git
cd DATN_NguyenNgocTuVy_11TMDT_1150070050
```

Các lệnh bên dưới được thực hiện từ thư mục gốc vừa tải về, trừ khi có ghi chú khác.

### 3. Chuẩn bị cơ sở dữ liệu và cấu hình

Repo hiện chứa các script **cập nhật cấu trúc và tạo dữ liệu demo**, chưa có bản sao lưu `.bak` hoặc script tạo đầy đủ cơ sở dữ liệu ban đầu. Cần khôi phục cơ sở dữ liệu của dự án trước khi sử dụng các phân hệ nghiệp vụ; chỉ tạo một database rỗng là chưa đủ.

Bổ sung mục `ConnectionStrings` vào file `Backend/ThucTapTotNghiep_1150070050_NguyenNgocTuVy/appsettings.Development.json`, giữ lại các cấu hình khác đang có. Ví dụ với SQL Server dùng Windows Authentication:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=DACN;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

Thay `Server` và `Database` theo SQL Server trên máy. Nếu dùng SQL Server Authentication, cấu hình tài khoản kết nối tương ứng.

Các cấu hình backend cần kiểm tra:

| Khóa cấu hình | Mục đích |
| --- | --- |
| `ConnectionStrings:DefaultConnection` | Kết nối SQL Server. |
| `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpireMinutes` | Tạo và xác thực phiên đăng nhập. |
| `Vnpay:TmnCode`, `Vnpay:HashSecret` | Thông tin tích hợp VNPay của môi trường sử dụng. |
| `Vnpay:BaseUrl`, `Vnpay:CallbackUrl` | Địa chỉ cổng thanh toán và địa chỉ nhận kết quả trả về. |

Không đưa mật khẩu hay khóa bí mật thật vào commit; có thể ghi đè bằng biến môi trường, chẳng hạn `ConnectionStrings__DefaultConnection` hoặc `Jwt__Key`.

Các script trong [Docs/Database/SqlScripts](Docs/Database/SqlScripts) phục vụ cập nhật từng phần. Đọc nội dung và kiểm tra cấu trúc database trước khi áp dụng; một số script có lệnh `USE [DACN]`, cần đổi nếu database sử dụng tên khác. Phần khởi động trong `Program.cs` cũng bổ sung một số bảng/cột, nhưng không thay thế bước chuẩn bị cơ sở dữ liệu ban đầu.

### 4. Chạy backend

Trong terminal thứ nhất:

```powershell
cd Backend/ThucTapTotNghiep_1150070050_NguyenNgocTuVy
dotnet restore
dotnet dev-certs https --trust
dotnet run --launch-profile https
```

Địa chỉ theo cấu hình `launchSettings.json`:

- API HTTPS: `https://localhost:7007`.
- API HTTP: `http://localhost:5006`.
- Swagger: `https://localhost:7007/swagger`.

### 5. Chạy frontend

Mở terminal thứ hai tại thư mục gốc repo:

```powershell
cd Frontend/layout-dacn
npm ci
npm start
```

Truy cập `http://localhost:3000/login`, đăng nhập bằng tài khoản trong cơ sở dữ liệu đã được cấp vai trò và quyền phù hợp.

Frontend hiện sử dụng địa chỉ backend `https://localhost:7007` tại nhiều file trong `src/api/` và một số thành phần khác. Khi đổi máy chủ hoặc cổng, cần cập nhật các địa chỉ liên quan; luồng trả về từ VNPay cũng đang sử dụng frontend tại `http://localhost:3000`.

## Build dự án

Chạy từng nhóm lệnh từ thư mục gốc repo.

Backend:

```powershell
dotnet build Backend/ThucTapTotNghiep_1150070050_NguyenNgocTuVy/ThucTapTotNghiep_1150070050_NguyenNgocTuVy.csproj
```

Frontend:

```powershell
cd Frontend/layout-dacn
npm run build
```

Kết quả build frontend nằm trong thư mục `Frontend/layout-dacn/build/`.

## Tài liệu và demo

- [Hướng dẫn thống kê, hồi quy và dự báo Holt-Winters](Docs/ThongKeDuBaoLuotKham.md).
- [Hướng dẫn sử dụng hệ thống](Docs/HuongDanSuDung.md).
- [Kịch bản demo tiếp đón](Docs/KichBanDemoTiepDon.md).
- [Danh sách kiểm tra nghiệm thu tiếp đón](Docs/reception_acceptance_checklist.md).
- [Tài liệu chốt demo tiếp đón và khám bệnh](Docs/BanChot_Demo_TiepDon_KhamBenh_2026-06-06.md).
- [Script tạo tình huống demo tiếp đón](Backend/ThucTapTotNghiep_1150070050_NguyenNgocTuVy/Scripts/SeedReceptionPresentationCases.sql).

Script demo tiếp đón sử dụng dữ liệu có tiền tố `DEMO-TD` và ngày hiện tại của SQL Server. Trước khi chạy, cần có tài khoản người dùng, Khu A/Khu B và các quầy tương ứng như mô tả trong script.

Để dùng phần phân tích mới: đăng nhập quản trị, vào **Báo cáo → Phân tích và dự báo lượt khám**. Mặc định đọc dữ liệu phòng khám; Holt-Winters cần ít nhất 24 tháng huấn luyện cộng số tháng kiểm tra đã chọn (mặc định tổng 30 tháng đầy đủ). Khi chưa đủ lịch sử, hệ thống thông báo rõ. Có thể chọn nguồn **Dữ liệu mô phỏng để minh họa thuật toán** để thử toàn bộ luồng; dữ liệu này được ghi nhãn riêng và không ghi vào database.

## Xử lý lỗi thường gặp

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| Backend không kết nối được SQL Server | Kiểm tra dịch vụ SQL Server, tên instance, tên database, chuỗi kết nối và quyền tài khoản. |
| API báo thiếu bảng hoặc cột | Kiểm tra database gốc và các script cập nhật phù hợp; database rỗng chưa đáp ứng cấu trúc ứng dụng. |
| Trình duyệt không tin cậy HTTPS local | Chạy `dotnet dev-certs https --trust`, sau đó mở lại `https://localhost:7007/swagger`. |
| Cổng `7007`, `5006` hoặc `3000` đang được sử dụng | Kiểm tra ứng dụng đang chạy và dừng phiên cũ trước khi khởi động lại. |
| Frontend không gọi được API | Kiểm tra backend, chứng chỉ HTTPS và địa chỉ API được khai báo trong mã frontend. |
| Đăng nhập được nhưng không mở được phân hệ | Kiểm tra vai trò, quyền chức năng của tài khoản; đăng nhập lại sau khi cập nhật quyền. |
