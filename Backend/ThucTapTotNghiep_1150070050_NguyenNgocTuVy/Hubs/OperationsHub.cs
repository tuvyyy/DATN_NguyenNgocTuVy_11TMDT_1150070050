using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Hubs;

[Authorize]
public class OperationsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");
        if (!string.IsNullOrWhiteSpace(userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");

        var roles = Context.User?.FindAll(ClaimTypes.Role).Select(x => x.Value.ToUpperInvariant()).Distinct()
            ?? Enumerable.Empty<string>();
        foreach (var role in roles)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"role:{role}");

        if (roles.Any(x => x is "ADMIN" or "QUAN_TRI"))
            await Groups.AddToGroupAsync(Context.ConnectionId, "admins");

        await base.OnConnectedAsync();
    }
}
