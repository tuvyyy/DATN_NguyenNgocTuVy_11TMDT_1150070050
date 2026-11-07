namespace Clinic.Api.Services
{
    public interface IPasswordHasher
    {
        // ✅ Dùng đúng tên và kiểu trả về với class PasswordHasher
        string HashPassword(string password, string salt);
        bool Verify(string password, string hash, string salt);

        // ⚙️ Tuỳ chọn – giúp tạo hash và salt mới khi đăng ký hoặc reset
        (string hash, string salt) Hash(string password);
    }
}
