using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Dtos;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;

var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));
var output = Path.Combine(root, "Docs/ThucNghiem");
var checks = new List<object>();
var passed = 0;
void Check(bool condition, string name)
{
    checks.Add(new { name, passed = condition });
    if (!condition) throw new Exception("FAIL: " + name);
    passed++; Console.WriteLine("PASS: " + name);
}
var name = "DACN_E2E_" + Guid.NewGuid().ToString("N")[..12];
var master = new SqlConnectionStringBuilder { DataSource = @"lpc:.\SQLEXPRESS", InitialCatalog = "master", IntegratedSecurity = true, TrustServerCertificate = true, ConnectTimeout = 10 };
var options = new SqlConnectionStringBuilder(master.ConnectionString) { InitialCatalog = name };
var created = false;
WebApplication? app = null;
var originalDirectory = Directory.GetCurrentDirectory();
var scratch = Path.Combine(Path.GetTempPath(), name);
var started = DateTimeOffset.UtcNow;
try
{
    using (var connection = new SqlConnection(master.ConnectionString))
    {
        await connection.OpenAsync();
        using var command = new SqlCommand($"CREATE DATABASE [{name}]", connection);
        await command.ExecuteNonQueryAsync(); created = true;
    }
    using (var connection = new SqlConnection(options.ConnectionString))
    {
        await connection.OpenAsync();
        foreach (var file in new[] { "01_Schema.sql", "02_SeedBase.sql" })
        foreach (var batch in Regex.Split(await File.ReadAllTextAsync(Path.Combine(root, "Docs/Database", file)), @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(batch)) continue;
            using var command = new SqlCommand(batch, connection) { CommandTimeout = 60 };
            await command.ExecuteNonQueryAsync();
        }
    }
    Check(true, "Dựng database kiểm thử mới từ schema và seed công khai");
    var dbOptions = new DbContextOptionsBuilder<DACNDbContext>().UseSqlServer(options.ConnectionString).Options;
    await using var db = new DACNDbContext(dbOptions);
    var users = new Dictionary<string, long>();
    var password = "E2E-only-" + Guid.NewGuid().ToString("N");
    var passwordHasher = new PasswordHasher();
    foreach (var (username, role) in new[] { ("admin_e2e", "ADMIN"), ("reception_e2e", "TIEP_DON"), ("doctor_e2e", "BAC_SI"), ("doctor2_e2e", "BAC_SI"), ("lab_e2e", "KY_THUAT_VIEN"), ("lab2_e2e", "KY_THUAT_VIEN"), ("cashier_e2e", "THU_NGAN") })
    {
        var (hash, salt) = passwordHasher.Hash(password);
        var user = new NguoiDung { TenDangNhap = username, HoTen = "Tài khoản kiểm thử " + role, MatKhau = hash, Salt = salt, MaNv = username, HoatDong = true, CreatedAt = DateTime.Now };
        db.NguoiDungs.Add(user); await db.SaveChangesAsync();
        users[username] = user.Id;
        var roleId = await db.VaiTros.Where(r => r.Ten == role).Select(r => r.Id).SingleAsync();
        db.NguoiDungVaiTros.Add(new() { IdNguoiDung = user.Id, IdVaiTro = roleId });
    }
    await db.SaveChangesAsync();
    var area = await db.KhuTiepDons.SingleAsync(x => x.MaKhu == "KHU_A");
    var otherArea = await db.KhuTiepDons.SingleAsync(x => x.MaKhu == "KHU_B");
    var counter = await db.QuayTiepDons.FirstAsync(x => x.IdKhuTiepDon == area.Id);
    db.NguoiDungKhus.Add(new() { IdNguoiDung = users["reception_e2e"], IdKhuTiepDon = area.Id, HoatDong = true, LaMacDinh = true, CreatedAt = DateTime.Now });
    var room = new PhongKham { MaPhong = "E2E_A", TenPhong = "Phòng kiểm thử A", KhoaPhong = "Noi", IdKhuTiepDon = area.Id, HoatDong = true };
    var otherRoom = new PhongKham { MaPhong = "E2E_B", TenPhong = "Phòng kiểm thử B", KhoaPhong = "Noi", IdKhuTiepDon = otherArea.Id, HoatDong = true };
    db.PhongKhams.AddRange(room, otherRoom); await db.SaveChangesAsync();
    foreach (var doctor in new[] { "doctor_e2e", "doctor2_e2e" }) db.BacSiPhongs.Add(new() { IdBacSi = users[doctor], IdPhong = room.Id });
    var service = new DichVu { Ma = "E2E_KHAM", Ten = "Dịch vụ khám mô phỏng", IdPhong = room.Id, HoatDong = true };
    var otherService = new DichVu { Ma = "E2E_OTHER", Ten = "Dịch vụ khu khác", IdPhong = otherRoom.Id, HoatDong = true };
    db.DichVus.AddRange(service, otherService); await db.SaveChangesAsync();
    foreach (var item in new[] { service, otherService }) db.DichVuGia.Add(new() { IdDichVu = item.Id, IdPhong = item.IdPhong, DonGia = 100000m, NgayApDung = DateOnly.FromDateTime(DateTime.Today.AddYears(-1)), HoatDong = true });
    var group = new NhomDvkt { TenNhom = "Nhóm kiểm thử", HoatDong = true };
    db.NhomDvkts.Add(group); await db.SaveChangesAsync();
    var labService = new Dvkt { MaDvkt = "E2E_CLS", TenDvkt = "Cận lâm sàng mô phỏng", IdNhom = group.Id, HoatDong = true };
    db.Dvkts.Add(labService); await db.SaveChangesAsync();
    db.DvktGia.Add(new() { IdDvkt = labService.Id, DonGia = 50000m, TuNgay = DateOnly.FromDateTime(DateTime.Today.AddYears(-1)) });
    var drug = new Thuoc { Ma = "E2E_THUOC", Ten = "Thuốc mô phỏng chỉ dùng kiểm thử", DonVi = "vien", SoLuongTon = 100, DonGia = 1000m, HanSuDung = DateOnly.FromDateTime(DateTime.Today.AddYears(1)), HoatDong = true };
    var disease = new Benh { Ma = "Z00", Ten = "Dữ liệu chẩn đoán mô phỏng" };
    db.Thuocs.Add(drug); db.Benhs.Add(disease); await db.SaveChangesAsync();
    db.ChangeTracker.Clear();

    Directory.CreateDirectory(scratch);
    Directory.CreateDirectory(Path.Combine(scratch, "wwwroot"));
    Directory.SetCurrentDirectory(scratch);
    var builder = WebApplication.CreateBuilder(new WebApplicationOptions { ContentRootPath = scratch, WebRootPath = "wwwroot", EnvironmentName = "Development" });
    builder.Logging.ClearProviders(); builder.WebHost.UseUrls("http://127.0.0.1:0");
    const string testKey = "Workflow-host-key-only-not-valid-for-production-2026";
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:Key"] = testKey, ["Jwt:Issuer"] = "workflow-checks", ["Jwt:Audience"] = "workflow-checks", ["Jwt:ExpireMinutes"] = "30" });
    builder.Services.AddDbContext<DACNDbContext>(o => o.UseSqlServer(options.ConnectionString));
    builder.Services.AddScoped<ICodeGenerator, CodeGenerator>(); builder.Services.AddScoped<PricingService>();
    builder.Services.AddScoped<IPasswordHasher, PasswordHasher>(); builder.Services.AddScoped<DonThuocValidatorService>();
    builder.Services.AddScoped<IHoaDonService, HoaDonService>(); builder.Services.AddScoped<IHoSoTrangThaiService, HoSoTrangThaiService>();
    builder.Services.AddScoped<IKhamBenhAuditService, KhamBenhAuditService>(); builder.Services.AddHttpContextAccessor();
    builder.Services.AddMemoryCache(); builder.Services.AddSignalR();
    builder.Services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly).AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => o.TokenValidationParameters = new()
    { ValidateIssuer = true, ValidIssuer = "workflow-checks", ValidateAudience = true, ValidAudience = "workflow-checks", ValidateLifetime = true, ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(testKey)) });
    builder.Services.AddAuthorization(); app = builder.Build();
    app.Use(async (context, next) => { try { await next(); } catch (Exception ex) { Console.WriteLine("TEST HOST: " + ex.GetType().Name + ": " + ex.Message); throw; } });
    app.UseAuthentication(); app.UseAuthorization(); app.MapControllers(); await app.StartAsync();
    var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
    using var anonymous = new HttpClient { BaseAddress = new Uri(address) };
    async Task<HttpClient> Login(string username)
    {
        var response = await anonymous.PostAsJsonAsync("/api/Auth/login", new { tenDangNhap = username, matKhau = password });
        Check(response.IsSuccessStatusCode, "Đăng nhập bằng mật khẩu thật: " + username);
        var data = await response.Content.ReadFromJsonAsync<JsonObject>();
        var client = new HttpClient { BaseAddress = new Uri(address) };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", data!["token"]!.GetValue<string>());
        return client;
    }
    async Task<JsonObject> Request(HttpClient client, HttpMethod method, string path, object? body, string label, params int[] statuses)
    {
        using var request = new HttpRequestMessage(method, path);
        if (body != null) request.Content = JsonContent.Create(body);
        using var response = await client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        var code = (int)response.StatusCode;
        if (!statuses.Contains(code)) Console.WriteLine($"Unexpected HTTP {code} at {path}: {text[..Math.Min(text.Length, 700)]}");
        Check(statuses.Contains(code), label);
        try { return JsonNode.Parse(text) as JsonObject ?? new(); } catch (JsonException) { return new(); }
    }
    foreach (var path in new[] { "/api/LanKham/lan-kham/1/detail", "/api/DonThuoc/lan-kham/1", "/api/HoaDon/1", "/api/bacsi/dvkt/lankham/1", "/api/pdf/dvkt/1", "/api/users/vaitro" })
        await Request(anonymous, HttpMethod.Get, path, null, "Chặn truy cập chưa đăng nhập: " + path, 401);
    var adminRole = await db.VaiTros.Where(x => x.Ten == "ADMIN").Select(x => x.Id).SingleAsync();
    await Request(anonymous, HttpMethod.Post, "/api/Auth/register", new { tenDangNhap = "self_admin", matKhau = password, vaiTroIds = new[] { adminRole } }, "Không tự cấp quyền ADMIN khi đăng ký công khai", 403);
    using var admin = await Login("admin_e2e"); using var reception = await Login("reception_e2e");
    using var doctorClient = await Login("doctor_e2e"); using var doctor2 = await Login("doctor2_e2e");
    using var lab = await Login("lab_e2e"); using var lab2 = await Login("lab2_e2e"); using var cashier = await Login("cashier_e2e");
    await Request(anonymous, HttpMethod.Post, "/api/Auth/register", new { tenDangNhap = "pending_e2e", matKhau = password }, "Đăng ký công khai tạo tài khoản chưa có vai trò", 200);
    Check(!await db.NguoiDungVaiTros.AnyAsync(x => x.IdNguoiDungNavigation!.TenDangNhap == "pending_e2e"), "Đăng ký công khai không nhận quyền nghiệp vụ ngầm định");
    using var pending = await Login("pending_e2e");
    await Request(pending, HttpMethod.Get, "/api/LanKham/cho-kham", null, "Tài khoản chưa được cấp vai trò không được mở khám bệnh", 403);
    var doctorRole = await db.VaiTros.Where(x => x.Ten == "BAC_SI").Select(x => x.Id).SingleAsync();
    await Request(admin, HttpMethod.Post, "/api/Auth/register", new { tenDangNhap = "assigned_e2e", matKhau = password, vaiTroIds = new[] { doctorRole } }, "Quản trị viên được tạo tài khoản kèm vai trò", 200);
    await Request(reception, HttpMethod.Patch, "/api/users/vaitroquyen/" + adminRole, Array.Empty<object>(), "Tiếp đón không được sửa phân quyền", 403);
    var patientRequest = new PatientCreateRequest { Ho_ten = "Bệnh nhân mô phỏng E2E", Ngay_sinh = new(1995, 1, 1), Gioi_tinh = "Nam", CCCD = "000000900001", So_dien_thoai = "0909000901", Dia_chi_tinh = "Kiểm thử", Dia_chi_xa = "Kiểm thử", IdempotencyKey = "patient-e2e" };
    await Request(cashier, HttpMethod.Post, "/api/tiepdon/v2/patients/upsert", patientRequest, "Thu ngân không được tạo tiếp đón", 403);
    var patient = await Request(reception, HttpMethod.Post, "/api/tiepdon/v2/patients/upsert", patientRequest, "Tiếp đón tạo bệnh nhân mô phỏng", 200);
    var patientId = patient["patient"]!["id"]!.GetValue<long>();
    await Request(reception, HttpMethod.Post, "/api/tiepdon/v2/patients/upsert", patientRequest, "Lưu lặp bệnh nhân với cùng khóa yêu cầu", 200);
    Check(await db.BenhNhans.CountAsync() == 1, "Lưu lặp không tạo trùng bệnh nhân");
    var intake = new ReceptionCreateRecordRequest { IdBenhNhan = patientId, IdNguoiTao = users["reception_e2e"], ChuyenSangDangKyDichVu = true, IdempotencyKey = "encounter-e2e", SinhHieu = new() { NhietDo = 37, NhipTim = 75, HuyetApTamThu = 120, HuyetApTamTruong = 80, NhipTho = 18, SpO2 = 98, ChieuCao = 170, CanNang = 65 }, ThongTinTiepDon = new() { IdKhuTiepDon = area.Id, IdQuayTiepDon = counter.Id, NguonTiepNhan = "Trực tiếp", LoaiKham = "Khám mới", LyDoKham = "Ca mô phỏng phục vụ kiểm thử", MucUuTien = "Thường", DoiTuongThanhToan = "Tự phí" } };
    var encounter = await Request(reception, HttpMethod.Post, "/api/tiepdon/v2/encounters/save", intake, "Lưu hồ sơ và sinh hiệu", 200);
    var encounterId = encounter["encounter"]!["id"]!.GetValue<long>();
    await Request(reception, HttpMethod.Post, "/api/tiepdon/v2/encounters/save", intake, "Lưu lặp hồ sơ có cùng khóa yêu cầu", 200);
    Check(await db.HoSoBenhAns.CountAsync() == 1, "Không tạo trùng hồ sơ đang hoạt động");
    await Request(reception, HttpMethod.Post, "/api/chidinh/v2/service-orders/confirm", new ServiceOrderRequestDto { EncounterId = encounterId, PatientId = patientId, ServiceIds = new() { otherService.Id }, ForceRequirePayment = true }, "Chặn dịch vụ khác khu", 400);
    var order = new ServiceOrderRequestDto { EncounterId = encounterId, PatientId = patientId, ServiceIds = new() { service.Id }, ForceRequirePayment = true, AllowQueueBeforePayment = false, IdempotencyKey = "order-e2e" };
    await Request(reception, HttpMethod.Post, "/api/chidinh/v2/service-orders/confirm", order, "Đăng ký dịch vụ và lập hóa đơn khám", 200);
    Check(!await db.LanKhams.AnyAsync(x => x.IdPhong != null), "Chưa thanh toán thì chưa tạo hàng đợi phòng khám");
    var examInvoice = await db.HoaDons.AsNoTracking().SingleAsync();
    Check(examInvoice.TongTien == 100000, "Đơn giá khám lấy từ database");
    await Request(reception, HttpMethod.Put, $"/api/HoaDon/xac-nhan-thanh-toan/{examInvoice.Id}", users["cashier_e2e"], "Tiếp đón không thể xác nhận thu tiền", 403);
    await Request(cashier, HttpMethod.Put, $"/api/HoaDon/xac-nhan-thanh-toan/ma/{examInvoice.MaHd}", new { hinhThucThanhToan = "VNPAY" }, "Không cho xác nhận VNPay thủ công thay callback", 400);
    await Request(cashier, HttpMethod.Put, $"/api/HoaDon/xac-nhan-thanh-toan/{examInvoice.Id}", users["cashier_e2e"], "Thu ngân xác nhận tiền khám", 200);
    await Request(cashier, HttpMethod.Put, $"/api/HoaDon/xac-nhan-thanh-toan/{examInvoice.Id}", users["cashier_e2e"], "Chặn thanh toán hóa đơn hai lần", 400);
    var visit = await db.LanKhams.AsNoTracking().SingleAsync(x => x.IdPhong == room.Id);
    Check(visit.IdSinhHieu.HasValue, "Lượt vào phòng khám giữ liên kết sinh hiệu tiếp đón");
    await Request(doctorClient, HttpMethod.Patch, $"/api/LanKham/{visit.Id}/start", null, "Bác sĩ bắt đầu khám đúng phòng", 200);
    await Request(doctor2, HttpMethod.Patch, $"/api/LanKham/{visit.Id}/start", null, "Bác sĩ khác không chiếm lượt đã nhận", 400, 403);
    await Request(doctor2, HttpMethod.Get, $"/api/LanKham/lan-kham/{visit.Id}/detail", null, "Bác sĩ khác không đọc chi tiết lượt ngoài phạm vi", 400, 403);
    await Request(doctorClient, HttpMethod.Put, $"/api/LanKham/{visit.Id}", new LanKhamUpdateDto(), "Chặn kết luận thiếu dữ liệu", 400);
    await Request(doctorClient, HttpMethod.Post, "/api/bacsi/dvkt/chidinh", new CreateChiDinhDVKTDto { IdLanKham = visit.Id, IdBacSi = users["doctor_e2e"], IdDVKT = labService.Id, SoLuong = 1 }, "Bác sĩ chỉ định cận lâm sàng", 200);
    var indication = await db.ChiDinhDvkts.AsNoTracking().SingleAsync();
    var labInvoice = await db.HoaDons.AsNoTracking().SingleAsync(x => x.LoaiHoaDon == "DVKT");
    await Request(lab, HttpMethod.Patch, $"/api/ktv/dvkt/nhan/{indication.Id}", null, "Cận lâm sàng chưa thu tiền phải bị chặn", 402);
    await Request(cashier, HttpMethod.Put, $"/api/HoaDon/xac-nhan-thanh-toan/{labInvoice.Id}", users["cashier_e2e"], "Thu ngân xác nhận tiền cận lâm sàng", 200);
    await Request(cashier, HttpMethod.Patch, $"/api/ktv/dvkt/nhan/{indication.Id}", null, "Thu ngân không được nhận làm cận lâm sàng", 403);
    await Request(lab, HttpMethod.Patch, $"/api/ktv/dvkt/nhan/{indication.Id}", null, "Kỹ thuật viên nhận chỉ định đã thanh toán", 200);
    await Request(lab2, HttpMethod.Patch, $"/api/ktv/dvkt/nhan/{indication.Id}", null, "Chặn hai kỹ thuật viên nhận cùng chỉ định", 409);
    var conclusion = new LanKhamUpdateDto { ChanDoanCuoi = "Chẩn đoán mô phỏng", IdBenh = disease.Id, KetQuaKham = "Kết quả mô phỏng chỉ phục vụ kiểm thử", HuongXuTri = "Cho về", GhiChu = "Lời dặn mô phỏng, không sử dụng để điều trị." };
    await Request(doctorClient, HttpMethod.Put, $"/api/LanKham/{visit.Id}", conclusion, "Chặn kết luận khi cận lâm sàng chưa có kết quả", 400);
    await Request(lab, HttpMethod.Patch, $"/api/ktv/dvkt/hoanthanh/{indication.Id}", null, "Chặn hoàn thành cận lâm sàng chưa nhập kết quả", 400);
    var result = new { idChiDinhDVKT = indication.Id, ketQuaText = "Kết quả mô phỏng E2E, không dùng cho chăm sóc người bệnh." };
    await Request(lab2, HttpMethod.Post, "/api/ktv/dvkt/ketqua", result, "Kỹ thuật viên khác không sửa kết quả đang phụ trách", 403);
    await Request(lab, HttpMethod.Post, "/api/ktv/dvkt/ketqua", result, "Nhập nội dung kết quả mô phỏng", 200);
    await Request(lab, HttpMethod.Patch, $"/api/ktv/dvkt/hoanthanh/{indication.Id}", null, "Hoàn thành cận lâm sàng", 200);
    await Request(lab, HttpMethod.Patch, $"/api/ktv/dvkt/duyet/{indication.Id}", null, "Duyệt kết quả", 200);
    await Request(lab, HttpMethod.Patch, $"/api/ktv/dvkt/send/{indication.Id}", null, "Gửi kết quả và tạo PDF", 200);
    Check(Directory.GetFiles(Path.Combine(scratch, "wwwroot/pdf-ketqua"), "*.pdf").Any(f => new FileInfo(f).Length > 1000), "PDF kết quả được tạo trong thư mục kiểm thử riêng");
    await Request(lab, HttpMethod.Post, "/api/ktv/dvkt/ketqua", result, "Kết quả đã gửi không được sửa trực tiếp", 400);
    var prescription = new DonThuocCreateDto { IdLanKham = visit.Id, IdBenhNhan = patientId, IdBacSi = users["doctor_e2e"], SoNgayUong = 1, GhiChu = "Đơn mô phỏng kiểm thử", ChiTiet = new() { new() { IdThuoc = drug.Id, SoLuong = 2, Sang = 1, Toi = 1, SoNgayUong = 1, DonVi = "vien" } } };
    await Request(doctorClient, HttpMethod.Post, "/api/DonThuoc", prescription, "Bác sĩ tạo đơn thuốc mô phỏng", 200);
    Check(await db.Thuocs.Where(x => x.Id == drug.Id).Select(x => x.SoLuongTon).SingleAsync() == 98, "Tồn thuốc trừ đúng số lượng kê");
    await Request(doctorClient, HttpMethod.Post, "/api/DonThuoc", prescription, "Chặn tạo trùng đơn thuốc", 400);
    await Request(doctorClient, HttpMethod.Put, $"/api/LanKham/{visit.Id}", conclusion, "Kết luận sau khi nhận đầy đủ kết quả cận lâm sàng", 200);
    var prescriptionId = await db.DonThuocs.Select(x => x.Id).SingleAsync();
    await Request(cashier, HttpMethod.Post, "/api/HoaDon/tao-hoa-don-thuoc", new { idDonThuoc = prescriptionId }, "Lập hóa đơn từ đơn thuốc", 200);
    var drugInvoice = await db.HoaDons.AsNoTracking().SingleAsync(x => x.LoaiHoaDon == "THUOC");
    Check(drugInvoice.TongTien == 2000, "Giá thuốc tính từ dữ liệu đơn thuốc");
    await Request(cashier, HttpMethod.Put, $"/api/HoaDon/xac-nhan-thanh-toan/{drugInvoice.Id}", users["cashier_e2e"], "Thanh toán thuốc hoàn tất ca mô phỏng", 200);
    Check(await db.HoaDons.CountAsync(x => x.TrangThai == "DA_THANH_TOAN") == 3, "Cả ba hóa đơn khám, cận lâm sàng, thuốc đều đã thu");
    Check(await db.HoaDons.SumAsync(x => x.TongTien) == 152000, "Đối chiếu tổng tiền xuyên suốt 152000 đồng mô phỏng");
    Check(await db.KhamBenhAuditLogs.AnyAsync(x => x.IdLanKham == visit.Id), "Có nhật ký thao tác khám bệnh");
    var analytics = await new VisitAnalyticsService(db).BuildAsync(DateTime.Today, DateTime.Today, 6, 6, default);
    Check(analytics.ValidCount == 1, "Thống kê một lượt khám thực, không đếm thêm lượt nền của tiếp đón");
    await db.NguoiDungVaiTros.Where(x => x.IdNguoiDung == users["doctor2_e2e"]).ExecuteDeleteAsync();
    await Request(doctor2, HttpMethod.Get, "/api/LanKham/cho-kham", null, "Vai trò đã thu hồi bị chặn dù JWT chưa hết hạn", 403);
    Check(true, "Hoàn tất luồng tiếp đón → thu ngân → bác sĩ → cận lâm sàng → đơn thuốc → thanh toán");
}
catch (Exception ex)
{
    Console.WriteLine(ex.ToString()); Environment.ExitCode = 1;
}
finally
{
    if (app != null) { await app.StopAsync(); await app.DisposeAsync(); }
    Directory.SetCurrentDirectory(originalDirectory);
    SqlConnection.ClearAllPools();
    if (created)
    {
        if (!Regex.IsMatch(name, "^DACN_E2E_[a-f0-9]{12}$")) throw new Exception("Unsafe cleanup target.");
        using var connection = new SqlConnection(master.ConnectionString); await connection.OpenAsync();
        using var command = new SqlCommand($"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];", connection);
        await command.ExecuteNonQueryAsync();
        Console.WriteLine("Removed only the isolated E2E database.");
    }
    Directory.CreateDirectory(output);
    await File.WriteAllTextAsync(Path.Combine(output, "KiemThuQuyTrinh.json"), JsonSerializer.Serialize(new
    { startedAt = started, completedAt = DateTimeOffset.UtcNow, dataKind = "synthetic", isolatedDatabase = true, passed, success = Environment.ExitCode == 0, checks }, new JsonSerializerOptions { WriteIndented = true }));
}
Console.WriteLine($"Workflow: {passed} checks passed.");
