using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using Microsoft.EntityFrameworkCore;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;

public partial class DACNDbContext
{
    public virtual DbSet<SystemNotification> SystemNotifications { get; set; }
    public virtual DbSet<SystemNotificationRead> SystemNotificationReads { get; set; }
    public virtual DbSet<SupportRequest> SupportRequests { get; set; }

    private static void ConfigureOperationsCenter(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SystemNotification>(entity =>
        {
            entity.ToTable("system_notifications");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Title).HasMaxLength(180).HasColumnName("title");
            entity.Property(x => x.Message).HasMaxLength(2000).HasColumnName("message");
            entity.Property(x => x.Severity).HasMaxLength(20).IsUnicode(false).HasColumnName("severity");
            entity.Property(x => x.TargetRole).HasMaxLength(80).IsUnicode(false).HasColumnName("target_role");
            entity.Property(x => x.TargetUserId).HasColumnName("target_user_id");
            entity.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(x => x.CreatedAt).HasColumnType("datetime").HasColumnName("created_at");
            entity.Property(x => x.ExpiresAt).HasColumnType("datetime").HasColumnName("expires_at");
        });

        modelBuilder.Entity<SystemNotificationRead>(entity =>
        {
            entity.ToTable("system_notification_reads");
            entity.HasKey(x => new { x.NotificationId, x.UserId });
            entity.Property(x => x.NotificationId).HasColumnName("notification_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.ReadAt).HasColumnType("datetime").HasColumnName("read_at");
        });

        modelBuilder.Entity<SupportRequest>(entity =>
        {
            entity.ToTable("support_requests");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.RequesterUserId).HasColumnName("requester_user_id");
            entity.Property(x => x.Subject).HasMaxLength(180).HasColumnName("subject");
            entity.Property(x => x.Description).HasMaxLength(3000).HasColumnName("description");
            entity.Property(x => x.Category).HasMaxLength(40).IsUnicode(false).HasColumnName("category");
            entity.Property(x => x.Priority).HasMaxLength(20).IsUnicode(false).HasColumnName("priority");
            entity.Property(x => x.Status).HasMaxLength(20).IsUnicode(false).HasColumnName("status");
            entity.Property(x => x.PageUrl).HasMaxLength(1000).HasColumnName("page_url");
            entity.Property(x => x.Route).HasMaxLength(300).HasColumnName("route");
            entity.Property(x => x.UserAgent).HasMaxLength(1000).HasColumnName("user_agent");
            entity.Property(x => x.ContextJson).HasColumnName("context_json");
            entity.Property(x => x.AdminNote).HasMaxLength(3000).HasColumnName("admin_note");
            entity.Property(x => x.AssignedToUserId).HasColumnName("assigned_to_user_id");
            entity.Property(x => x.CreatedAt).HasColumnType("datetime").HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnType("datetime").HasColumnName("updated_at");
            entity.Property(x => x.ResolvedAt).HasColumnType("datetime").HasColumnName("resolved_at");
        });
    }
}
