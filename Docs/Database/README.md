# Cơ sở dữ liệu SQL Server

Database được SQL Server quản lý riêng, không nằm trong thư mục frontend/backend. Trên máy phát triển hiện tại, ứng dụng kết nối đến **`DACN`** tại instance **`.\SQLEXPRESS`**. Chuỗi cấu hình sử dụng `lpc:.\SQLEXPRESS` để kết nối nội bộ trên cùng máy.

## Các file trong repo

| File | Công dụng |
| --- | --- |
| `00_CreateDatabase.sql` | Tạo database `DACN` nếu chưa tồn tại; không thay thế database cũ. |
| `01_Schema.sql` | Toàn bộ cấu trúc 58 bảng, khóa chính/ngoại, ràng buộc mặc định, duy nhất và chỉ mục từ database phát triển. Chạy trên database trống. |
| `02_SeedBase.sql` | Cấu hình tối thiểu: vai trò, chức năng, quyền, Khu A/B và quầy tương ứng. Không chứa bệnh nhân hoặc tài khoản có sẵn. |
| `03_CreateAdmin.ps1` | Tạo tài khoản quản trị mới với mật khẩu tự nhập, băm theo `PasswordHasher` của backend. Không sửa tài khoản đã có. |
| `Export-Schema.ps1` | Công cụ tùy chọn để xuất lại cấu trúc từ SQL Server, cần module SQLPS/SMO. Không cần chạy khi cài dự án từ SQL đã cung cấp. |
| `SqlScripts/` | Các bản cập nhật từng phần và truy vấn đối chiếu số liệu. Không phải bộ tạo database ban đầu. |

`01_Schema.sql` là cấu trúc đã tổng hợp các thay đổi hiện có tại ngày xuất 26/10/2026. Cài mới bằng file này không cần chạy lại hàng loạt các script cập nhật cũ. Phần thống kê/dự báo mới đọc dữ liệu từ các bảng hiện có, không yêu cầu bảng dự báo riêng.

## Xem database đang có trên máy

Mở SQL Server Management Studio (SSMS), chọn Windows Authentication, nhập Server name:

```text
.\SQLEXPRESS
```

Sau khi kết nối, mở **Databases → DACN → Tables**. Nếu chưa thấy database, bấm Refresh và kiểm tra đang kết nối đúng instance. Máy phát triển hiện tại đã có dữ liệu; không cần tạo lại hay chạy `01_Schema.sql` lên database này.

Các file lưu trữ vật lý hiện được SQL Server đặt tại:

```text
C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\DACN.mdf
C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\DACN_log.ldf
```

Đây là vị trí trên máy phát triển, không phải đường dẫn bắt buộc khi cài máy khác. Dùng SSMS hoặc SQL để thao tác database; không kéo các file `.mdf`/`.ldf` đang mở vào thư mục code.

## Cài database mới bằng SSMS

