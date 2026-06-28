using System;
using System.Collections.Generic;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Dtos
{
    // ==============================
    // 🧩 DTO chính cho nghiệp vụ hóa đơn
    // ==============================

    /// <summary>
    /// DTO tạo hóa đơn CLS (dịch vụ kỹ thuật)
    /// </summary>
    public class CLSRequest
    {
        /// <summary>Id bệnh nhân cần tạo hóa đơn CLS</summary>
        public long IdBenhNhan { get; set; }

        /// <summary>Danh sách dịch vụ chỉ định CLS</summary>
        public List<DichVuCLSItem> DichVus { get; set; } = new();
    }

    /// <summary>
    /// Dịch vụ trong hóa đơn CLS
    /// </summary>
    public class DichVuCLSItem
    {
        /// <summary>Id dịch vụ</summary>
        public long IdDichVu { get; set; }

        /// <summary>Phòng thực hiện dịch vụ</summary>
        public int IdPhong { get; set; }

        /// <summary>Tên dịch vụ</summary>
        public string TenDichVu { get; set; } = string.Empty;

        /// <summary>Số lượng dịch vụ chỉ định</summary>
        public int SoLuong { get; set; } = 1;
    }

    // ==============================
    // 💊 DTO tạo hóa đơn thuốc
    // ==============================

    /// <summary>
    /// Yêu cầu tạo hóa đơn thuốc từ đơn thuốc có sẵn
    /// </summary>
    public class TaoHoaDonThuocRequest
    {
        /// <summary>Id đơn thuốc cần thanh toán</summary>
        public long IdDonThuoc { get; set; }
    }

    // ==============================
    // 🧾 DTO hiển thị danh sách hóa đơn
    // ==============================

    public class HoaDonListDto
    {
        public long Id { get; set; }
        public string MaHd { get; set; } = string.Empty;
        public string? LoaiHoaDon { get; set; }
        public string? BenhNhan { get; set; }
        public long? IdBenhNhan { get; set; }
        public string? SoDienThoai { get; set; }
        public long? IdHoSo { get; set; }
        public int? IdKhuTiepDon { get; set; }
        public string? MaKhuTiepDon { get; set; }
        public string? TenKhuTiepDon { get; set; }
        public string? PhongKham { get; set; }
        public bool CanThanhToan { get; set; } = true;
        public string? LyDoKhongThanhToan { get; set; }
        public bool QueueCreated { get; set; }
        public decimal? TongTien { get; set; }
        public DateTime? NgayTao { get; set; }
        public string? TrangThai { get; set; }
    }

    // ==============================
    // 📄 DTO chi tiết hóa đơn
    // ==============================

    public class HoaDonDetailDto
    {
        public long Id { get; set; }
        public string MaHd { get; set; } = string.Empty;
        public string? LoaiHoaDon { get; set; }
        public decimal? TongTien { get; set; }
        public string? TrangThai { get; set; }
        public DateTime? NgayTao { get; set; }
        public DateTime? NgayThanhToan { get; set; }
        public string? BenhNhan { get; set; }
        public long? IdBenhNhan { get; set; }
        public string? SoDienThoai { get; set; }
        public long? IdHoSo { get; set; }
        public int? IdKhuTiepDon { get; set; }
        public string? MaKhuTiepDon { get; set; }
        public string? TenKhuTiepDon { get; set; }
        public string? PhongKham { get; set; }
        public bool CanThanhToan { get; set; } = true;
        public string? LyDoKhongThanhToan { get; set; }
        public bool QueueCreated { get; set; }
        public List<HoaDonItemDto> ChiTiet { get; set; } = new();
    }

    public class HoaDonItemDto
    {
        public string? MoTa { get; set; }
        public long? IdDichVu { get; set; }
        public string? MaDichVu { get; set; }
        public string? TenDichVu { get; set; }
        public int? IdPhong { get; set; }
        public string? TenPhong { get; set; }
        public int? IdKhuTiepDon { get; set; }
        public string? MaKhuTiepDon { get; set; }
        public string? TenKhuTiepDon { get; set; }
        public bool KhuHopLe { get; set; } = true;
        public string? LyDoKhongHopLe { get; set; }
        public int? SoLuong { get; set; }
        public decimal? DonGia { get; set; }
        public decimal? ThanhTien { get; set; }
    }
    public class ConfirmPaymentRequest
    {
        public long IdThuNgan { get; set; }
        public string? HinhThucThanhToan { get; set; }
    }
}
