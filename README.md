# Hệ thống quản lý phòng khám

Ứng dụng web hỗ trợ quy trình khám bệnh ngoại trú: tiếp đón người bệnh, đăng ký dịch vụ, thu ngân, khám bệnh, thực hiện cận lâm sàng, kê đơn và theo dõi báo cáo.

Dự án được xây dựng trong khuôn khổ đồ án tốt nghiệp của **Nguyễn Ngọc Tú Vy — MSSV 1150070050**.

## Chức năng chính

| Phân hệ | Chức năng |
| --- | --- |
| Tiếp đón | Tra cứu, tạo và cập nhật bệnh nhân; kiểm tra trùng thông tin; lập hồ sơ trong ngày; ghi sinh hiệu; quản lý khu và quầy tiếp đón. |
| Đăng ký dịch vụ | Chọn dịch vụ, phòng khám theo khu; lập phiếu dịch vụ; tính tiền và đưa người bệnh vào hàng đợi sau khi thanh toán. |
| Khám bệnh | Nhận lượt khám, xem lịch sử, ghi chẩn đoán và kết quả khám; chỉ định cận lâm sàng; kê đơn; kết luận và hẹn tái khám. |
| Cận lâm sàng | Nhận chỉ định, nhập kết quả, duyệt và gửi kết quả; xuất phiếu kết quả PDF. |
| Thu ngân | Quản lý hóa đơn khám, cận lâm sàng và thuốc; xác nhận thanh toán; tích hợp VNPay. |
| Quản trị | Quản lý người dùng, vai trò, phân quyền; quản lý danh mục thuốc, dịch vụ và dịch vụ kỹ thuật. |
| Vận hành | Thông báo thời gian thực, yêu cầu hỗ trợ và nhật ký thao tác. |
| Báo cáo | Thống kê lượt khám theo thời gian, bác sĩ, chuyên khoa và nhóm bệnh; phân tích xu hướng, dự báo Holt-Winters và xuất dữ liệu. |

### Quy trình nghiệp vụ

```text
Tiếp đón và ghi sinh hiệu
          ↓
Đăng ký dịch vụ, chọn phòng khám
          ↓
Thanh toán tiền khám → Hàng đợi bác sĩ
                              ↓
                         Bác sĩ khám
                              ↓
            Chỉ định cận lâm sàng (nếu có)
                              ↓
            Thanh toán → Thực hiện → Trả kết quả
                              ↓
                Kết luận, kê đơn, hẹn tái khám
                              ↓
                Thanh toán tiền thuốc (nếu có)
```

Hệ thống kiểm soát trạng thái hồ sơ và quyền thao tác trong từng bước, bao gồm chặn trùng hồ sơ đang hoạt động, kiểm tra khu/phòng, kiểm tra thanh toán và chặn kết luận khi còn cận lâm sàng chưa hoàn tất.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | React 19, React Router 7, Tailwind CSS 3, Create React App |
| Kết nối API | Axios |
| Backend | ASP.NET Core Web API, .NET 8 |
| Truy cập dữ liệu | Entity Framework Core 9, SQL Server |
| Xác thực và phân quyền | JWT Bearer, vai trò và quyền theo chức năng |
| Cập nhật thời gian thực | SignalR |
| Xuất tài liệu | QuestPDF, QRCoder, thư viện xuất Excel |
| Thanh toán | VNPay |
| Tài liệu API | Swagger / OpenAPI |

## Cấu trúc dự án

