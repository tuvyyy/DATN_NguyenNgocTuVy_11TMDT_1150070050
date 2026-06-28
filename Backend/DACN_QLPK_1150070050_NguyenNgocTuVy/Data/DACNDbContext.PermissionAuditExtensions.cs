using DACN_QLPK_1150070050_NguyenNgocTuVy.Models;
using Microsoft.EntityFrameworkCore;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Data;

public partial class DACNDbContext
{
    public virtual DbSet<PermissionAuditLog> PermissionAuditLogs { get; set; }

    private static void ConfigurePermissionAuditLogs(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PermissionAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_permission_audit_logs");

            entity.ToTable("permission_audit_logs");

            entity.HasIndex(e => e.CreatedAt, "IX_permission_audit_logs_created_at");
            entity.HasIndex(e => e.TargetUserId, "IX_permission_audit_logs_target_user");
            entity.HasIndex(e => e.TargetRoleId, "IX_permission_audit_logs_target_role");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EntityType)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("entity_type");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.Action)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("action");
            entity.Property(e => e.ChangedByUserId).HasColumnName("changed_by_user_id");
            entity.Property(e => e.ChangedByUsername)
                .HasMaxLength(150)
                .HasColumnName("changed_by_username");
            entity.Property(e => e.TargetUserId).HasColumnName("target_user_id");
            entity.Property(e => e.TargetRoleId).HasColumnName("target_role_id");
            entity.Property(e => e.Note)
                .HasMaxLength(500)
                .HasColumnName("note");
            entity.Property(e => e.BeforeData).HasColumnName("before_data");
            entity.Property(e => e.AfterData).HasColumnName("after_data");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("datetime")
                .HasDefaultValueSql("(getdate())")
                .HasColumnName("created_at");
        });
    }
}
