using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireFeatureAttribute : TypeFilterAttribute
{
    public RequireFeatureAttribute(string feature) : base(typeof(FeaturePermissionFilter)) => Arguments = new object[] { feature };
}

public sealed class FeaturePermissionFilter(DACNDbContext db, string feature) : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        var rawId = user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("nameid");
        if (user.Identity?.IsAuthenticated != true || !long.TryParse(rawId, out var actorId))
        {
            context.Result = new UnauthorizedResult();
            return;
        }
        if (!await db.NguoiDungs.AsNoTracking().AnyAsync(x => x.Id == actorId && x.HoatDong != false))
        {
            context.Result = new ForbidResult();
            return;
        }
        var roles = db.NguoiDungVaiTros.AsNoTracking().Where(x => x.IdNguoiDung == actorId);
        // Consult the current database roles, rather than trusting a possibly stale role claim.
        if (await roles.AnyAsync(x => x.IdVaiTroNavigation != null && (x.IdVaiTroNavigation.Ten == "ADMIN" || x.IdVaiTroNavigation.Ten == "QUAN_TRI"))) return;
        var request = context.HttpContext.Request;
        var export = request.Path.Value?.Contains("/pdf", StringComparison.OrdinalIgnoreCase) == true
            || request.Path.Value?.Contains("/phieu-thu", StringComparison.OrdinalIgnoreCase) == true;
        var grants = from mapping in db.VaiTroQuyens.AsNoTracking()
                     join permission in db.Quyens.AsNoTracking() on mapping.IdQuyen equals permission.Id
                     join definition in db.ChucNangs.AsNoTracking() on permission.IdChucNang equals definition.Id
                     where roles.Any(r => r.IdVaiTro == mapping.IdVaiTro) && definition.MaChucNang == feature
                     select new
                     {
                         View = mapping.Xem == true && permission.Xem == true,
                         Add = mapping.Them == true && permission.Them == true,
                         Edit = mapping.Sua == true && permission.Sua == true,
                         Delete = mapping.Xoa == true && permission.Xoa == true,
                         Export = mapping.Xuat == true && permission.Xuat == true
                     };
        var allowed = export ? await grants.AnyAsync(x => x.Export) : request.Method.ToUpperInvariant() switch
        {
            "GET" or "HEAD" => await grants.AnyAsync(x => x.View),
            "POST" => await grants.AnyAsync(x => x.Add),
            "PUT" or "PATCH" => await grants.AnyAsync(x => x.Edit),
            "DELETE" => await grants.AnyAsync(x => x.Delete),
            _ => false
        };
        if (!allowed) context.Result = new ObjectResult(new { message = "Tài khoản không có quyền thực hiện thao tác trong phân hệ này." }) { StatusCode = 403 };
    }
}