```text
.
├── Backend/
│   └── Clinic.Api/
│       ├── Controllers/          # Các API nghiệp vụ
│       ├── Data/                 # DbContext và ánh xạ dữ liệu
│       ├── Dtos/                 # Dữ liệu trao đổi qua API
│       ├── Hubs/                 # SignalR
│       ├── Models/               # Mô hình dữ liệu
│       ├── PDF/                  # Xuất đơn thuốc và kết quả PDF
│       ├── Scripts/              # Script bổ sung và dữ liệu demo
│       ├── Services/             # Xử lý nghiệp vụ, thống kê và dự báo
│       ├── wwwroot/              # Tài nguyên tĩnh và tệp phát sinh
│       ├── Clinic.Api.csproj
│       └── Program.cs
├── Frontend/
│   └── clinic-web/
│       ├── public/               # HTML và tài nguyên công khai
│       ├── src/
│       │   ├── api/              # Gọi API
│       │   ├── components/       # Thành phần giao diện dùng chung
│       │   ├── controllers/      # Xử lý thao tác giao diện
│       │   ├── hooks/
│       │   ├── layouts/
│       │   ├── pages/            # Các màn hình nghiệp vụ
│       │   ├── services/         # Kết nối thời gian thực
│       │   └── utils/
│       └── package.json
├── Database/
│   ├── 00_CreateDatabase.sql
│   ├── 01_Schema.sql
│   ├── 02_SeedBase.sql
│   ├── 03_CreateAdmin.ps1
│   ├── Export-Schema.ps1
│   └── SqlScripts/               # Các script cập nhật theo từng phần
├── Tests/
│   ├── ClinicWorkflow.Checks/    # Kiểm thử quy trình ngoại trú
│   └── VisitAnalytics.Checks/    # Kiểm thử thống kê và dự báo
├── ClinicManagement.sln
├── province.json                # Dữ liệu tỉnh/thành cho tra cứu địa chỉ
├── ward.json                    # Dữ liệu phường/xã cho tra cứu địa chỉ
└── README.md
```

## Cài đặt và chạy dự án

Các lệnh dưới đây dùng **PowerShell**, bắt đầu từ thư mục gốc của repo. Mở hai terminal riêng để chạy backend và frontend đồng thời.

### 1. Chuẩn bị môi trường

- Git.
- .NET SDK 8.
- Node.js từ phiên bản 20 và npm, theo yêu cầu của React Router trong lockfile.
- Microsoft SQL Server và SQL Server Management Studio (SSMS).

Kiểm tra các công cụ:

```powershell
git --version
dotnet --version
node --version
npm --version
```

### 2. Tải mã nguồn

```powershell
git clone https://github.com/tuvyyy/DATN_NguyenNgocTuVy_11TMDT_1150070050.git
cd DATN_NguyenNgocTuVy_11TMDT_1150070050
```

Nếu đã có mã nguồn trên máy, mở terminal tại thư mục chứa `ClinicManagement.sln`.

### 3. Chuẩn bị cơ sở dữ liệu

**Nếu máy đã có database đang sử dụng:** kiểm tra kết nối ở bước 4. Không chạy lại bộ dựng schema lên database có dữ liệu. Có thể khôi phục bản sao lưu `.bak` nếu cần chuyển đầy đủ dữ liệu từ máy khác.

**Nếu cài đặt từ đầu:** mở SSMS, kết nối SQL Server và thực hiện theo thứ tự:

1. Chạy [00_CreateDatabase.sql](Database/00_CreateDatabase.sql) để tạo database `DACN` nếu chưa tồn tại.
2. Chọn database `DACN`, chạy [01_Schema.sql](Database/01_Schema.sql) trên database mới, trống.
3. Vẫn chọn `DACN`, chạy [02_SeedBase.sql](Database/02_SeedBase.sql) để tạo vai trò, quyền, khu và quầy tiếp đón ban đầu.
4. Tạo tài khoản quản trị bằng PowerShell:

```powershell
.\Database\03_CreateAdmin.ps1 -Server '.\SQLEXPRESS' -Database 'DACN' -Username 'admin'
```

Script sẽ yêu cầu nhập mật khẩu có ít nhất 8 ký tự và sử dụng Windows Authentication. Thay `-Server` theo SQL Server trên máy; tài khoản Windows chạy script cần quyền ghi vào database. Script không ghi đè tài khoản đã tồn tại.

