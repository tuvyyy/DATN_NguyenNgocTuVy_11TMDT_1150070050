using System.Text.Json;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;

public record HoSoTransitionResult(
    bool Success,
    bool Changed,
    string FromStatus,
    string ToStatus,
    string? ErrorMessage = null
);

public interface IHoSoTrangThaiService
{
    string NormalizeStatus(string? status);
    string ToLegacyStatus(string? status);
    bool IsCancelled(string? status);
    bool IsClosedOrCompleted(string? status);
    bool IsActiveReceptionFlow(string? status);
    bool IsProcessingTabStatus(string? status);
    bool IsPendingCarryOverStatus(string? status);
    bool CanEditEncounter(string? status, string? roleCode = null);
    bool CanCancelEncounter(string? status, string? roleCode = null);
    bool CanEditServiceOrder(string? status, string? roleCode = null);
    HoSoTransitionResult ApplyTransition(
        HoSoBenhAn hoSo,
        string toStatus,
        long? actorUserId,
        string action,
        string? note = null,
        object? metadata = null
    );
}

public class HoSoTrangThaiService : IHoSoTrangThaiService
{
    private readonly DACNDbContext _db;

    // Canonical reception states (v2)
    public const string MoiTao = "MOI_TAO";
    public const string DaTiepDon = "DA_TIEP_DON";
    public const string ChoDichVu = "CHO_DICH_VU";
    public const string DichVuNhap = "DICH_VU_NHAP";
    public const string ChoThanhToan = "CHO_THANH_TOAN";
    public const string DaThanhToan = "DA_THANH_TOAN";
    public const string ChoChuyenKhu = "CHO_CHUYEN_KHU";
    public const string DaNhanKhuMoi = "DA_NHAN_KHU_MOI";
    public const string HuyChuyenKhu = "HUY_CHUYEN_KHU";
    public const string ChoKham = "CHO_KHAM";
    public const string DangKham = "DANG_KHAM";
    public const string ChoCanLamSang = "CHO_CAN_LAM_SANG";
    public const string ChoKetQua = "CHO_KET_QUA";
    public const string ChoKetLuan = "CHO_KET_LUAN";
    public const string DaKham = "DA_KHAM";
    public const string DaDong = "DA_DONG";
    public const string DaHuy = "DA_HUY";

