namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Dtos
{
    public class LanKhamUpdateDto
    {
        public string? ChanDoanSoBo { get; set; }
        public string? ChanDoanCuoi { get; set; }
        public string? KetQuaKham { get; set; }
        public string? HuongXuTri { get; set; }
        public string? GhiChu { get; set; }
        public long? IdBenh { get; set; }
        public List<long>? IdBenhKemTheo { get; set; }
        public string? BenhKemTheo { get; set; }
        public bool ConfirmNoVital { get; set; }
        public GiayHenKhamLaiDto? GiayHenKhamLai { get; set; }
        public GiayKetLuanKhamDto? GiayKetLuanKham { get; set; }
        public KetThucKhamDto? KetThucKham { get; set; }
    }

    public class ReopenLanKhamDto
    {
        public string? LyDo { get; set; }
    }

    public class GiayHenKhamLaiDto
    {
        public string? HinhThucDieuTri { get; set; }
        public string? KetQua { get; set; }
        public string? LyDoHen { get; set; }
        public string? BenhKemTheo { get; set; }
        public string? LoiDan { get; set; }
        public System.DateTime? NgayHen { get; set; }
        public string? PhongHen { get; set; }
        public string? GhiChu { get; set; }
        public bool DaKy { get; set; }
        public string? BacSiKy { get; set; }
        public System.DateTime? SignedAt { get; set; }
    }

    public class KetThucKhamDto
    {
        public string? HuongDieuTri { get; set; }
        public string? KetQua { get; set; }
        public string? QuaTrinhBenhLy { get; set; }
        public string? LoiDan { get; set; }
        public string? LyDoVaoVien { get; set; }
        public string? KhoaNhapVien { get; set; }
        public string? KinhGui { get; set; }
        public string? DauHieuLamSang { get; set; }
        public string? LyDoChuyenTuyen { get; set; }
        public string? HuongDieuTriChuyenTuyen { get; set; }
        public string? PhuongTienVanChuyen { get; set; }
        public string? LyDoKhongKham { get; set; }
    }

    public class GiayKetLuanKhamDto
    {
        public string? LoaiGiay { get; set; }
        public string? HinhThucDieuTri { get; set; }
        public string? KetQua { get; set; }
        public string? ChanDoan { get; set; }
        public string? BenhKemTheo { get; set; }
        public string? LyDoHen { get; set; }
        public string? LoiDan { get; set; }
        public DateTime? NgayHen { get; set; }
        public string? PhongHen { get; set; }
        public string? LyDoVaoVien { get; set; }
        public string? KhoaNhapVien { get; set; }
        public string? KinhGui { get; set; }
        public string? DauHieuLamSang { get; set; }
        public string? LyDoChuyenTuyen { get; set; }
        public string? HuongDieuTriChuyenTuyen { get; set; }
        public string? PhuongTienVanChuyen { get; set; }
        public string? LyDoKhongKham { get; set; }
        public string? GhiChu { get; set; }
        public bool DaKy { get; set; }
        public string? BacSiKy { get; set; }
        public DateTime? SignedAt { get; set; }
    }
}