Bộ SQL chỉ chứa cấu trúc và cấu hình nền. Để chạy đầy đủ một ca khám, cần bổ sung danh mục thuốc, dịch vụ, giá, phòng khám, tài khoản nhân viên và các phân công tương ứng. Các script trong `Database/SqlScripts/` là bản cập nhật từng phần; đọc nội dung và kiểm tra database trước khi áp dụng.

### 4. Cấu hình kết nối

Thêm mục `ConnectionStrings` vào [appsettings.Development.json](Backend/Clinic.Api/appsettings.Development.json), giữ lại các cấu hình khác đang có. Ví dụ dùng SQL Server Express với Windows Authentication:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=DACN;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

Thay `Server` và `Database` theo môi trường thực tế. Nếu dùng SQL Server Authentication, cấu hình thông tin đăng nhập tương ứng.

Các nhóm cấu hình backend cần kiểm tra:

| Cấu hình | Mục đích |
| --- | --- |
| `ConnectionStrings:DefaultConnection` | Kết nối SQL Server. |
| `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience` | Cấu hình ký và xác thực token đăng nhập. |
| `Vnpay:TmnCode`, `Vnpay:HashSecret`, `Vnpay:BaseUrl`, `Vnpay:CallbackUrl` | Cấu hình tích hợp thanh toán VNPay khi sử dụng. |

Có thể ghi đè cấu hình bằng biến môi trường, chẳng hạn `ConnectionStrings__DefaultConnection`, `Jwt__Key` hoặc `Vnpay__HashSecret`. Không commit mật khẩu và khóa bí mật thật lên repo.

### 5. Chạy backend

Trong terminal thứ nhất, tại thư mục gốc:

```powershell
dotnet restore .\ClinicManagement.sln
dotnet dev-certs https --trust
dotnet run --project .\Backend\Clinic.Api\Clinic.Api.csproj --launch-profile https
```

| Địa chỉ | Nội dung |
| --- | --- |
| https://localhost:7007 | API HTTPS |
| http://localhost:5006 | Cổng HTTP theo launch profile |
| https://localhost:7007/swagger | Giao diện thử API |

### 6. Chạy frontend

Trong terminal thứ hai, cũng tại thư mục gốc:

```powershell
npm --prefix .\Frontend\clinic-web ci
npm --prefix .\Frontend\clinic-web start
```

Mở **http://localhost:3000/login** và đăng nhập bằng tài khoản đã tạo. Tài khoản nhân viên cần được quản trị viên cấp vai trò, quyền và phân công phù hợp; đăng ký công khai không tự cấp quyền nghiệp vụ.

`npm ci` dùng để cài dependency theo lockfile. Các lần chạy sau, nếu dependency không thay đổi, chỉ cần chạy lệnh khởi động backend và `npm start` như trên.

Frontend hiện khai báo địa chỉ API local trong mã nguồn, chủ yếu là `https://localhost:7007`. Khi đổi địa chỉ hoặc cổng backend, cần cập nhật các chỗ gọi API và kết nối SignalR liên quan; nếu dùng VNPay, kiểm tra cả URL callback và địa chỉ frontend trả về.

## Thống kê và dự báo lượt khám

Đăng nhập bằng tài khoản quản trị (`ADMIN`), vào **Báo cáo → Phân tích và dự báo lượt khám**.

- Thống kê lượt khám theo ngày/tháng, giờ, bác sĩ, chuyên khoa và nhóm mã ICD.
- Phân tích xu hướng bằng hồi quy tuyến tính.
- Dự báo bằng Holt-Winters cộng, đối chiếu MAE, RMSE, MAPE và mô hình so sánh.
- Hỗ trợ nguồn dữ liệu phòng khám và nguồn mô phỏng được ghi nhãn riêng.

Dự báo cần ít nhất 24 tháng huấn luyện cộng với số tháng kiểm tra đã chọn; mặc định cần 30 tháng đầy đủ. Khi lịch sử chưa đủ, có thể chọn dữ liệu mô phỏng để xem luồng phân tích. Nguồn mô phỏng không ghi thêm lượt khám vào database.