    private static readonly Dictionary<string, HashSet<string>> AllowedTransitions = new(StringComparer.OrdinalIgnoreCase)
    {
        [""] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { MoiTao, DaTiepDon, ChoDichVu },
        [MoiTao] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DaTiepDon, ChoDichVu, DaHuy },
        [DaTiepDon] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ChoDichVu, ChoChuyenKhu, DaHuy },
        [ChoDichVu] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DichVuNhap, ChoThanhToan, ChoKham, ChoChuyenKhu, DaHuy },
        [DichVuNhap] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ChoDichVu, ChoThanhToan, ChoKham, ChoChuyenKhu, DaHuy },
        [ChoThanhToan] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DaThanhToan, ChoChuyenKhu, DaHuy },
        [DaThanhToan] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ChoKham, ChoChuyenKhu, DaHuy },
        [ChoChuyenKhu] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DaNhanKhuMoi, HuyChuyenKhu, DaHuy },
        [DaNhanKhuMoi] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ChoDichVu, DichVuNhap, ChoThanhToan, DaThanhToan, ChoKham, DaHuy },
        [HuyChuyenKhu] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DaTiepDon, ChoDichVu, DichVuNhap, ChoThanhToan, DaThanhToan, ChoKham, DaHuy },
        [ChoKham] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DangKham, ChoCanLamSang, ChoKetQua, ChoKetLuan, DaKham, DaHuy },
        [DangKham] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ChoCanLamSang, ChoKetQua, ChoKetLuan, DaKham, DaHuy },
        [ChoCanLamSang] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DangKham, ChoKetQua, ChoKetLuan, DaKham, DaHuy },
        [ChoKetQua] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DangKham, ChoKetLuan, DaKham, DaHuy },
        [ChoKetLuan] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DangKham, DaKham, DaHuy },
        [DaKham] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { DangKham, DaDong },
        [DaDong] = new HashSet<string>(StringComparer.OrdinalIgnoreCase),
        [DaHuy] = new HashSet<string>(StringComparer.OrdinalIgnoreCase),
    };

    private static readonly Dictionary<string, string> CanonicalAliasMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // Legacy -> canonical
        ["MOI"] = MoiTao,
        ["CHUA_CHI_DINH"] = DaTiepDon,
        ["CHO_CHI_DINH"] = ChoDichVu,
        ["DICH_VU_NHAP"] = DichVuNhap,
        ["CHI_DINH"] = ChoKham,
        ["DONG"] = DaDong,
        ["HUY"] = DaHuy,
        ["HUY_TIEP_DON"] = DaHuy,

        // Existing module statuses -> canonical
        ["CHO_KHAM"] = ChoKham,
        ["DANG_KHAM"] = DangKham,
        ["CHO_THUC_HIEN"] = ChoCanLamSang,
        ["CHO_KET_QUA"] = ChoKetQua,
        ["CHO_THANH_TOAN"] = ChoThanhToan,
        ["DA_THANH_TOAN"] = DaThanhToan,
        ["CHO_CHUYEN_KHU"] = ChoChuyenKhu,
        ["DA_NHAN_KHU_MOI"] = DaNhanKhuMoi,
        ["HUY_CHUYEN_KHU"] = HuyChuyenKhu,
        ["CHO_KET_LUAN"] = ChoKetLuan,
        ["DA_KHAM"] = DaKham,
        ["DA_DONG"] = DaDong,
        ["DA_HUY"] = DaHuy,

        // Canonical self-mapping
        [MoiTao] = MoiTao,
        [DaTiepDon] = DaTiepDon,
        [ChoDichVu] = ChoDichVu,
        [DichVuNhap] = DichVuNhap,
        [ChoThanhToan] = ChoThanhToan,
        [DaThanhToan] = DaThanhToan,
        [ChoChuyenKhu] = ChoChuyenKhu,
        [DaNhanKhuMoi] = DaNhanKhuMoi,
        [HuyChuyenKhu] = HuyChuyenKhu,
        [ChoKham] = ChoKham,
        [DangKham] = DangKham,
        [ChoCanLamSang] = ChoCanLamSang,
        [ChoKetQua] = ChoKetQua,
        [ChoKetLuan] = ChoKetLuan,
        [DaKham] = DaKham,
        [DaDong] = DaDong,
        [DaHuy] = DaHuy,
    };

    private static readonly Dictionary<string, string> CanonicalToLegacy = new(StringComparer.OrdinalIgnoreCase)
    {
        [MoiTao] = "MOI",
        [DaTiepDon] = "CHUA_CHI_DINH",
        [ChoDichVu] = "CHO_CHI_DINH",
        [DichVuNhap] = "DICH_VU_NHAP",
        [ChoThanhToan] = "CHO_THANH_TOAN",
        [DaThanhToan] = "DA_THANH_TOAN",
        [ChoChuyenKhu] = "CHO_CHUYEN_KHU",
        [DaNhanKhuMoi] = "DA_NHAN_KHU_MOI",
        [HuyChuyenKhu] = "HUY_CHUYEN_KHU",
        [ChoKham] = "CHI_DINH",
        [DangKham] = "DANG_KHAM",
        [ChoCanLamSang] = "CHO_THUC_HIEN",
        [ChoKetQua] = "CHO_KET_QUA",
        [ChoKetLuan] = "CHO_KET_LUAN",
        [DaKham] = "DA_KHAM",
        [DaDong] = "DONG",
        [DaHuy] = "HUY",
    };

    public HoSoTrangThaiService(DACNDbContext db)
    {
        _db = db;
    }

    public string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return string.Empty;
        var trimmed = status.Trim().ToUpperInvariant();
        return CanonicalAliasMap.TryGetValue(trimmed, out var mapped) ? mapped : trimmed;
    }

    public string ToLegacyStatus(string? status)
    {
        var canonical = NormalizeStatus(status);
        if (string.IsNullOrWhiteSpace(canonical)) return string.Empty;
        return CanonicalToLegacy.TryGetValue(canonical, out var legacy) ? legacy : canonical;
    }

    public bool IsCancelled(string? status)
    {
        return string.Equals(NormalizeStatus(status), DaHuy, StringComparison.OrdinalIgnoreCase);
    }

    public bool IsClosedOrCompleted(string? status)
    {
        var normalized = NormalizeStatus(status);
        return normalized == DaKham || normalized == DaDong;
    }

    public bool IsActiveReceptionFlow(string? status)
    {
        var normalized = NormalizeStatus(status);
        return normalized is
            MoiTao or
            DaTiepDon or
            ChoDichVu or
            DichVuNhap or
            ChoThanhToan or
            DaThanhToan or
            ChoChuyenKhu or
            DaNhanKhuMoi or
            HuyChuyenKhu or
            ChoKham or
            DangKham or
            ChoCanLamSang or
            ChoKetQua or
            ChoKetLuan;
    }

    public bool IsProcessingTabStatus(string? status)
    {
        var normalized = NormalizeStatus(status);
        return normalized is
            MoiTao or
            DaTiepDon or
            ChoDichVu or
            DichVuNhap or
            ChoThanhToan or
            DaThanhToan or
            ChoChuyenKhu or
            DaNhanKhuMoi or
            HuyChuyenKhu or
            ChoKham or
            DangKham;
    }

    public bool IsPendingCarryOverStatus(string? status)
    {
        var normalized = NormalizeStatus(status);
        return normalized is
            ChoDichVu or
            DichVuNhap or
            ChoThanhToan or
            DaThanhToan or
            ChoChuyenKhu or
            DaNhanKhuMoi or
            HuyChuyenKhu or
            ChoKham or
            DangKham or
            ChoCanLamSang or
            ChoKetQua or
            ChoKetLuan;
    }

    public bool CanEditEncounter(string? status, string? roleCode = null)
    {
        var normalized = NormalizeStatus(status);
        var role = (roleCode ?? string.Empty).Trim().ToUpperInvariant();
        if (role == "ADMIN" || role == "QUAN_TRI") return !IsCancelled(normalized) && normalized != DaDong;

        return normalized is DaTiepDon or ChoDichVu or DichVuNhap or ChoThanhToan or DaNhanKhuMoi or HuyChuyenKhu;
    }

    public bool CanCancelEncounter(string? status, string? roleCode = null)
    {
        var normalized = NormalizeStatus(status);
        var role = (roleCode ?? string.Empty).Trim().ToUpperInvariant();
        if (role == "ADMIN" || role == "QUAN_TRI") return normalized != DaDong;

        return normalized is MoiTao or DaTiepDon or ChoDichVu or DichVuNhap or ChoThanhToan or DaThanhToan or ChoChuyenKhu or DaNhanKhuMoi or HuyChuyenKhu or ChoKham;
    }

    public bool CanEditServiceOrder(string? status, string? roleCode = null)
    {
        var normalized = NormalizeStatus(status);
        var role = (roleCode ?? string.Empty).Trim().ToUpperInvariant();
        if (role == "ADMIN" || role == "QUAN_TRI") return !IsCancelled(normalized) && normalized != DaDong;

        return normalized is DaTiepDon or ChoDichVu or DichVuNhap or ChoThanhToan or DaNhanKhuMoi or HuyChuyenKhu;
    }

    public HoSoTransitionResult ApplyTransition(
        HoSoBenhAn hoSo,
        string toStatus,
        long? actorUserId,
        string action,
        string? note = null,
        object? metadata = null
    )
    {
        var from = NormalizeStatus(hoSo.TrangThai);
        var to = NormalizeStatus(toStatus);

        if (string.IsNullOrWhiteSpace(to))
        {
            return new HoSoTransitionResult(false, false, from, to, "Trạng thái đích không hợp lệ.");
        }

        if (from == to)
        {
            return new HoSoTransitionResult(true, false, from, to);
        }

        if (!AllowedTransitions.TryGetValue(from, out var allowedTo))
        {
            return new HoSoTransitionResult(
                false,
                false,
                from,
                to,
                $"Trạng thái hiện tại '{from}' không được định nghĩa trong state machine."
            );
        }

        if (!allowedTo.Contains(to))
        {
            return new HoSoTransitionResult(
                false,
                false,
                from,
                to,
                $"Không cho phép chuyển trạng thái từ '{from}' sang '{to}'."
            );
        }

        hoSo.TrangThai = to;
        hoSo.UpdatedAt = DateTime.Now;

        _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
        {
            IdHoSo = hoSo.Id,
            FromTrangThai = string.IsNullOrWhiteSpace(from) ? null : from,
            ToTrangThai = to,
            Action = string.IsNullOrWhiteSpace(action) ? "STATUS_UPDATE" : action.Trim().ToUpperInvariant(),
            Note = TextEncodingRepair.Repair(note),
            IdNguoiDung = actorUserId,
            CreatedAt = DateTime.Now,
            Metadata = metadata == null ? null : JsonSerializer.Serialize(metadata)
        });

        return new HoSoTransitionResult(true, true, from, to);
    }
}
