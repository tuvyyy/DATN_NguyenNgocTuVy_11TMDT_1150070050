using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using Microsoft.AspNetCore.HttpOverrides;
using System.Security.Claims;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Hubs;

var builder = WebApplication.CreateBuilder(args);

// ======================================================
// JSON UTF8 
// ======================================================
Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
});

// ======================================================
// DATABASE
// ======================================================
builder.Services.AddDbContext<DACNDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// ======================================================
// DEPENDENCY INJECTION
// ======================================================
builder.Services.AddScoped<ICodeGenerator, CodeGenerator>();
builder.Services.AddScoped<PricingService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<DonThuocValidatorService>();
builder.Services.AddScoped<IHoaDonService, HoaDonService>();
builder.Services.AddScoped<IHoSoTrangThaiService, HoSoTrangThaiService>();
builder.Services.AddScoped<IKhamBenhAuditService, KhamBenhAuditService>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddSignalR().AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
});

// ======================================================
// CORS
// ======================================================
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("AllowReactApp", p =>
        p.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;

            // Dev: cho phép UI chạy ở mọi port localhost (3000/3001/...)
            return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                || uri.Host.Equals("127.0.0.1");
        })
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials());
});

// ======================================================
// JWT AUTH
// ======================================================
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.RequireHttpsMetadata = false;
    opt.SaveToken = true;

    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

        NameClaimType = "sub",
        RoleClaimType = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

    };
    opt.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var token = context.Request.Query["access_token"];
            if (!string.IsNullOrWhiteSpace(token)
                && context.HttpContext.Request.Path.StartsWithSegments("/hubs/operations"))
                context.Token = token;
            return Task.CompletedTask;
        }
    };
});

// ======================================================
// CONTROLLERS + SWAGGER
// ======================================================
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
});


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "DACN API", Version = "v1" });

    var security = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    };

    c.AddSecurityDefinition("Bearer", security);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { security, new string[]{} }
    });
});

var app = builder.Build();