## Build và kiểm thử

Chạy các lệnh từ thư mục gốc repo.

### Build

```powershell
dotnet build .\ClinicManagement.sln
npm --prefix .\Frontend\clinic-web run build
```

Bản build frontend được tạo trong `Frontend/clinic-web/build/`.

### Kiểm thử frontend

```powershell
npm --prefix .\Frontend\clinic-web test -- --watchAll=false --runInBand
```

### Kiểm thử thống kê và dự báo

```powershell
dotnet run --project .\Tests\VisitAnalytics.Checks\VisitAnalytics.Checks.csproj
```

Lệnh mặc định kiểm tra thuật toán bằng dữ liệu trong bộ nhớ, không cần SQL Server. Có thể thêm `-- --database` để kiểm tra API và truy vấn với database được cấu hình, hoặc `-- --export-experiment` để xuất kết quả vào `TestResults/`.

### Kiểm thử quy trình ngoại trú

```powershell
dotnet run --project .\Tests\ClinicWorkflow.Checks\ClinicWorkflow.Checks.csproj
```

Bộ kiểm thử này chạy trên Windows, kết nối instance `.\SQLEXPRESS` bằng Windows Authentication. Tài khoản chạy cần quyền tạo và xóa database kiểm thử. Chương trình tạo database riêng có tiền tố `DACN_E2E_`, chạy quy trình với dữ liệu mô phỏng rồi xóa database đó; kết quả được ghi vào `TestResults/`.

Lần kiểm tra sau khi tổ chức lại mã nguồn: **build backend/frontend thành công, 9 kiểm thử frontend, 27 kiểm tra thống kê và 69 kiểm tra quy trình đều đạt**. Mã nguồn hiện vẫn còn một số cảnh báo compiler và lint.

## Tệp phát sinh khi sử dụng

Các thư mục sau không được đưa lên Git:

- `node_modules/`, `bin/`, `obj/`, `build/`: dependency và sản phẩm build.
- `TestResults/`: kết quả kiểm thử và dữ liệu xuất từ kiểm thử.
- `Backend/Clinic.Api/wwwroot/pdf-ketqua/`: PDF kết quả được tạo trong quá trình sử dụng.
- `Backend/Clinic.Api/wwwroot/uploads/`: tệp người dùng tải lên.

Khi chuyển một hệ thống đang có dữ liệu sang máy khác, cần chuyển cả tệp PDF và tệp tải lên đi kèm bản sao lưu database để các liên kết đã lưu tiếp tục hoạt động. Giữ `province.json` và `ward.json` ở thư mục gốc khi chạy từ mã nguồn để chức năng tra cứu địa chỉ đọc được dữ liệu.

## Xử lý lỗi thường gặp

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| Không chạy được lệnh `dotnet` | Kiểm tra .NET SDK 8 và `PATH`; lệnh `dotnet --version` phải hoạt động trước khi chạy backend. |
| Backend không kết nối được database | Kiểm tra dịch vụ SQL Server, tên instance, database, chuỗi kết nối và quyền truy cập. |
| API báo thiếu bảng hoặc cột | Kiểm tra schema và các script cập nhật phù hợp; không chạy lại toàn bộ schema lên database có dữ liệu. |
| Trình duyệt không tin cậy HTTPS local | Chạy `dotnet dev-certs https --trust`, mở lại `https://localhost:7007/swagger`. |
| Frontend không gọi được API | Kiểm tra backend đang chạy, chứng chỉ HTTPS và địa chỉ API trong frontend. |
| Cổng `3000`, `5006` hoặc `7007` đang được dùng | Kiểm tra và dừng phiên chạy cũ trước khi khởi động lại. |
| Đăng nhập được nhưng không mở được chức năng | Kiểm tra vai trò, quyền theo chức năng và phân công khu/phòng của tài khoản. |
| Không hiển thị dự báo | Kiểm tra số tháng dữ liệu đầy đủ hoặc chọn nguồn mô phỏng để minh họa. |
