using System;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Models;

public partial class PermissionAuditLog
{
    public long Id { get; set; }

    public string EntityType { get; set; } = null!;

    public long? EntityId { get; set; }

    public string Action { get; set; } = null!;

    public long? ChangedByUserId { get; set; }

    public string? ChangedByUsername { get; set; }

    public long? TargetUserId { get; set; }

    public int? TargetRoleId { get; set; }

    public string? Note { get; set; }

    public string? BeforeData { get; set; }

    public string? AfterData { get; set; }

    public DateTime CreatedAt { get; set; }
}