// ======================================================
// RECEPTION V2 DB BOOTSTRAP (SAFE IF-NOT-EXISTS)
// ======================================================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DACNDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("ReceptionBootstrap");

    try
    {
        db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID('dbo.system_notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.system_notifications
    (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        title NVARCHAR(180) NOT NULL,
        message NVARCHAR(2000) NOT NULL,
        severity VARCHAR(20) NOT NULL CONSTRAINT DF_system_notifications_severity DEFAULT ('INFO'),
        target_role VARCHAR(80) NULL,
        target_user_id BIGINT NULL,
        created_by_user_id BIGINT NULL,
        created_at DATETIME NOT NULL CONSTRAINT DF_system_notifications_created DEFAULT (GETDATE()),
        expires_at DATETIME NULL
    );
    CREATE INDEX IX_system_notifications_created ON dbo.system_notifications(created_at DESC);
END

IF OBJECT_ID('dbo.system_notification_reads', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.system_notification_reads
    (
        notification_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        read_at DATETIME NOT NULL CONSTRAINT DF_system_notification_reads_at DEFAULT (GETDATE()),
        CONSTRAINT PK_system_notification_reads PRIMARY KEY(notification_id, user_id),
        CONSTRAINT FK_system_notification_reads_notification FOREIGN KEY(notification_id)
            REFERENCES dbo.system_notifications(id) ON DELETE CASCADE
    );
END

IF OBJECT_ID('dbo.support_requests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.support_requests
    (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        requester_user_id BIGINT NOT NULL,
        subject NVARCHAR(180) NOT NULL,
        description NVARCHAR(3000) NOT NULL,
        category VARCHAR(40) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        page_url NVARCHAR(1000) NULL,
        route NVARCHAR(300) NULL,
        user_agent NVARCHAR(1000) NULL,
        context_json NVARCHAR(MAX) NULL,
        admin_note NVARCHAR(3000) NULL,
        assigned_to_user_id BIGINT NULL,
        created_at DATETIME NOT NULL CONSTRAINT DF_support_requests_created DEFAULT (GETDATE()),
        updated_at DATETIME NOT NULL CONSTRAINT DF_support_requests_updated DEFAULT (GETDATE()),
        resolved_at DATETIME NULL
    );
    CREATE INDEX IX_support_requests_status_time ON dbo.support_requests(status, created_at DESC);
END
");

        db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID('dbo.tiepdon_trangthai_logs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tiepdon_trangthai_logs
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        id_ho_so BIGINT NOT NULL,
        from_trang_thai VARCHAR(30) NULL,
        to_trang_thai VARCHAR(30) NOT NULL,
        action VARCHAR(80) NOT NULL,
        note NVARCHAR(500) NULL,
        id_nguoi_dung BIGINT NULL,
        created_at DATETIME NOT NULL CONSTRAINT DF_tiepdon_trangthai_logs_created_at DEFAULT (GETDATE()),
        metadata NVARCHAR(MAX) NULL,
        CONSTRAINT PK_tiepdon_trangthai_logs PRIMARY KEY CLUSTERED (id)
    );

    ALTER TABLE dbo.tiepdon_trangthai_logs
        ADD CONSTRAINT FK_tiepdon_trangthai_logs_ho_so
            FOREIGN KEY (id_ho_so) REFERENCES dbo.ho_so_benh_an(id) ON DELETE CASCADE;

    ALTER TABLE dbo.tiepdon_trangthai_logs
        ADD CONSTRAINT FK_tiepdon_trangthai_logs_nguoi_dung
            FOREIGN KEY (id_nguoi_dung) REFERENCES dbo.nguoi_dung(id);
END

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tiepdon_trangthai_logs')
      AND name = 'IX_tiepdon_trangthai_logs_hoso_time'
)
BEGIN
    CREATE INDEX IX_tiepdon_trangthai_logs_hoso_time
        ON dbo.tiepdon_trangthai_logs(id_ho_so, created_at DESC);
END
");

        db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID('dbo.permission_audit_logs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.permission_audit_logs
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        entity_type VARCHAR(30) NOT NULL,
        entity_id BIGINT NULL,
        action VARCHAR(100) NOT NULL,
        changed_by_user_id BIGINT NULL,
        changed_by_username NVARCHAR(150) NULL,
        target_user_id BIGINT NULL,
        target_role_id INT NULL,
        note NVARCHAR(500) NULL,
        before_data NVARCHAR(MAX) NULL,
        after_data NVARCHAR(MAX) NULL,
        created_at DATETIME NOT NULL CONSTRAINT DF_permission_audit_logs_created_at DEFAULT (GETDATE()),
        CONSTRAINT PK_permission_audit_logs PRIMARY KEY CLUSTERED (id)
    );
END

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.permission_audit_logs')
      AND name = 'IX_permission_audit_logs_created_at'
)
BEGIN
    CREATE INDEX IX_permission_audit_logs_created_at ON dbo.permission_audit_logs(created_at DESC);
END

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.permission_audit_logs')
      AND name = 'IX_permission_audit_logs_target_user'
)
BEGIN
    CREATE INDEX IX_permission_audit_logs_target_user ON dbo.permission_audit_logs(target_user_id, created_at DESC);
END

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.permission_audit_logs')
      AND name = 'IX_permission_audit_logs_target_role'
)
BEGIN
    CREATE INDEX IX_permission_audit_logs_target_role ON dbo.permission_audit_logs(target_role_id, created_at DESC);
END
");

        db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH('dbo.ho_so_benh_an', 'ngay_tao_date') IS NULL
BEGIN
    ALTER TABLE dbo.ho_so_benh_an
        ADD ngay_tao_date AS CONVERT(date, ngay_tao) PERSISTED;
END

DECLARE @needRecreateActiveIdx BIT = 0;
IF EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ho_so_benh_an')
      AND name = 'UX_ho_so_benh_an_bn_day_active'
      AND (
            filter_definition IS NULL
            OR filter_definition NOT LIKE '%DA_HUY%'
          )
)
BEGIN
    SET @needRecreateActiveIdx = 1;
END

