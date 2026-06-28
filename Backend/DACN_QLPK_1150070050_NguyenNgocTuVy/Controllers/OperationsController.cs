using DACN_QLPK_1150070050_NguyenNgocTuVy.Data;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Hubs;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Controllers;

[ApiController]
[Route("api/operations")]
[Authorize]
public class OperationsController : ControllerBase
{
    private readonly DACNDbContext _db;
    private readonly IHubContext<OperationsHub> _hub;

    public OperationsController(DACNDbContext db, IHubContext<OperationsHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    private long CurrentUserId => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub"), out var id) ? id : 0;

    private string[] CurrentRoles => User.FindAll(ClaimTypes.Role)
        .Select(x => x.Value.ToUpperInvariant()).Distinct().ToArray();

    [AllowAnonymous]
    [HttpGet("health")]
    public IActionResult Health() => Ok(new
    {
        status = "online",
        serverTime = DateTime.Now,
        realtime = true,
        locale = "vi-VN",
        timeZone = "Asia/Ho_Chi_Minh"
    });

    [HttpGet("notifications")]
    public async Task<IActionResult> Notifications()
    {
        var userId = CurrentUserId;
        var roles = CurrentRoles;
        var now = DateTime.Now;
        var rows = await _db.SystemNotifications.AsNoTracking()
            .Where(x => (!x.ExpiresAt.HasValue || x.ExpiresAt > now)
                && (!x.TargetUserId.HasValue || x.TargetUserId == userId)
                && (x.TargetRole == null || roles.Contains(x.TargetRole)))
            .OrderByDescending(x => x.CreatedAt).Take(50)
            .Select(x => new
            {
                x.Id, x.Title, x.Message, x.Severity, x.CreatedAt, x.ExpiresAt,
                isRead = _db.SystemNotificationReads.Any(r => r.NotificationId == x.Id && r.UserId == userId)
            }).ToListAsync();
        return Ok(rows);
    }

    [HttpGet("notifications/{id:long}")]
    public async Task<IActionResult> NotificationDetail(long id)
    {
        var notification = await _db.SystemNotifications.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (notification == null) return NotFound();
        if (!CanSeeNotification(notification)) return Forbid();

        return Ok(new
        {
            notification.Id, notification.Title, notification.Message, notification.Severity,
            notification.TargetRole, notification.TargetUserId, notification.CreatedAt, notification.ExpiresAt,
            isRead = await _db.SystemNotificationReads.AnyAsync(x => x.NotificationId == id && x.UserId == CurrentUserId)
        });
    }

    [HttpPatch("notifications/{id:long}/read")]
    public async Task<IActionResult> MarkRead(long id)
    {
        var userId = CurrentUserId;
        if (!await _db.SystemNotifications.AnyAsync(x => x.Id == id)) return NotFound();
        if (!await _db.SystemNotificationReads.AnyAsync(x => x.NotificationId == id && x.UserId == userId))
        {
            _db.SystemNotificationReads.Add(new SystemNotificationRead
                { NotificationId = id, UserId = userId, ReadAt = DateTime.Now });
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost("notifications")]
    public async Task<IActionResult> CreateNotification(CreateNotificationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { message = "Vui lòng nhập tiêu đề và nội dung thông báo." });

        var entity = new SystemNotification
        {
            Title = request.Title.Trim(), Message = request.Message.Trim(),
            Severity = Normalize(request.Severity, "INFO"),
            TargetRole = string.IsNullOrWhiteSpace(request.TargetRole) ? null : request.TargetRole.Trim().ToUpperInvariant(),
            TargetUserId = request.TargetUserId, CreatedByUserId = CurrentUserId,
            CreatedAt = DateTime.Now, ExpiresAt = request.ExpiresAt
        };
        _db.SystemNotifications.Add(entity);
        await _db.SaveChangesAsync();

        var payload = new { entity.Id, entity.Title, entity.Message, entity.Severity, entity.CreatedAt, isRead = false };
        if (entity.TargetUserId.HasValue)
            await _hub.Clients.Group($"user:{entity.TargetUserId}").SendAsync("NotificationCreated", payload);
        else if (entity.TargetRole != null)
            await _hub.Clients.Group($"role:{entity.TargetRole}").SendAsync("NotificationCreated", payload);
        else
            await _hub.Clients.All.SendAsync("NotificationCreated", payload);
        return Ok(payload);
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPut("notifications/{id:long}")]
    public async Task<IActionResult> UpdateNotification(long id, CreateNotificationRequest request)
    {
        var entity = await _db.SystemNotifications.FindAsync(id);
        if (entity == null) return NotFound(new { message = "Không tìm thấy thông báo." });
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { message = "Vui lòng nhập tiêu đề và nội dung thông báo." });

        entity.Title = request.Title.Trim();
        entity.Message = request.Message.Trim();
        entity.Severity = Normalize(request.Severity, "INFO");
        entity.TargetRole = string.IsNullOrWhiteSpace(request.TargetRole) ? null : request.TargetRole.Trim().ToUpperInvariant();
        entity.TargetUserId = request.TargetUserId;
        entity.ExpiresAt = request.ExpiresAt;
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("NotificationChanged", new { entity.Id, action = "UPDATED" });
        return Ok(entity);
    }

