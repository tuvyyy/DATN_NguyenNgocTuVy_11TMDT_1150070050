namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public class SupportRequest
{
    public long Id { get; set; }
    public long RequesterUserId { get; set; }
    public string Subject { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string Category { get; set; } = "HO_TRO";
    public string Priority { get; set; } = "NORMAL";
    public string Status { get; set; } = "NEW";
    public string? PageUrl { get; set; }
    public string? Route { get; set; }
    public string? UserAgent { get; set; }
    public string? ContextJson { get; set; }
    public string? AdminNote { get; set; }
    public long? AssignedToUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
