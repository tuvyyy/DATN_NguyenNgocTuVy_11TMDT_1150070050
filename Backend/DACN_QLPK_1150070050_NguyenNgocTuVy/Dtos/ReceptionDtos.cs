namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Dtos;

public class PatientLookupRequest
{
    public string? SoDienThoai { get; set; }
    public string? CCCD { get; set; }
    public string? MaBenhNhan { get; set; }
    public string? MaHoSo { get; set; }
    public string? HoTen { get; set; }
    public DateTime? NgaySinh { get; set; }
    public string? GioiTinh { get; set; }
    public int? IdKhuTiepDon { get; set; }
    public string? MaKhuTiepDon { get; set; }
}

public class FullReceptionRequest
{
    public long IdBenhNhan { get; set; }
    public long IdNguoiTao { get; set; }
    public int IdPhong { get; set; }

    public double? NhietDo { get; set; }
    public int? HuyetApTamThu { get; set; }
    public int? HuyetApTamTruong { get; set; }
    public int? NhipTim { get; set; }
    public int? NhipTho { get; set; }
    public double? CanNang { get; set; }
    public double? ChieuCao { get; set; }
    public int? SpO2 { get; set; }
}

public class PatientCreateRequest
{
    public string Ho_ten { get; set; } = default!;
    public DateTime? Ngay_sinh { get; set; }
    public string? Gioi_tinh { get; set; }
    public string? CCCD { get; set; }
    public string? So_dien_thoai { get; set; }
    public string? Email { get; set; }
    public string? Quoc_tich { get; set; }
    public string? Dan_toc { get; set; }
    public string? Nghe_nghiep { get; set; }
    public string? Dia_chi_duong { get; set; }
    public string? Dia_chi_xa { get; set; }
    public string? Dia_chi_huyen { get; set; }
    public string? Dia_chi_tinh { get; set; }
    public string? Quoc_gia { get; set; }
    public string? Nguoi_lien_he_khan_cap { get; set; }
    public string? Sdt_lien_he_khan_cap { get; set; }
    public string? Quan_he_lien_he_khan_cap { get; set; }
    public string? Nguoi_giam_ho { get; set; }
    public string? Sdt_giam_ho { get; set; }
    public string? Quan_he_giam_ho { get; set; }
    public string? Ghi_chu_dinh_danh { get; set; }
    public bool? Is_potential_duplicate { get; set; }
    public string? Duplicate_reason { get; set; }
    public string? IdempotencyKey { get; set; }
}

public class ReceptionInfoDto
{
    public int? IdKhuTiepDon { get; set; }
    public string? MaKhuTiepDon { get; set; }
    public string? TenKhuTiepDon { get; set; }
    public int? IdQuayTiepDon { get; set; }
    public string? MaQuayTiepDon { get; set; }
    public string? TenQuayTiepDon { get; set; }
    public string? LyDoChuyenKhu { get; set; }
    public string? NguonTiepNhan { get; set; }
    public string? LoaiKham { get; set; }
    public string? LyDoKham { get; set; }
    public string? TrieuChungBanDau { get; set; }
    public DateTime? ThoiGianXuatHienTrieuChung { get; set; }
    public int? MucDoDau { get; set; }
    public string? MucUuTien { get; set; }
    public string? GhiChuTiepDon { get; set; }
    public string? DoiTuongThanhToan { get; set; }
    public string? LyDoTaoThemLuotTrongNgay { get; set; }
    public string? AppointmentCode { get; set; }
    public bool? IsAppointmentLate { get; set; }
    public string? InsuranceSoThe { get; set; }
    public DateTime? InsuranceNgayHetHan { get; set; }
    public string? InsuranceNoiDangKyKcb { get; set; }
    public string? InsuranceTuyenKham { get; set; }
    public string? InsuranceGiayChuyenTuyen { get; set; }
    public string? TinhTrangDiUngThuoc { get; set; }
    public string? BenhNen { get; set; }
    public string? TinhTrangMangThai { get; set; }
    public List<string>? TrieuChungNguyHiem { get; set; }
}

