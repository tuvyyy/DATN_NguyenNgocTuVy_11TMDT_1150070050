using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers
{
    // ============================================================
    // DTOs
    // ============================================================
    public class RoleSimpleDto
    {
        public int Id { get; set; }
        public string Ten { get; set; } = "";
    }

    public class PermissionDetailDto
    {
        public int IdQuyen { get; set; }
        public int IdChucNang { get; set; }
        public string MaChucNang { get; set; } = "";
        public string TenChucNang { get; set; } = "";
        public string MaQuyen { get; set; } = "";
        public bool Xem { get; set; }
        public bool Them { get; set; }
        public bool Sua { get; set; }
        public bool Xoa { get; set; }
        public bool Xuat { get; set; }
    }

    public class UserPermissionsResponse
    {
        public long Id { get; set; }
        public string TenDangNhap { get; set; } = "";
        public string? HoTen { get; set; }
        public List<RoleSimpleDto> Roles { get; set; } = new();
        public List<PermissionDetailDto> Permissions { get; set; } = new();
    }

    public class RoleMemberDto
    {
        public long Id { get; set; }
        public string TenDangNhap { get; set; } = "";
        public string? HoTen { get; set; }
        public string? ChucDanh { get; set; }
        public string? KhoaPhong { get; set; }
        public bool HoatDong { get; set; }
        public List<string> Roles { get; set; } = new();
    }

    public class ReceptionPresetRequest
    {
        public string Preset { get; set; } = "";
    }

    public class ClonePermissionsRequest
    {
        public long SourceUserId { get; set; }
        public long TargetUserId { get; set; }
    }

    public class UserDataScopeUpdateRequest
    {
        public List<int> RoomIds { get; set; } = new();
    }

    public class RoomScopeDto
    {
        public int Id { get; set; }
        public string MaPhong { get; set; } = "";
        public string TenPhong { get; set; } = "";
        public string KhoaPhong { get; set; } = "";
        public bool HoatDong { get; set; }
    }

    public class UndoPermissionChangeRequest
    {
        public long? UserId { get; set; }
        public int? RoleId { get; set; }
    }

    public class PermissionAuditDto
    {
        public long Id { get; set; }
        public string EntityType { get; set; } = "";
        public long? EntityId { get; set; }
        public string Action { get; set; } = "";
        public long? ChangedByUserId { get; set; }
        public string? ChangedByUsername { get; set; }
        public long? TargetUserId { get; set; }
        public int? TargetRoleId { get; set; }
        public string? Note { get; set; }
        public string? BeforeData { get; set; }
        public string? AfterData { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PermissionConflictItemDto
    {
        public int IdQuyen { get; set; }
        public string MaQuyen { get; set; } = "";
        public string MaChucNang { get; set; } = "";
        public string TenChucNang { get; set; } = "";
        public List<string> Roles { get; set; } = new();
        public List<string> ConflictActions { get; set; } = new();
        public bool HasOverlap { get; set; }
    }

    // ============================================================
    // Controller: UserAccess
    // ============================================================
    [ApiController]
    [Authorize]
    [Route("api/users")]
    public class UserAccessController : ControllerBase
    {
        private readonly DACNDbContext _db;
        public UserAccessController(DACNDbContext db) => _db = db;


        [HttpGet("vaitro")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _db.VaiTros
                .Select(v => new { v.Id, v.Ten, v.MoTa })
                .ToListAsync();
            return Ok(roles);
        }

        // 2️⃣ Lấy danh sách quyền
        [HttpGet("quyen")]
        public async Task<IActionResult> GetPermissions()
        {
            var perms = await _db.Quyens
                .Include(q => q.IdChucNangNavigation)
                .Select(q => new
                {
                    q.Id,
                    q.MaQuyen,
                    q.IdChucNang,
                    MaChucNang = q.IdChucNangNavigation.MaChucNang,
                    TenChucNang = q.IdChucNangNavigation.Ten,
                    q.Xem,
                    q.Them,
                    q.Sua,
                    q.Xoa,
                    q.Xuat
                })
                .ToListAsync();
            return Ok(perms);
        }

        [HttpGet("vaitroquyen")]
        public async Task<IActionResult> GetRolePermissions([FromQuery] int roleId)
        {
            var roleName = await _db.VaiTros
                .Where(v => v.Id == roleId)
                .Select(v => v.Ten)
                .FirstOrDefaultAsync();
            if (roleName == null)
                return NotFound(new { message = "Không tìm thấy vai trò." });

            var rolePerms = await (
                from vtq in _db.VaiTroQuyens
                join q in _db.Quyens on vtq.IdQuyen equals q.Id
                join cn in _db.ChucNangs on q.IdChucNang equals cn.Id
                where vtq.IdVaiTro == roleId
                select new
                {
                    vtq.Id,
                    vtq.IdVaiTro,
                    IdQuyen = q.Id,
                    q.MaQuyen,
                    MaChucNang = cn.MaChucNang,
                    TenChucNang = cn.Ten,

                    // ✅ Dữ liệu quyền lấy từ bảng VaiTroQuyen
                    Xem = vtq.Xem,
                    Them = vtq.Them,
                    Sua = vtq.Sua,
                    Xoa = vtq.Xoa,
                    Xuat = vtq.Xuat
                }).ToListAsync();

            var sanitized = rolePerms.Select(v =>
            {
                var allowedForRole = IsRoleAllowedForFeature(roleName, v.MaChucNang);
                return new
                {
                    v.Id,
                    v.IdVaiTro,
                    v.IdQuyen,
                    v.MaQuyen,
                    v.MaChucNang,
                    v.TenChucNang,
                    Xem = allowedForRole && v.Xem == true,
                    Them = allowedForRole && v.Them == true,
                    Sua = allowedForRole && v.Sua == true,
                    Xoa = allowedForRole && v.Xoa == true,
                    Xuat = allowedForRole && v.Xuat == true
                };
            });

            return Ok(sanitized);
        }

        [HttpGet("vaitro/{roleId:int}/members")]
        public async Task<IActionResult> GetRoleMembers(int roleId)
        {
            var exists = await _db.VaiTros.AnyAsync(x => x.Id == roleId);
            if (!exists)
                return NotFound(new { message = "Không tìm thấy vai trò." });

            var members = await _db.NguoiDungs
                .Where(u => u.NguoiDungVaiTros.Any(vt => vt.IdVaiTro == roleId))
                .OrderBy(u => u.HoTen)
                .ThenBy(u => u.TenDangNhap)
                .Select(u => new RoleMemberDto
                {
                    Id = u.Id,
                    TenDangNhap = u.TenDangNhap,
                    HoTen = u.HoTen,
                    ChucDanh = u.ChucDanh,
                    KhoaPhong = u.KhoaPhong,
                    HoatDong = u.HoatDong ?? false,
                    Roles = u.NguoiDungVaiTros
                        .Where(v => v.IdVaiTroNavigation != null)
                        .Select(v => v.IdVaiTroNavigation!.Ten)
                        .Distinct()
                        .ToList()
                })
                .ToListAsync();

            return Ok(members);
        }

        public class RolePermissionUpdateDto
        {
            public int IdQuyen { get; set; }
            public bool Xem { get; set; }
            public bool Them { get; set; }
            public bool Sua { get; set; }
            public bool Xoa { get; set; }
            public bool Xuat { get; set; }
        }

        private static readonly Dictionary<string, string[]> FeatureRoleMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["KHAM_BENH"] = new[] { "BAC_SI" },
            ["TIEP_DON"] = new[] { "TIEP_DON", "TIEP_DON_PRESET_FULL", "TIEP_DON_PRESET_CHI_XEM" },
            ["THANH_TOAN"] = new[] { "THU_NGAN" },
            ["DVKT"] = new[] { "KY_THUAT_VIEN", "KTV", "CAN_LAM_SANG" },
            ["THUOC"] = new[] { "DUOC", "DUOC_SI" },
            ["DICH_VU"] = new[] { "TIEP_DON", "TIEP_DON_PRESET_FULL" },
            ["BAO_CAO"] = new[]
            {
                "TIEP_DON",
                "TIEP_DON_PRESET_FULL",
                "TIEP_DON_PRESET_CHI_XEM",
                "BAC_SI",
                "THU_NGAN",
                "KY_THUAT_VIEN",
                "KTV",
                "CAN_LAM_SANG",
                "DUOC",
                "DUOC_SI"
            }
        };

        private static bool IsAdminRole(IEnumerable<string> roleNames)
        {
            return roleNames.Any(role =>
                string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(role, "QUAN_TRI", StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsRoleAllowedForFeature(string? roleName, string? feature)
        {
            if (string.IsNullOrWhiteSpace(roleName) || string.IsNullOrWhiteSpace(feature))
                return false;

            var normalizedRole = roleName.Trim().ToUpperInvariant();
            if (normalizedRole is "ADMIN" or "QUAN_TRI") return true;

            var normalizedFeature = feature.Trim().ToUpperInvariant();
            return FeatureRoleMap.TryGetValue(normalizedFeature, out var allowedRoles)
                && allowedRoles.Any(role => string.Equals(role, normalizedRole, StringComparison.OrdinalIgnoreCase));
        }

        private static bool HasRequiredRoleForFeature(IEnumerable<string> roleNames, string feature)
        {
            if (IsAdminRole(roleNames)) return true;
            return roleNames.Any(role => IsRoleAllowedForFeature(role, feature));
        }

        [HttpPatch("vaitroquyen/{roleId}")]
        [RequireFeature("PHAN_QUYEN")]
        public async Task<IActionResult> UpdateRolePermissions(int roleId, [FromBody] List<RolePermissionUpdateDto> updates)
        {
            updates ??= new List<RolePermissionUpdateDto>();

            var role = await _db.VaiTros.AsNoTracking().FirstOrDefaultAsync(v => v.Id == roleId);
            if (role == null)
                return NotFound(new { message = "Không tìm thấy vai trò." });

            var permissionIds = updates.Select(x => x.IdQuyen).Distinct().ToList();
            var permissionFeatures = await (
                from q in _db.Quyens
                join cn in _db.ChucNangs on q.IdChucNang equals cn.Id
                where permissionIds.Contains(q.Id)
                select new { q.Id, cn.MaChucNang }
            ).ToDictionaryAsync(x => x.Id, x => x.MaChucNang);

            var beforeSnapshot = await _db.VaiTroQuyens
                .Where(x => x.IdVaiTro == roleId)
                .Select(x => new
                {
                    x.IdQuyen,
                    x.Xem,
                    x.Them,
                    x.Sua,
                    x.Xoa,
                    x.Xuat
                })
                .OrderBy(x => x.IdQuyen)
                .ToListAsync();

            // Xoá quyền cũ
            var existing = _db.VaiTroQuyens.Where(x => x.IdVaiTro == roleId);
            _db.VaiTroQuyens.RemoveRange(existing);

            // Thêm mới
            foreach (var item in updates)
            {
                permissionFeatures.TryGetValue(item.IdQuyen, out var feature);
                var allowedForRole = IsRoleAllowedForFeature(role.Ten, feature);
                _db.VaiTroQuyens.Add(new VaiTroQuyen
                {
                    IdVaiTro = roleId,
                    IdQuyen = item.IdQuyen,
                    Xem = allowedForRole && item.Xem,
                    Them = allowedForRole && item.Them,
                    Sua = allowedForRole && item.Sua,
                    Xoa = allowedForRole && item.Xoa,
                    Xuat = allowedForRole && item.Xuat
                });
            }

            await _db.SaveChangesAsync();

            var actorId = GetActorId();
            var actorUsername = GetActorUsername();
            await WritePermissionAuditAsync(
                entityType: "ROLE",
                entityId: roleId,
                action: "ROLE_PERMISSION_MATRIX_UPDATED",
                changedByUserId: actorId,
                changedByUsername: actorUsername,
                targetUserId: null,
                targetRoleId: roleId,
                beforeData: beforeSnapshot,
                afterData: updates,
                note: "Cap nhat ma tran quyen theo vai tro"
            );

            return Ok(new { message = "Cập nhật quyền chi tiết cho vai trò thành công!" });
        }


        // --------------------------------------------------------
        // 1) GET /api/users/{id}/permissions
        //    -> trả về vai trò và danh sách quyền chi tiết của user
        // --------------------------------------------------------
        [HttpGet("{id:long}/permissions")]
        public async Task<IActionResult> GetUserPermissions(long id)
        {
            // Lấy user + danh sách role
            var user = await _db.NguoiDungs
                .Where(u => u.Id == id)
                .Select(u => new
                {
                    u.Id,
                    u.TenDangNhap,
                    u.HoTen,
                    Roles = u.NguoiDungVaiTros
                        .Select(r => new RoleSimpleDto
                        {
                            Id = r.IdVaiTro.GetValueOrDefault(),
                            Ten = r.IdVaiTroNavigation.Ten
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            var roleIds = user.Roles.Select(r => r.Id).Distinct().ToList();
            if (roleIds.Count == 0)
            {
                return Ok(new UserPermissionsResponse
                {
                    Id = user.Id,
                    TenDangNhap = user.TenDangNhap,
                    HoTen = user.HoTen,
                    Roles = new List<RoleSimpleDto>(),
                    Permissions = new List<PermissionDetailDto>()
                });
            }

            // Lấy toàn bộ quyền của các vai trò đó (distinct theo IdQuyen)
            var rawPerms = await (
                from vtq in _db.VaiTroQuyens
                join q in _db.Quyens on vtq.IdQuyen equals q.Id
                join cn in _db.ChucNangs on q.IdChucNang equals cn.Id
                join vt in _db.VaiTros on vtq.IdVaiTro equals vt.Id
                where roleIds.Contains(vtq.IdVaiTro.GetValueOrDefault())
                select new
                {
                    IdQuyen = q.Id,
                    IdChucNang = cn.Id,
                    MaChucNang = cn.MaChucNang,
                    TenChucNang = cn.Ten,
                    MaQuyen = q.MaQuyen ?? "",
                    RoleName = vt.Ten,
                    RoleXem = vtq.Xem ?? false,
                    RoleThem = vtq.Them ?? false,
                    RoleSua = vtq.Sua ?? false,
                    RoleXoa = vtq.Xoa ?? false,
                    RoleXuat = vtq.Xuat ?? false,
                    PermissionXem = q.Xem ?? false,
                    PermissionThem = q.Them ?? false,
                    PermissionSua = q.Sua ?? false,
                    PermissionXoa = q.Xoa ?? false,
                    PermissionXuat = q.Xuat ?? false
                })
                .ToListAsync();

            var perms = rawPerms.Select(p =>
            {
                var allowedForRole = IsRoleAllowedForFeature(p.RoleName, p.MaChucNang);
                return new PermissionDetailDto
                {
                    IdQuyen = p.IdQuyen,
                    IdChucNang = p.IdChucNang,
                    MaChucNang = p.MaChucNang,
                    TenChucNang = p.TenChucNang,
                    MaQuyen = p.MaQuyen,
                    Xem = allowedForRole && p.RoleXem && p.PermissionXem,
                    Them = allowedForRole && p.RoleThem && p.PermissionThem,
                    Sua = allowedForRole && p.RoleSua && p.PermissionSua,
                    Xoa = allowedForRole && p.RoleXoa && p.PermissionXoa,
                    Xuat = allowedForRole && p.RoleXuat && p.PermissionXuat
                };
            }).ToList();

            // gộp theo IdQuyen (OR các cờ hành động khi user có nhiều vai trò)
            var distinctPerms = perms
                .GroupBy(p => p.IdQuyen)
                .Select(g =>
                {
                    var first = g.First();
                    return new PermissionDetailDto
                    {
                        IdQuyen = first.IdQuyen,
                        IdChucNang = first.IdChucNang,
                        MaChucNang = first.MaChucNang,
                        TenChucNang = first.TenChucNang,
                        MaQuyen = first.MaQuyen,
                        Xem = g.Any(x => x.Xem),
                        Them = g.Any(x => x.Them),
                        Sua = g.Any(x => x.Sua),
                        Xoa = g.Any(x => x.Xoa),
                        Xuat = g.Any(x => x.Xuat),
                    };
                })
                .OrderBy(p => p.IdChucNang)
                .ThenBy(p => p.MaQuyen)
                .ToList();

            var payload = new UserPermissionsResponse
            {
                Id = user.Id,
                TenDangNhap = user.TenDangNhap,
                HoTen = user.HoTen,
                Roles = user.Roles
                    .GroupBy(r => r.Id)
                    .Select(g => g.First())
                    .OrderBy(r => r.Id)
                    .ToList(),
                Permissions = distinctPerms
            };

            return Ok(payload);
        }

        [HttpGet("{id:long}/data-scope")]
        [Authorize(Roles = "ADMIN,QUAN_TRI")]
        public async Task<IActionResult> GetUserDataScope(long id)
        {
            var userExists = await _db.NguoiDungs.AnyAsync(x => x.Id == id);
            if (!userExists)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            var rooms = await _db.PhongKhams
                .AsNoTracking()
                .Where(x => x.HoatDong != false)
                .OrderBy(x => x.KhoaPhong)
                .ThenBy(x => x.TenPhong)
                .Select(x => new RoomScopeDto
                {
                    Id = x.Id,
                    MaPhong = x.MaPhong ?? "",
                    TenPhong = x.TenPhong ?? "",
                    KhoaPhong = x.KhoaPhong ?? "",
                    HoatDong = x.HoatDong != false
                })
                .ToListAsync();

            var assignedRoomIds = await _db.BacSiPhongs
                .AsNoTracking()
                .Where(x => x.IdBacSi == id)
                .Select(x => x.IdPhong)
                .Distinct()
                .ToListAsync();

            return Ok(new
            {
                userId = id,
                rooms,
                assignedRoomIds
            });
        }

        [HttpPatch("{id:long}/data-scope")]
        [Authorize(Roles = "ADMIN,QUAN_TRI")]
        public async Task<IActionResult> UpdateUserDataScope(long id, [FromBody] UserDataScopeUpdateRequest? req)
        {
            var user = await _db.NguoiDungs.FirstOrDefaultAsync(x => x.Id == id);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            var requestedRoomIds = (req?.RoomIds ?? new List<int>())
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            if (requestedRoomIds.Count == 0)
                return BadRequest(new { message = "Vui lòng chọn ít nhất một phòng. Hệ thống không lưu phạm vi rỗng để tránh xóa nhầm phân phòng hiện có." });

            var validRooms = await _db.PhongKhams
                .Where(x => requestedRoomIds.Contains(x.Id) && x.HoatDong != false)
                .OrderBy(x => x.KhoaPhong)
                .ThenBy(x => x.TenPhong)
                .ToListAsync();

            var validRoomIds = validRooms.Select(x => x.Id).ToList();
            var invalidRoomIds = requestedRoomIds.Except(validRoomIds).ToList();
            if (invalidRoomIds.Count > 0)
                return BadRequest(new { message = "Một số phòng không tồn tại hoặc đã ngưng hoạt động.", roomIds = invalidRoomIds });

            var beforeRoomIds = await _db.BacSiPhongs
                .Where(x => x.IdBacSi == id)
                .Select(x => x.IdPhong)
                .OrderBy(x => x)
                .ToListAsync();

            var oldLinks = _db.BacSiPhongs.Where(x => x.IdBacSi == id);
            _db.BacSiPhongs.RemoveRange(oldLinks);

            foreach (var roomId in validRoomIds)
            {
                _db.BacSiPhongs.Add(new BacSiPhong
                {
                    IdBacSi = id,
                    IdPhong = roomId
                });
            }

            user.KhoaPhong = validRooms.FirstOrDefault()?.KhoaPhong;
            await _db.SaveChangesAsync();

            await WritePermissionAuditAsync(
                entityType: "USER",
                entityId: id,
                action: "USER_DATA_SCOPE_UPDATED",
                changedByUserId: GetActorId(),
                changedByUsername: GetActorUsername(),
                targetUserId: id,
                targetRoleId: null,
                beforeData: new { roomIds = beforeRoomIds },
                afterData: new { roomIds = validRoomIds },
                note: $"Cap nhat pham vi khoa/phong cho {user.TenDangNhap}"
            );

            return Ok(new
            {
                message = "Cập nhật phạm vi khoa/phòng thành công.",
                userId = id,
                assignedRoomIds = validRoomIds
            });
        }
        
        [HttpGet("{id:long}/can")]
        public async Task<IActionResult> Can(long id, [FromQuery] string feature, [FromQuery] string action)
        {
            if (string.IsNullOrWhiteSpace(feature) || string.IsNullOrWhiteSpace(action))
                return BadRequest(new { message = "Thiếu feature hoặc action." });

            feature = feature.Trim().ToUpper();      // ví dụ: KHAM_BENH
            var act = action.Trim().ToLower();       // ví dụ: xoa

            // Lấy role của user
            var roleIds = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == id)
                .Select(x => x.IdVaiTro.GetValueOrDefault())
                .Distinct()
                .ToListAsync();

            if (roleIds.Count == 0)
                return Ok(new { allowed = false });

            var userRoles = await _db.VaiTros
                .Where(v => roleIds.Contains(v.Id))
                .Select(v => new { v.Id, Ten = v.Ten.ToUpper() })
                .ToListAsync();

            var roleNames = userRoles.Select(x => x.Ten).ToList();

            if (IsAdminRole(roleNames))
                return Ok(new { allowed = true });

            if (!HasRequiredRoleForFeature(roleNames, feature))
                return Ok(new { allowed = false });

            var eligibleRoleIds = userRoles
                .Where(role => IsRoleAllowedForFeature(role.Ten, feature))
                .Select(role => role.Id)
                .ToList();

            if (eligibleRoleIds.Count == 0)
                return Ok(new { allowed = false });

            // Lấy quyền theo chức năng (feature)
            var query = from vtq in _db.VaiTroQuyens
                        join q in _db.Quyens on vtq.IdQuyen equals q.Id
                        join cn in _db.ChucNangs on q.IdChucNang equals cn.Id
                        where eligibleRoleIds.Contains(vtq.IdVaiTro.GetValueOrDefault())
                              && cn.MaChucNang != null
                              && cn.MaChucNang.ToUpper() == feature
                        select new
                        {
                            Xem = (vtq.Xem ?? false) && (q.Xem ?? false),
                            Them = (vtq.Them ?? false) && (q.Them ?? false),
                            Sua = (vtq.Sua ?? false) && (q.Sua ?? false),
                            Xoa = (vtq.Xoa ?? false) && (q.Xoa ?? false),
                            Xuat = (vtq.Xuat ?? false) && (q.Xuat ?? false)
                        };

            bool allowed = false;

            switch (act)
            {
                case "xem":
                    allowed = await query.AnyAsync(v => v.Xem);
                    break;
                case "them":
                    allowed = await query.AnyAsync(v => v.Them);
                    break;
                case "sua":
                    allowed = await query.AnyAsync(v => v.Sua);
                    break;
                case "xoa":
                    allowed = await query.AnyAsync(v => v.Xoa);
                    break;
                case "xuat":
                    allowed = await query.AnyAsync(v => v.Xuat);
                    break;
                default:
                    return BadRequest(new { message = "Action không hợp lệ. Hợp lệ: xem, them, sua, xoa, xuat." });
            }

            return Ok(new { allowed });
        }

        [HttpPatch("{id:long}/roles-audit")]
        [RequireFeature("PHAN_QUYEN")]
        public async Task<IActionResult> UpdateUserRolesWithAudit(long id, [FromBody] List<string> roleNames)
        {
            roleNames ??= new List<string>();
            var user = await _db.NguoiDungs.FirstOrDefaultAsync(x => x.Id == id);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            var beforeRoles = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == id && x.IdVaiTroNavigation != null)
                .Select(x => x.IdVaiTroNavigation!.Ten)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            var targetRoleIds = await _db.VaiTros
                .Where(r => roleNames.Contains(r.Ten))
                .Select(r => r.Id)
                .ToListAsync();

            var existing = _db.NguoiDungVaiTros.Where(x => x.IdNguoiDung == id);
            _db.NguoiDungVaiTros.RemoveRange(existing);
            await _db.SaveChangesAsync();

            foreach (var roleId in targetRoleIds.Distinct())
            {
                _db.NguoiDungVaiTros.Add(new NguoiDungVaiTro
                {
                    IdNguoiDung = id,
                    IdVaiTro = roleId
                });
            }

            await _db.SaveChangesAsync();

            var afterRoles = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == id && x.IdVaiTroNavigation != null)
                .Select(x => x.IdVaiTroNavigation!.Ten)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            await WritePermissionAuditAsync(
                entityType: "USER",
                entityId: id,
                action: "USER_ROLES_UPDATED",
                changedByUserId: GetActorId(),
                changedByUsername: GetActorUsername(),
                targetUserId: id,
                targetRoleId: null,
                beforeData: beforeRoles,
                afterData: afterRoles,
                note: $"Cap nhat vai tro cho {user.TenDangNhap}"
            );

            return Ok(new
            {
                message = "Cập nhật vai trò người dùng thành công.",
                beforeRoles,
                afterRoles
            });
        }

        [HttpPost("{id:long}/reception-preset")]
        [RequireFeature("PHAN_QUYEN")]
        public async Task<IActionResult> ApplyReceptionPreset(long id, [FromBody] ReceptionPresetRequest? req)
        {
            var preset = (req?.Preset ?? "").Trim().ToUpperInvariant();
            if (preset != "FULL" && preset != "CHI_XEM" && preset != "KHONG_TRUY_CAP")
                return BadRequest(new { message = "Preset không hợp lệ. Hợp lệ: FULL, CHI_XEM, KHONG_TRUY_CAP." });

            var user = await _db.NguoiDungs.FirstOrDefaultAsync(x => x.Id == id);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            var beforeRoles = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == id && x.IdVaiTroNavigation != null)
                .Select(x => x.IdVaiTroNavigation!.Ten)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            var rolesToRemove = await _db.VaiTros
                .Where(v => v.Ten.StartsWith("TIEP_DON"))
                .Select(v => v.Id)
                .ToListAsync();

            var oldReceptionLinks = _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == id && x.IdVaiTro.HasValue && rolesToRemove.Contains(x.IdVaiTro.Value));
            _db.NguoiDungVaiTros.RemoveRange(oldReceptionLinks);
            await _db.SaveChangesAsync();

            int? assignedRoleId = null;
            string assignedRoleName = "";

            if (preset == "FULL")
            {
                var role = await EnsureReceptionPresetRoleAsync(
                    "TIEP_DON_PRESET_FULL",
                    xem: true, them: true, sua: true, xoa: true, xuat: true);
                assignedRoleId = role.Id;
                assignedRoleName = role.Ten;
            }
            else if (preset == "CHI_XEM")
            {
                var role = await EnsureReceptionPresetRoleAsync(
                    "TIEP_DON_PRESET_CHI_XEM",
                    xem: true, them: false, sua: false, xoa: false, xuat: false);
                assignedRoleId = role.Id;
                assignedRoleName = role.Ten;
            }
            else
            {
                var role = await EnsureReceptionPresetRoleAsync(
                    "TIEP_DON_PRESET_KHONG_TRUY_CAP",
                    xem: false, them: false, sua: false, xoa: false, xuat: false);
                assignedRoleId = role.Id;
                assignedRoleName = role.Ten;
            }

            if (assignedRoleId.HasValue)
            {
                _db.NguoiDungVaiTros.Add(new NguoiDungVaiTro
                {
                    IdNguoiDung = id,
                    IdVaiTro = assignedRoleId.Value
                });
                await _db.SaveChangesAsync();
            }

            var afterRoles = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == id && x.IdVaiTroNavigation != null)
                .Select(x => x.IdVaiTroNavigation!.Ten)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            await WritePermissionAuditAsync(
                entityType: "USER",
                entityId: id,
                action: "USER_RECEPTION_PRESET_APPLIED",
                changedByUserId: GetActorId(),
                changedByUsername: GetActorUsername(),
                targetUserId: id,
                targetRoleId: assignedRoleId,
                beforeData: beforeRoles,
                afterData: new { preset, role = assignedRoleName, roles = afterRoles },
                note: $"Ap dung preset {preset} cho {user.TenDangNhap}"
            );

            return Ok(new
            {
                message = $"Đã áp dụng preset {preset} cho {user.TenDangNhap}.",
                preset,
                role = assignedRoleName,
                beforeRoles,
                afterRoles
            });
        }

        [HttpPost("clone-permissions")]
        [RequireFeature("PHAN_QUYEN")]
        public async Task<IActionResult> ClonePermissions([FromBody] ClonePermissionsRequest req)
        {
            if (req.SourceUserId <= 0 || req.TargetUserId <= 0)
                return BadRequest(new { message = "Thiếu user nguồn hoặc user đích." });
            if (req.SourceUserId == req.TargetUserId)
                return BadRequest(new { message = "User nguồn và user đích không được trùng nhau." });

            var source = await _db.NguoiDungs.FirstOrDefaultAsync(x => x.Id == req.SourceUserId);
            var target = await _db.NguoiDungs.FirstOrDefaultAsync(x => x.Id == req.TargetUserId);
            if (source == null || target == null)
                return NotFound(new { message = "Không tìm thấy user nguồn hoặc user đích." });

            var sourceRoleIds = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == req.SourceUserId && x.IdVaiTro.HasValue)
                .Select(x => x.IdVaiTro!.Value)
                .Distinct()
                .ToListAsync();

            var sourceRoles = await _db.VaiTros
                .Where(v => sourceRoleIds.Contains(v.Id))
                .Select(v => v.Ten)
                .OrderBy(v => v)
                .ToListAsync();

            var beforeTargetRoles = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == req.TargetUserId && x.IdVaiTroNavigation != null)
                .Select(x => x.IdVaiTroNavigation!.Ten)
                .Distinct()
                .OrderBy(v => v)
                .ToListAsync();

            var oldLinks = _db.NguoiDungVaiTros.Where(x => x.IdNguoiDung == req.TargetUserId);
            _db.NguoiDungVaiTros.RemoveRange(oldLinks);
            await _db.SaveChangesAsync();

            foreach (var roleId in sourceRoleIds)
            {
                _db.NguoiDungVaiTros.Add(new NguoiDungVaiTro
                {
                    IdNguoiDung = req.TargetUserId,
                    IdVaiTro = roleId
                });
            }
            await _db.SaveChangesAsync();

            var afterTargetRoles = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == req.TargetUserId && x.IdVaiTroNavigation != null)
                .Select(x => x.IdVaiTroNavigation!.Ten)
                .Distinct()
                .OrderBy(v => v)
                .ToListAsync();

            await WritePermissionAuditAsync(
                entityType: "USER",
                entityId: req.TargetUserId,
                action: "USER_PERMISSION_CLONED",
                changedByUserId: GetActorId(),
                changedByUsername: GetActorUsername(),
                targetUserId: req.TargetUserId,
                targetRoleId: null,
                beforeData: new { targetRoles = beforeTargetRoles },
                afterData: new
                {
                    sourceUserId = req.SourceUserId,
                    sourceUsername = source.TenDangNhap,
                    clonedRoles = sourceRoles,
                    targetRoles = afterTargetRoles
                },
                note: $"Clone quyen tu {source.TenDangNhap} sang {target.TenDangNhap}"
            );

            return Ok(new
            {
                message = $"Đã clone quyền từ {source.TenDangNhap} sang {target.TenDangNhap}.",
                sourceRoles,
                beforeTargetRoles,
                afterTargetRoles
            });
        }

        [HttpGet("{id:long}/permission-conflicts")]
        public async Task<IActionResult> GetUserPermissionConflicts(long id)
        {
            var userRoles = await _db.NguoiDungVaiTros
                .Where(x => x.IdNguoiDung == id && x.IdVaiTroNavigation != null)
                .Select(x => new
                {
                    RoleId = x.IdVaiTro ?? 0,
                    RoleName = x.IdVaiTroNavigation!.Ten
                })
                .Distinct()
                .ToListAsync();

            var roleIds = userRoles.Select(x => x.RoleId).Distinct().ToList();
            if (roleIds.Count == 0)
                return Ok(new { hasConflict = false, items = new List<PermissionConflictItemDto>() });

            var rows = await (
                from vtq in _db.VaiTroQuyens
                join q in _db.Quyens on vtq.IdQuyen equals q.Id
                join cn in _db.ChucNangs on q.IdChucNang equals cn.Id
                join vt in _db.VaiTros on vtq.IdVaiTro equals vt.Id
                where vtq.IdVaiTro.HasValue && roleIds.Contains(vtq.IdVaiTro.Value)
                select new
                {
                    IdQuyen = q.Id,
                    MaQuyen = q.MaQuyen ?? "",
                    MaChucNang = cn.MaChucNang ?? "",
                    TenChucNang = cn.Ten ?? "",
                    RoleName = vt.Ten,
                    Xem = vtq.Xem ?? false,
                    Them = vtq.Them ?? false,
                    Sua = vtq.Sua ?? false,
                    Xoa = vtq.Xoa ?? false,
                    Xuat = vtq.Xuat ?? false
                })
                .ToListAsync();

            var items = rows
                .GroupBy(x => new { x.IdQuyen, x.MaQuyen, x.MaChucNang, x.TenChucNang })
                .Select(g =>
                {
                    var roleNames = g.Select(x => x.RoleName).Distinct().OrderBy(x => x).ToList();
                    var conflicts = new List<string>();
                    if (g.Select(x => x.Xem).Distinct().Count() > 1) conflicts.Add("xem");
                    if (g.Select(x => x.Them).Distinct().Count() > 1) conflicts.Add("them");
                    if (g.Select(x => x.Sua).Distinct().Count() > 1) conflicts.Add("sua");
                    if (g.Select(x => x.Xoa).Distinct().Count() > 1) conflicts.Add("xoa");
                    if (g.Select(x => x.Xuat).Distinct().Count() > 1) conflicts.Add("xuat");

                    return new PermissionConflictItemDto
                    {
                        IdQuyen = g.Key.IdQuyen,
                        MaQuyen = g.Key.MaQuyen,
                        MaChucNang = g.Key.MaChucNang,
                        TenChucNang = g.Key.TenChucNang,
                        Roles = roleNames,
                        ConflictActions = conflicts,
                        HasOverlap = roleNames.Count > 1
                    };
                })
                .Where(x => x.HasOverlap)
                .OrderByDescending(x => x.ConflictActions.Count)
                .ThenBy(x => x.TenChucNang)
                .ThenBy(x => x.MaQuyen)
                .ToList();

            return Ok(new
            {
                hasConflict = items.Any(x => x.ConflictActions.Count > 0),
                hasOverlap = items.Any(),
                items
            });
        }

        [HttpGet("permission-audit")]
        public async Task<IActionResult> GetPermissionAudit(
            [FromQuery] long? userId,
            [FromQuery] int? roleId,
            [FromQuery] int take = 40)
        {
            if (take <= 0) take = 40;
            if (take > 200) take = 200;

            var query = _db.PermissionAuditLogs.AsQueryable();

            if (userId.HasValue)
                query = query.Where(x => x.TargetUserId == userId || (x.EntityType == "USER" && x.EntityId == userId));
            if (roleId.HasValue)
                query = query.Where(x => x.TargetRoleId == roleId || (x.EntityType == "ROLE" && x.EntityId == roleId));

            var logs = await query
                .OrderByDescending(x => x.CreatedAt)
                .Take(take)
                .Select(x => new PermissionAuditDto
                {
                    Id = x.Id,
                    EntityType = x.EntityType,
                    EntityId = x.EntityId,
                    Action = x.Action,
                    ChangedByUserId = x.ChangedByUserId,
                    ChangedByUsername = x.ChangedByUsername,
                    TargetUserId = x.TargetUserId,
                    TargetRoleId = x.TargetRoleId,
                    Note = x.Note,
                    BeforeData = x.BeforeData,
                    AfterData = x.AfterData,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();

            return Ok(logs);
        }

        [HttpPost("permission-undo-last")]
        [RequireFeature("PHAN_QUYEN")]
        public async Task<IActionResult> UndoLastPermissionChange([FromBody] UndoPermissionChangeRequest? req)
        {
            var userId = req?.UserId;
            var roleId = req?.RoleId;

            if (!userId.HasValue && !roleId.HasValue)
                return BadRequest(new { message = "Thiếu userId hoặc roleId." });

            var auditQuery = _db.PermissionAuditLogs.AsQueryable();
            if (userId.HasValue)
                auditQuery = auditQuery.Where(x => x.TargetUserId == userId || (x.EntityType == "USER" && x.EntityId == userId));
            if (roleId.HasValue)
                auditQuery = auditQuery.Where(x => x.TargetRoleId == roleId || (x.EntityType == "ROLE" && x.EntityId == roleId));

            var last = await auditQuery
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (last == null)
                return NotFound(new { message = "Không tìm thấy lịch sử thay đổi để hoàn tác." });

            if (string.IsNullOrWhiteSpace(last.BeforeData))
                return BadRequest(new { message = "Bản ghi này không có dữ liệu trước thay đổi để hoàn tác." });

            if (last.Action == "USER_ROLES_UPDATED" || last.Action == "USER_RECEPTION_PRESET_APPLIED" || last.Action == "USER_PERMISSION_CLONED")
            {
                var targetId = last.TargetUserId ?? last.EntityId;
                if (!targetId.HasValue)
                    return BadRequest(new { message = "Bản ghi không xác định user cần hoàn tác." });

                List<string>? beforeRoles = null;
                try
                {
                    beforeRoles = JsonSerializer.Deserialize<List<string>>(last.BeforeData);
                }
                catch
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(last.BeforeData);
                        if (doc.RootElement.TryGetProperty("targetRoles", out var tr) && tr.ValueKind == JsonValueKind.Array)
                        {
                            beforeRoles = tr.EnumerateArray()
                                .Where(x => x.ValueKind == JsonValueKind.String)
                                .Select(x => x.GetString() ?? "")
                                .Where(x => !string.IsNullOrWhiteSpace(x))
                                .ToList();
                        }
                    }
                    catch { }
                }

                beforeRoles ??= new List<string>();

                var roleIds = await _db.VaiTros
                    .Where(v => beforeRoles.Contains(v.Ten))
                    .Select(v => v.Id)
                    .ToListAsync();

                var links = _db.NguoiDungVaiTros.Where(x => x.IdNguoiDung == targetId.Value);
                _db.NguoiDungVaiTros.RemoveRange(links);
                await _db.SaveChangesAsync();

                foreach (var rid in roleIds.Distinct())
                {
                    _db.NguoiDungVaiTros.Add(new NguoiDungVaiTro { IdNguoiDung = targetId.Value, IdVaiTro = rid });
                }
                await _db.SaveChangesAsync();

                await WritePermissionAuditAsync(
                    entityType: "USER",
                    entityId: targetId.Value,
                    action: "USER_PERMISSION_UNDO_LAST",
                    changedByUserId: GetActorId(),
                    changedByUsername: GetActorUsername(),
                    targetUserId: targetId.Value,
                    targetRoleId: null,
                    beforeData: null,
                    afterData: new { revertedFromAuditId = last.Id, restoredRoles = beforeRoles },
                    note: $"Undo thay doi quyen gan nhat cho user {targetId.Value}"
                );

                return Ok(new { message = "Hoàn tác thay đổi quyền user thành công.", auditId = last.Id, restoredRoles = beforeRoles });
            }

            if (last.Action == "ROLE_PERMISSION_MATRIX_UPDATED")
            {
                var targetRoleId = last.TargetRoleId ?? (last.EntityId.HasValue ? (int?)last.EntityId.Value : null);
                if (!targetRoleId.HasValue)
                    return BadRequest(new { message = "Bản ghi không xác định role cần hoàn tác." });

                List<RolePermissionUpdateDto>? beforeMatrix;
                try
                {
                    beforeMatrix = JsonSerializer.Deserialize<List<RolePermissionUpdateDto>>(last.BeforeData);
                }
                catch
                {
                    return BadRequest(new { message = "Không đọc được dữ liệu ma trận cũ để hoàn tác." });
                }

                beforeMatrix ??= new List<RolePermissionUpdateDto>();

                var existing = _db.VaiTroQuyens.Where(x => x.IdVaiTro == targetRoleId.Value);
                _db.VaiTroQuyens.RemoveRange(existing);
                await _db.SaveChangesAsync();

                foreach (var item in beforeMatrix)
                {
                    _db.VaiTroQuyens.Add(new VaiTroQuyen
                    {
                        IdVaiTro = targetRoleId.Value,
                        IdQuyen = item.IdQuyen,
                        Xem = item.Xem,
                        Them = item.Them,
                        Sua = item.Sua,
                        Xoa = item.Xoa,
                        Xuat = item.Xuat
                    });
                }
                await _db.SaveChangesAsync();

                await WritePermissionAuditAsync(
                    entityType: "ROLE",
                    entityId: targetRoleId.Value,
                    action: "ROLE_PERMISSION_UNDO_LAST",
                    changedByUserId: GetActorId(),
                    changedByUsername: GetActorUsername(),
                    targetUserId: null,
                    targetRoleId: targetRoleId.Value,
                    beforeData: null,
                    afterData: new { revertedFromAuditId = last.Id, restoredCount = beforeMatrix.Count },
                    note: $"Undo thay doi ma tran quyen gan nhat cho role {targetRoleId.Value}"
                );

                return Ok(new { message = "Hoàn tác thay đổi ma trận quyền vai trò thành công.", auditId = last.Id });
            }

            return BadRequest(new { message = "Loại thay đổi này hiện chưa hỗ trợ hoàn tác." });
        }

        private long? GetActorId()
        {
            var raw = User?.FindFirstValue("sub")
                ?? User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User?.FindFirstValue("id");
            return long.TryParse(raw, out var id) ? id : null;
        }

        private string GetActorUsername()
        {
            return User?.FindFirstValue("username")
                ?? User?.Identity?.Name
                ?? "system";
        }

        private async Task<VaiTro> EnsureReceptionPresetRoleAsync(
            string roleName,
            bool xem,
            bool them,
            bool sua,
            bool xoa,
            bool xuat)
        {
            var role = await _db.VaiTros.FirstOrDefaultAsync(v => v.Ten == roleName);
            if (role == null)
            {
                role = new VaiTro
                {
                    Ten = roleName,
                    MoTa = $"Preset quyen tiep don: {roleName}"
                };
                _db.VaiTros.Add(role);
                await _db.SaveChangesAsync();
            }

            var permissionIds = await (
                from q in _db.Quyens
                join cn in _db.ChucNangs on q.IdChucNang equals cn.Id
                where cn.MaChucNang != null && cn.MaChucNang.ToUpper() == "TIEP_DON"
                select q.Id
            ).Distinct().ToListAsync();

            var oldRolePerms = _db.VaiTroQuyens.Where(x => x.IdVaiTro == role.Id);
            _db.VaiTroQuyens.RemoveRange(oldRolePerms);
            await _db.SaveChangesAsync();

            foreach (var permissionId in permissionIds)
            {
                _db.VaiTroQuyens.Add(new VaiTroQuyen
                {
                    IdVaiTro = role.Id,
                    IdQuyen = permissionId,
                    Xem = xem,
                    Them = them,
                    Sua = sua,
                    Xoa = xoa,
                    Xuat = xuat
                });
            }

            await _db.SaveChangesAsync();
            return role;
        }

        private async Task WritePermissionAuditAsync(
            string entityType,
            long? entityId,
            string action,
            long? changedByUserId,
            string? changedByUsername,
            long? targetUserId,
            int? targetRoleId,
            object? beforeData,
            object? afterData,
            string? note)
        {
            var entry = new PermissionAuditLog
            {
                EntityType = entityType,
                EntityId = entityId,
                Action = action,
                ChangedByUserId = changedByUserId,
                ChangedByUsername = changedByUsername,
                TargetUserId = targetUserId,
                TargetRoleId = targetRoleId,
                Note = note,
                BeforeData = SerializeAuditData(beforeData),
                AfterData = SerializeAuditData(afterData),
                CreatedAt = DateTime.Now
            };

            _db.PermissionAuditLogs.Add(entry);
            await _db.SaveChangesAsync();
        }

        private static string? SerializeAuditData(object? data)
        {
            if (data == null) return null;
            try
            {
                return JsonSerializer.Serialize(data);
            }
            catch
            {
                return data.ToString();
            }
        }
    }
}