1. Kết nối instance SQL Server của máy mới.
2. Mở và chạy `00_CreateDatabase.sql`. File này tạo `DACN` nếu chưa có. Nếu tên `DACN` đã dùng cho dữ liệu khác, tạo database với tên riêng và dùng tên đó cho các bước tiếp theo.
3. Mở `01_Schema.sql`, chọn đúng **database trống** trong thanh chọn database rồi Execute.
4. Tiếp tục chạy `02_SeedBase.sql` trong cùng database, trước khi tạo tài khoản.
5. Mở PowerShell tại thư mục gốc repo và tạo quản trị viên:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Docs\Database\03_CreateAdmin.ps1 -Server '.\SQLEXPRESS' -Database DACN -Username admin
```

Script hỏi mật khẩu riêng, không hiển thị hay ghi mật khẩu vào tệp SQL. Kết nối dùng Windows Authentication; tài khoản Windows chạy lệnh phải có quyền ghi vào database. Script dùng PBKDF2-SHA256, 100000 vòng, salt 16 byte, khóa 32 byte, đúng cách đăng nhập đang dùng của backend. Dự án có thư viện BCrypt nhưng luồng đăng ký/đăng nhập hiện tại sử dụng `PasswordHasher` này.

6. Sửa `ConnectionStrings:DefaultConnection` trong `appsettings.Development.json` cho đúng server và tên database, sau đó chạy backend/frontend theo README.
7. Đăng nhập tài khoản vừa tạo. Quản trị các danh mục, tạo tài khoản theo vai trò trước khi chạy nghiệp vụ khám.

## Cài mới bằng SQLCMD

Từ thư mục gốc repo, nếu đã cài công cụ `sqlcmd`:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -f 65001 -i Docs/Database/00_CreateDatabase.sql
sqlcmd -S '.\SQLEXPRESS' -d DACN -E -C -b -f 65001 -i Docs/Database/01_Schema.sql
sqlcmd -S '.\SQLEXPRESS' -d DACN -E -C -b -f 65001 -i Docs/Database/02_SeedBase.sql
powershell -NoProfile -ExecutionPolicy Bypass -File .\Docs\Database\03_CreateAdmin.ps1 -Server '.\SQLEXPRESS' -Database DACN -Username admin
```

Chỉ chạy lệnh schema trên database mới/trống. Nếu dùng database tên khác, tạo tên đó trước và thay `-d DACN`/`-Database DACN`; không chạy file tạo `DACN` mặc định. Cờ `-b` dừng khi có lỗi và `-f 65001` đọc SQL bằng UTF-8.

## Cấu trúc và dữ liệu đầy đủ khác nhau thế nào

Bộ SQL này dựng đúng cấu trúc database và cấu hình tối thiểu để tạo quản trị viên. Nó **không** chứa các bệnh nhân, lịch sử khám, mật khẩu cũ hoặc toàn bộ danh mục đang có trên máy phát triển.

Để máy khác có cùng dữ liệu như máy hiện tại, cần bản **backup `.bak`** và thao tác Restore, thay cho bước tạo schema trống. Repo hiện không cung cấp backup toàn bộ dữ liệu. Có thể tạo bằng SSMS: chuột phải database `DACN` → **Tasks → Back Up** → Backup type **Full**, chọn nơi lưu. Khi restore sang máy khác, kiểm tra lại đường dẫn file dữ liệu đích và cập nhật chuỗi kết nối của backend.

Sau cài mới bằng SQL sạch:

- Để xem báo cáo thuật toán ngay, vào Báo cáo và chọn **Dữ liệu mô phỏng để minh họa thuật toán**; không cần lịch sử bệnh nhân.
- Để chạy nghiệp vụ thực, cần bổ sung danh mục bác sĩ/phòng, thuốc, dịch vụ/DVKT và đơn giá phù hợp cùng tài khoản nhân viên.
- Các script `Backend/.../Scripts/SeedReceptionPresentationCases.sql` và `Seed25CasesPerDay.sql` chỉ tạo một số tình huống demo, có điều kiện đầu vào riêng; không thay thế bản backup đầy đủ.
- Để dự báo trên dữ liệu thật với cấu hình mặc định, cần ít nhất 30 tháng đầy đủ: 24 tháng huấn luyện và 6 tháng kiểm tra. Dữ liệu trên máy hiện tại chưa đạt điều kiện này.

## Kiểm tra sau khi cài

```sql
SELECT DB_NAME() AS database_name, COUNT(*) AS table_count FROM sys.tables;
SELECT name FROM sys.tables ORDER BY name;
SELECT ten FROM dbo.vai_tro ORDER BY id;
SELECT COUNT(*) AS users_created FROM dbo.nguoi_dung;
```

Schema gốc hiện có 58 bảng, 58 khóa chính, 93 khóa ngoại, 44 default constraints và 16 unique constraints. Các file được kiểm tra bằng cách tạo một database tạm riêng, dựng schema, chạy seed và tạo tài khoản quản trị. Database `DACN` đang dùng không bị tạo lại.