public class ReceptionCreateRecordRequest
{
    public long? IdHoSo { get; set; }
    public long IdBenhNhan { get; set; }
    public long IdNguoiTao { get; set; }
    public SinhHieuDto? SinhHieu { get; set; }
    public ReceptionInfoDto? ThongTinTiepDon { get; set; }
    public bool ChuyenSangDangKyDichVu { get; set; }
    public string? IdempotencyKey { get; set; }
}

public class AppointmentCreateRequest
{
    public string? GhiChu { get; set; }
    public long IdBenhNhan { get; set; }
    public long? IdBacSi { get; set; }
    public int? IdPhong { get; set; }
    public DateOnly Ngay { get; set; }
    public TimeOnly GioBatDau { get; set; }
    public TimeOnly? GioKetThuc { get; set; }
    public long IdNguoiTao { get; set; }
}

public class DirectVisitCreateRequest
{
    public long IdBenhNhan { get; set; }
    public long? IdHoSo { get; set; }
    public int IdPhong { get; set; }
    public long IdTiepDon { get; set; }
    public string? LyDo { get; set; }
}

public class RecordCreateDto
{
    public long IdBenhNhan { get; set; }
    public long IdNguoiTao { get; set; }
    public SinhHieuDto? SinhHieu { get; set; }
    public ReceptionInfoDto? ThongTinTiepDon { get; set; }
    public bool ChuyenSangDangKyDichVu { get; set; }
    public string? IdempotencyKey { get; set; }
}

public class SinhHieuDto
{
    public double? NhietDo { get; set; }
    public int? HuyetApTamThu { get; set; }
    public int? HuyetApTamTruong { get; set; }
    public int? NhipTim { get; set; }
    public int? NhipTho { get; set; }
    public int? SpO2 { get; set; }
    public double? CanNang { get; set; }
    public double? ChieuCao { get; set; }
    public double? Bmi { get; set; }
    public string? DiUngThuoc { get; set; }
    public string? BenhNen { get; set; }
    public string? TinhTrangMangThai { get; set; }
    public List<string>? TrieuChungNguyHiem { get; set; }
    public int? MucDoDau { get; set; }
}

public class ReceptionListQueryDto
{
    public DateTime? Date { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Keyword { get; set; }
    public string? Status { get; set; }
    public string? Tab { get; set; }
    public int? IdKhuTiepDon { get; set; }
    public string? MaKhuTiepDon { get; set; }
    public string? LoaiKham { get; set; }
    public string? NguonTiepNhan { get; set; }
    public string? MucUuTien { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; } = "ngay_tao";
    public string? SortDir { get; set; } = "desc";
}

public class ReceptionStatusUpdateDto
{
    public string ToStatus { get; set; } = default!;
    public string? Note { get; set; }
}

public class CancelReceptionRequest
{
    public string? MaLyDoHuy { get; set; }
    public string? LyDoHuy { get; set; }
    public string? GhiChu { get; set; }
}

public class AreaTransferRequestDto
{
    public int IdKhuTiepDonMoi { get; set; }
    public int? IdQuayTiepDonMoi { get; set; }
    public string? LyDo { get; set; }
    public string? GhiChu { get; set; }
}

public class AreaTransferAcceptDto
{
    public int? IdQuayTiepDonMoi { get; set; }
    public string? GhiChu { get; set; }
}

public class AreaTransferCancelDto
{
    public string? LyDo { get; set; }
    public string? GhiChu { get; set; }
}

public class ReceptionExportQueryDto : ReceptionListQueryDto
{
    public string? Format { get; set; } = "csv";
}

public class WardSearchQueryDto
{
    public string? Q { get; set; }
    public int Limit { get; set; } = 12;
}
