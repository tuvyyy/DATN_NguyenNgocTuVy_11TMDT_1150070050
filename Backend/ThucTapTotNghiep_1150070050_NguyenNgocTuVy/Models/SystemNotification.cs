namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

public class SystemNotification
{
    public long Id { get; set; }
    public string Title { get; set; } = null!;
    public string Message { get; set; } = null!;
    public string Severity { get; set; } = "INFO";
    public string? TargetRole { get; set; }
    public long? TargetUserId { get; set; }
    public long? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