IF @needRecreateActiveIdx = 1
BEGIN
    DROP INDEX UX_ho_so_benh_an_bn_day_active ON dbo.ho_so_benh_an;
END

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ho_so_benh_an')
      AND name = 'UX_ho_so_benh_an_bn_day_active'
)
AND NOT EXISTS
(
    SELECT 1
    FROM dbo.ho_so_benh_an h
    WHERE h.id_benh_nhan IS NOT NULL
      AND h.ngay_tao IS NOT NULL
      AND (h.trang_thai IS NULL OR (h.trang_thai <> 'HUY' AND h.trang_thai <> 'DA_HUY'))
    GROUP BY h.id_benh_nhan, CONVERT(date, h.ngay_tao)
    HAVING COUNT(1) > 1
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_ho_so_benh_an_bn_day_active
        ON dbo.ho_so_benh_an(id_benh_nhan, ngay_tao_date)
        WHERE id_benh_nhan IS NOT NULL
          AND ngay_tao IS NOT NULL
          AND trang_thai <> 'HUY'
          AND trang_thai <> 'DA_HUY';
END
");

        db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH('dbo.benh_nhan', 'nguoi_lien_he_khan_cap') IS NULL
    ALTER TABLE dbo.benh_nhan ADD nguoi_lien_he_khan_cap NVARCHAR(120) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'sdt_lien_he_khan_cap') IS NULL
    ALTER TABLE dbo.benh_nhan ADD sdt_lien_he_khan_cap VARCHAR(20) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'quan_he_lien_he_khan_cap') IS NULL
    ALTER TABLE dbo.benh_nhan ADD quan_he_lien_he_khan_cap NVARCHAR(60) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'nguoi_giam_ho') IS NULL
    ALTER TABLE dbo.benh_nhan ADD nguoi_giam_ho NVARCHAR(120) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'sdt_giam_ho') IS NULL
    ALTER TABLE dbo.benh_nhan ADD sdt_giam_ho VARCHAR(20) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'quan_he_giam_ho') IS NULL
    ALTER TABLE dbo.benh_nhan ADD quan_he_giam_ho NVARCHAR(60) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'ghi_chu_dinh_danh') IS NULL
    ALTER TABLE dbo.benh_nhan ADD ghi_chu_dinh_danh NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.benh_nhan', 'is_potential_duplicate') IS NULL
BEGIN
    ALTER TABLE dbo.benh_nhan ADD is_potential_duplicate BIT NULL;
    ALTER TABLE dbo.benh_nhan ADD CONSTRAINT DF_benh_nhan_is_potential_duplicate DEFAULT(0) FOR is_potential_duplicate;
END

IF EXISTS(
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='benh_nhan' AND COLUMN_NAME='dia_chi_xa' AND DATA_TYPE='varchar'
)
BEGIN
    ALTER TABLE dbo.benh_nhan ALTER COLUMN dia_chi_xa NVARCHAR(100) NULL;
END

IF EXISTS(
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='benh_nhan' AND COLUMN_NAME='dia_chi_huyen' AND DATA_TYPE='varchar'
)
BEGIN
    ALTER TABLE dbo.benh_nhan ALTER COLUMN dia_chi_huyen NVARCHAR(100) NULL;
END

-- Normalize empty identity/phone values so filtered unique indexes can work consistently
UPDATE dbo.benh_nhan
SET cccd = NULL
WHERE cccd IS NOT NULL AND LTRIM(RTRIM(cccd)) = '';

UPDATE dbo.benh_nhan
SET so_dien_thoai = NULL
WHERE so_dien_thoai IS NOT NULL AND LTRIM(RTRIM(so_dien_thoai)) = '';

-- Recreate CCCD uniqueness as filtered index (allow many NULL values)
IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.benh_nhan')
      AND [name] = 'UQ_BenhNhan_CCCD'
)
BEGIN
    ALTER TABLE dbo.benh_nhan DROP CONSTRAINT UQ_BenhNhan_CCCD;