    [Authorize(Roles = "ADMIN")]
    [HttpDelete("notifications/{id:long}")]
    public async Task<IActionResult> DeleteNotification(long id)
    {
        var entity = await _db.SystemNotifications.FindAsync(id);
        if (entity == null) return NotFound(new { message = "Không tìm thấy thông báo." });
        _db.SystemNotifications.Remove(entity);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("NotificationChanged", new { id, action = "DELETED" });
        return NoContent();
    }

    [Authorize(Roles = "ADMIN")]
    [HttpGet("notifications/sent")]
    public async Task<IActionResult> SentNotifications() => Ok(await _db.SystemNotifications.AsNoTracking()
        .OrderByDescending(x => x.CreatedAt).Take(100).ToListAsync());

    [HttpPost("support")]
    public async Task<IActionResult> CreateSupport(CreateSupportRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
            return BadRequest(new { message = "Vui lòng mô tả tình huống cần hỗ trợ." });
        var now = DateTime.Now;
        var entity = new SupportRequest
        {
            RequesterUserId = CurrentUserId,
            Subject = string.IsNullOrWhiteSpace(request.Subject) ? "Yêu cầu hỗ trợ" : request.Subject.Trim(),
            Description = request.Description.Trim(), Category = Normalize(request.Category, "HO_TRO"),
            Priority = Normalize(request.Priority, "NORMAL"), Status = "NEW",
            PageUrl = request.PageUrl, Route = request.Route, UserAgent = request.UserAgent,
            ContextJson = request.Context is null ? null : JsonSerializer.Serialize(request.Context),
            CreatedAt = now, UpdatedAt = now
        };
        _db.SupportRequests.Add(entity);
        await _db.SaveChangesAsync();
        var requester = await _db.NguoiDungs.Where(x => x.Id == CurrentUserId).Select(x => x.HoTen).FirstOrDefaultAsync();
        var payload = new { entity.Id, entity.Subject, entity.Priority, entity.Status, entity.Route, entity.CreatedAt, requester };
        await _hub.Clients.Group("admins").SendAsync("SupportCreated", payload);
        return Ok(payload);
    }