END

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.benh_nhan')
      AND [name] = 'UQ_BenhNhan_CCCD'
)
BEGIN
    DROP INDEX UQ_BenhNhan_CCCD ON dbo.benh_nhan;
END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.benh_nhan
    WHERE cccd IS NOT NULL
    GROUP BY cccd
    HAVING COUNT(1) > 1
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_BenhNhan_CCCD
        ON dbo.benh_nhan(cccd)
        WHERE cccd IS NOT NULL;
END

-- Recreate phone uniqueness as filtered index (allow many NULL values)
IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.benh_nhan')
      AND [name] = 'UQ_BenhNhan_SDT'
)
BEGIN
    ALTER TABLE dbo.benh_nhan DROP CONSTRAINT UQ_BenhNhan_SDT;
END

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.benh_nhan')
      AND [name] = 'UQ_BenhNhan_SDT'
)
BEGIN
    DROP INDEX UQ_BenhNhan_SDT ON dbo.benh_nhan;
END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.benh_nhan
    WHERE so_dien_thoai IS NOT NULL
    GROUP BY so_dien_thoai
    HAVING COUNT(1) > 1
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_BenhNhan_SDT
        ON dbo.benh_nhan(so_dien_thoai)
        WHERE so_dien_thoai IS NOT NULL;
END
");

        db.Database.ExecuteSqlRaw(@"
-- Ensure the clinical-services module is available in the permission matrix.
IF NOT EXISTS (SELECT 1 FROM dbo.chuc_nang WHERE ma_chuc_nang = 'DVKT')
BEGIN
    INSERT INTO dbo.chuc_nang (ma_chuc_nang, ten, mo_ta)
    VALUES ('DVKT', 'Can lam sang', 'Thuc hien va tra ket qua dich vu ky thuat');
END

DECLARE @DvktFeatureId INT = (
    SELECT TOP (1) id FROM dbo.chuc_nang WHERE ma_chuc_nang = 'DVKT'
);

IF NOT EXISTS (SELECT 1 FROM dbo.quyen WHERE ma_quyen = 'DVKT_FULL')
BEGIN
    INSERT INTO dbo.quyen (id_chuc_nang, ma_quyen, xem, them, sua, xoa, xuat)
    VALUES (@DvktFeatureId, 'DVKT_FULL', 1, 1, 1, 1, 1);
END
ELSE
BEGIN
    UPDATE dbo.quyen
    SET id_chuc_nang = @DvktFeatureId,
        xem = 1,
        them = 1,
        sua = 1,
        xoa = 1,
        xuat = 1
    WHERE ma_quyen = 'DVKT_FULL';
END

IF NOT EXISTS (SELECT 1 FROM dbo.vai_tro WHERE ten = 'KY_THUAT_VIEN')
BEGIN
    INSERT INTO dbo.vai_tro (ten, mo_ta)
    VALUES ('KY_THUAT_VIEN', 'Nhan vien can lam sang');
END

DECLARE @DvktRoleId INT = (
    SELECT TOP (1) id FROM dbo.vai_tro WHERE ten = 'KY_THUAT_VIEN'
);
DECLARE @DvktPermissionId INT = (
    SELECT TOP (1) id FROM dbo.quyen WHERE ma_quyen = 'DVKT_FULL'
);

IF NOT EXISTS (
    SELECT 1
    FROM dbo.vai_tro_quyen
    WHERE id_vai_tro = @DvktRoleId AND id_quyen = @DvktPermissionId
)
BEGIN
    INSERT INTO dbo.vai_tro_quyen (id_vai_tro, id_quyen, xem, them, sua, xoa, xuat)
    VALUES (@DvktRoleId, @DvktPermissionId, 1, 1, 1, 1, 1);
END
");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Reception bootstrap SQL failed. App continues with existing schema.");
    }
}

// ======================================================
// MIDDLEWARE PIPELINE — THỨ TỰ CHUẨN
// ======================================================

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

// MUST BE BEFORE Authentication
app.UseRouting();

app.UseCors("AllowReactApp");

// MUST BE BETWEEN Routing and Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<OperationsHub>("/hubs/operations");

app.Run();