    [Authorize(Roles = "ADMIN")]
    [HttpGet("support")]
    public async Task<IActionResult> Support([FromQuery] string? status)
    {
        var query = _db.SupportRequests.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status.ToUpper());
        return Ok(await query.OrderByDescending(x => x.CreatedAt).Take(100)
            .Select(x => new
            {
                x.Id, x.Subject, x.Description, x.Category, x.Priority, x.Status, x.PageUrl, x.Route,
                x.UserAgent, x.ContextJson, x.AdminNote, x.AssignedToUserId, x.CreatedAt, x.UpdatedAt, x.ResolvedAt,
                requesterUserId = x.RequesterUserId,
                requesterName = _db.NguoiDungs.Where(u => u.Id == x.RequesterUserId).Select(u => u.HoTen).FirstOrDefault(),
                requesterUsername = _db.NguoiDungs.Where(u => u.Id == x.RequesterUserId).Select(u => u.TenDangNhap).FirstOrDefault()
            }).ToListAsync());
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPatch("support/{id:long}")]
    public async Task<IActionResult> UpdateSupport(long id, UpdateSupportRequest request)
    {
        var entity = await _db.SupportRequests.FindAsync(id);
        if (entity == null) return NotFound();
        entity.Status = Normalize(request.Status, entity.Status);
        entity.AdminNote = request.AdminNote;
        entity.AssignedToUserId = request.AssignedToUserId;
        entity.UpdatedAt = DateTime.Now;
        entity.ResolvedAt = entity.Status == "RESOLVED" ? DateTime.Now : null;
        await _db.SaveChangesAsync();
        await _hub.Clients.Group($"user:{entity.RequesterUserId}").SendAsync("SupportUpdated",
            new { entity.Id, entity.Status, entity.AdminNote, entity.UpdatedAt });
        return Ok(entity);
    }

    [Authorize(Roles = "ADMIN")]
    [HttpGet("support/{id:long}/diagnostics")]
    public async Task<IActionResult> Diagnostics(long id)
    {
        var support = await _db.SupportRequests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (support == null) return NotFound();
        var clinical = await _db.KhamBenhAuditLogs.AsNoTracking()
            .Where(x => x.IdNguoiThucHien == support.RequesterUserId)
            .OrderByDescending(x => x.CreatedAt).Take(20)
            .Select(x => new { source = "Nghiệp vụ", action = x.HanhDong, target = x.DoiTuong, time = x.CreatedAt }).ToListAsync();
        var permission = await _db.PermissionAuditLogs.AsNoTracking()
            .Where(x => x.ChangedByUserId == support.RequesterUserId || x.TargetUserId == support.RequesterUserId)
            .OrderByDescending(x => x.CreatedAt).Take(20)
            .Select(x => new { source = "Phân quyền", action = x.Action, target = x.EntityType, time = x.CreatedAt }).ToListAsync();
        return Ok(clinical.Concat(permission).OrderByDescending(x => x.time).Take(30));
    }

    [Authorize(Roles = "ADMIN")]
    [HttpGet("targets")]
    public async Task<IActionResult> Targets()
    {
        var users = await _db.NguoiDungs.AsNoTracking().Where(x => x.HoatDong != false)
            .OrderBy(x => x.HoTen).Select(x => new { x.Id, x.HoTen, x.TenDangNhap }).ToListAsync();
        var roles = await _db.VaiTros.AsNoTracking().OrderBy(x => x.Ten).Select(x => x.Ten).ToListAsync();
        return Ok(new { users, roles });
    }

    private static string Normalize(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value.Trim().ToUpperInvariant();

    private bool CanSeeNotification(SystemNotification notification)
    {
        if (notification.ExpiresAt.HasValue && notification.ExpiresAt <= DateTime.Now) return false;
        if (notification.TargetUserId.HasValue && notification.TargetUserId != CurrentUserId) return false;
        if (notification.TargetRole != null && !CurrentRoles.Contains(notification.TargetRole)) return false;
        return true;
    }
}

public record CreateNotificationRequest(string Title, string Message, string? Severity, string? TargetRole, long? TargetUserId, DateTime? ExpiresAt);
public record CreateSupportRequest(string? Subject, string Description, string? Category, string? Priority, string? PageUrl, string? Route, string? UserAgent, object? Context);
public record UpdateSupportRequest(string? Status, string? AdminNote, long? AssignedToUserId);
