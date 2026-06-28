# Nội dung bổ sung theo góp ý báo cáo thực tập

File này tổng hợp các đoạn có thể chèn/thay vào báo cáo để làm rõ: kết quả dự kiến đạt được, sản phẩm cụ thể, công nghệ lập trình, công việc hỗ trợ triển khai và chức năng của chương trình mô phỏng.

## 1. Đoạn chèn sau mục 1.6: Kết quả dự kiến đạt được

### 1.7. Kết quả dự kiến đạt được

Sau quá trình thực tập và thực hiện báo cáo, kết quả dự kiến đạt được không chỉ dừng lại ở việc tìm hiểu lý thuyết về phần mềm y tế, mà còn hướng đến việc hình thành một sản phẩm mô phỏng có thể minh họa được các nghiệp vụ chính trong quy trình khám chữa bệnh ngoại trú. Cụ thể, báo cáo kỳ vọng đạt được các kết quả sau:

Thứ nhất, sinh viên nắm được quy trình khám chữa bệnh ngoại trú tại bệnh viện ở mức tổng quát, bao gồm các bước lấy số, tiếp đón, tạo lượt khám, thanh toán, khám bệnh, chỉ định cận lâm sàng, trả kết quả, kê đơn, phát thuốc và kết thúc hồ sơ khám.

Thứ hai, sinh viên phân tích được các nhóm chức năng chính theo từng vai trò người dùng trong hệ thống như nhân viên tiếp đón, thu ngân, bác sĩ, nhân viên cận lâm sàng, nhân viên phát thuốc, nhân viên nhà thuốc và quản trị viên.

Thứ ba, sinh viên xây dựng được giao diện mô phỏng hệ thống phần mềm y tế phục vụ minh họa quy trình ngoại trú. Giao diện mô phỏng thể hiện được các màn hình chính như đăng nhập, trang tổng quan, tiếp đón người bệnh, danh sách tiếp đón, thu ngân, khám bệnh, thực hiện cận lâm sàng, kê đơn, in giấy tờ khám bệnh, quản lý danh mục và phân quyền người dùng.

Thứ tư, sinh viên xây dựng được một số tình huống kiểm thử cơ bản nhằm kiểm tra luồng thao tác trên giao diện mô phỏng, đối chiếu giữa kết quả mong đợi và kết quả thực tế, từ đó ghi nhận các điểm cần điều chỉnh về giao diện, trạng thái xử lý và luồng nghiệp vụ.

Thứ năm, sinh viên hiểu rõ hơn công việc hỗ trợ triển khai phần mềm tại đơn vị y tế, bao gồm quan sát thao tác thực tế, hỗ trợ kiểm tra luồng nghiệp vụ, ghi nhận lỗi/phản hồi, tổng hợp vấn đề và phối hợp chuyển thông tin cho nhóm phụ trách xử lý.

Kết quả cuối cùng của báo cáo là một bản phân tích nghiệp vụ kết hợp với giao diện mô phỏng hệ thống quản lý khám chữa bệnh ngoại trú. Sản phẩm này không thay thế hệ thống thực tế đang triển khai tại bệnh viện, nhưng có ý nghĩa trong việc minh họa quy trình, thể hiện khả năng phân tích yêu cầu, thiết kế giao diện, kiểm thử chức năng và tổng hợp kết quả thực tập.

## 2. Đoạn chèn vào Chương 2: Công nghệ lập trình sử dụng

### 2.7. Công nghệ lập trình và công cụ sử dụng trong giao diện mô phỏng

Để xây dựng giao diện mô phỏng hệ thống phần mềm y tế, sinh viên sử dụng mô hình ứng dụng web gồm phần giao diện người dùng, phần xử lý nghiệp vụ phía máy chủ và cơ sở dữ liệu. Việc lựa chọn công nghệ được thực hiện theo hướng phù hợp với một hệ thống quản lý bệnh viện có nhiều vai trò người dùng, nhiều phân hệ nghiệp vụ và cần trao đổi dữ liệu giữa frontend và backend.

Về phía frontend, giao diện mô phỏng được xây dựng bằng ReactJS. ReactJS hỗ trợ xây dựng giao diện theo hướng component, giúp chia nhỏ màn hình thành các thành phần dễ quản lý như form tiếp đón, bảng danh sách người bệnh, modal in giấy tờ, màn hình thu ngân, màn hình khám bệnh, màn hình quản trị và các thành phần dùng chung. Ngoài ra, hệ thống sử dụng React Router để điều hướng giữa các trang theo vai trò người dùng, Axios để gọi API, Tailwind CSS để xây dựng giao diện nhanh và thống nhất, cùng một số thư viện hỗ trợ như Lucide React, SweetAlert2, Framer Motion và pdf-lib.

Về phía backend, hệ thống mô phỏng sử dụng ASP.NET Core Web API. Backend có nhiệm vụ tiếp nhận yêu cầu từ frontend, xử lý nghiệp vụ, kiểm tra dữ liệu, quản lý trạng thái hồ sơ, phân quyền người dùng và trả dữ liệu về cho giao diện. Các controller được tổ chức theo nhóm chức năng như xác thực, tiếp đón, thu ngân, khám bệnh, chỉ định dịch vụ kỹ thuật, đơn thuốc, danh mục, người dùng và phân quyền.

Cơ sở dữ liệu sử dụng SQL Server để lưu trữ các thông tin liên quan đến người bệnh, hồ sơ bệnh án, lượt khám, chỉ định dịch vụ, thuốc, tài khoản người dùng, vai trò, quyền hạn và các dữ liệu danh mục. Việc kết nối dữ liệu giữa backend và SQL Server được hỗ trợ thông qua Entity Framework Core, giúp thao tác với dữ liệu theo mô hình đối tượng và thuận tiện trong quá trình phát triển.

Bên cạnh đó, hệ thống còn sử dụng JSON Web Token (JWT) để phục vụ xác thực người dùng và kiểm soát phiên đăng nhập. Việc phân quyền được mô phỏng theo vai trò, ví dụ: tài khoản lễ tân được sử dụng chức năng tiếp đón, bác sĩ sử dụng chức năng khám bệnh, thu ngân sử dụng chức năng thanh toán và quản trị viên sử dụng chức năng quản lý tài khoản, vai trò, quyền hạn.

Các công cụ hỗ trợ trong quá trình xây dựng gồm Visual Studio/Visual Studio Code để lập trình, SQL Server Management Studio để kiểm tra dữ liệu, Git để quản lý mã nguồn và trình duyệt web để kiểm thử giao diện. Nhờ các công nghệ và công cụ này, sinh viên có thể xây dựng được một hệ thống mô phỏng có giao diện trực quan, có luồng xử lý giữa frontend và backend, có dữ liệu lưu trữ và có phân quyền theo vai trò người dùng.

Bảng 2.x: Công nghệ và công cụ sử dụng

| Nhóm công nghệ | Công nghệ/Công cụ | Vai trò sử dụng |
| --- | --- | --- |
| Frontend | ReactJS | Xây dựng giao diện mô phỏng theo từng vai trò người dùng |
| Điều hướng | React Router | Quản lý route đăng nhập, dashboard, tiếp đón, thu ngân, bác sĩ, quản trị |
| Gọi API | Axios | Trao đổi dữ liệu giữa frontend và backend |
| Giao diện | Tailwind CSS, Lucide React, SweetAlert2 | Thiết kế bố cục, icon, thông báo và modal thao tác |
| Backend | ASP.NET Core Web API | Xử lý nghiệp vụ, cung cấp API cho frontend |
| Cơ sở dữ liệu | SQL Server | Lưu trữ dữ liệu người bệnh, hồ sơ, lượt khám, thuốc, quyền người dùng |
| ORM | Entity Framework Core | Kết nối và thao tác dữ liệu SQL Server từ backend |
| Xác thực | JWT | Đăng nhập, xác thực tài khoản và kiểm soát truy cập |
| Công cụ phát triển | Visual Studio Code, Visual Studio, SSMS, Git | Lập trình, kiểm thử, quản lý mã nguồn và kiểm tra dữ liệu |

## 3. Đoạn thay cho mục 3.1: Mô tả bài toán và sản phẩm cụ thể

### 3.1. Mô tả bài toán, sản phẩm mô phỏng và phạm vi thực hiện

Từ quá trình thực tập tại Công ty Cổ phần Công nghệ ISOFH và quá trình tìm hiểu hoạt động hỗ trợ triển khai phần mềm y tế tại Bệnh viện Chợ Rẫy, sinh viên lựa chọn bài toán mô phỏng quy trình quản lý khám chữa bệnh ngoại trú trên hệ thống phần mềm y tế. Bài toán tập trung vào việc mô tả cách các bộ phận trong bệnh viện phối hợp xử lý một lượt khám của người bệnh, từ khi người bệnh được tiếp nhận đến khi hoàn tất khám, thanh toán và nhận thuốc.

Sản phẩm cụ thể của báo cáo là một hệ thống web mô phỏng phần mềm quản lý khám chữa bệnh ngoại trú. Hệ thống được xây dựng nhằm minh họa các chức năng chính theo từng vai trò người dùng, bao gồm lễ tân/nhân viên tiếp đón, thu ngân, bác sĩ, nhân viên cận lâm sàng, nhân viên nhà thuốc và quản trị viên. Người dùng có thể đăng nhập vào hệ thống, truy cập màn hình phù hợp với vai trò và thực hiện các thao tác nghiệp vụ cơ bản.

Trong phạm vi mô phỏng, hệ thống có các nhóm chức năng chính sau:

- Quản lý đăng nhập và phân quyền người dùng theo vai trò.
- Quản lý thông tin người bệnh, tìm kiếm người bệnh cũ và tạo mới hồ sơ người bệnh.
- Tiếp đón người bệnh, tạo lượt khám, chọn khu/quầy/phòng khám và in phiếu khám.
- Quản lý danh sách tiếp đón theo trạng thái trong ngày, hồ sơ tồn, hồ sơ hoàn tất hoặc đã hủy.
- Thanh toán dịch vụ, quản lý phiếu thu, hóa đơn, miễn giảm và tạm ứng.
- Khám bệnh cho bác sĩ, gồm xem danh sách chờ khám, nhập thông tin khám, chẩn đoán, chỉ định dịch vụ kỹ thuật, kê đơn, kết luận và in giấy tờ khám bệnh.
- Thực hiện cận lâm sàng ở mức mô phỏng, gồm tiếp nhận chỉ định, cập nhật trạng thái và trả kết quả.
- Quản lý thuốc, đơn thuốc, phát thuốc và bán thuốc ở mức cơ bản.
- Quản trị hệ thống, gồm quản lý tài khoản, vai trò, phân quyền, danh mục dịch vụ và danh mục thuốc.

Phạm vi nghiệp vụ của báo cáo tập trung vào quy trình ngoại trú, đặc biệt là các nghiệp vụ tiếp đón, thu ngân, khám bệnh, cận lâm sàng và nhà thuốc. Các nghiệp vụ lớn khác như nội trú, kho dược, phẫu thuật/thủ thuật, khám sức khỏe hợp đồng hoặc quản lý máu không được đưa vào phạm vi mô phỏng chính vì có độ phức tạp cao và không thuộc trọng tâm công việc thực tập.

Mục tiêu của sản phẩm mô phỏng không phải là thay thế hệ thống HIS thực tế, mà là trực quan hóa các luồng nghiệp vụ đã được tìm hiểu trong quá trình thực tập. Thông qua sản phẩm này, sinh viên có thể thể hiện được khả năng phân tích quy trình, xác định chức năng theo vai trò, thiết kế giao diện, kiểm thử luồng thao tác và ghi nhận các điểm cần điều chỉnh khi triển khai phần mềm y tế trong môi trường thực tế.

## 4. Đoạn bổ sung làm rõ “Hỗ trợ triển khai là làm gì”

### 3.4. Quy trình hỗ trợ kiểm tra trong giai đoạn triển khai/go-live

Trong báo cáo này, “hỗ trợ triển khai” được hiểu là nhóm công việc hỗ trợ đội dự án trong giai đoạn phần mềm được đưa vào sử dụng hoặc kiểm tra tại môi trường gần với thực tế. Công việc này không chỉ là quan sát chung, mà bao gồm các hoạt động cụ thể nhằm bảo đảm hệ thống vận hành đúng luồng nghiệp vụ và người dùng có thể thao tác thuận lợi.

Các công việc hỗ trợ triển khai sinh viên được tiếp cận và thực hiện ở mức hỗ trợ bao gồm:

Thứ nhất, quan sát thao tác thực tế của người dùng tại các bộ phận như tiếp đón, thu ngân, phòng khám và cận lâm sàng. Việc quan sát giúp sinh viên hiểu người dùng thao tác theo trình tự nào, thường gặp khó khăn ở bước nào và màn hình nào cần được kiểm tra kỹ hơn.

Thứ hai, hỗ trợ kiểm tra các luồng nghiệp vụ chính trên phần mềm, ví dụ: tạo hồ sơ người bệnh, tạo lượt khám, kiểm tra thông tin BHYT, chỉ định dịch vụ khám, thanh toán, bác sĩ tiếp nhận người bệnh, chỉ định cận lâm sàng, trả kết quả và in giấy tờ liên quan. Khi kiểm tra, sinh viên đối chiếu thao tác thực tế với kết quả mong đợi để phát hiện điểm sai lệch.

Thứ ba, ghi nhận lỗi và phản hồi từ người dùng. Các lỗi có thể liên quan đến hiển thị giao diện, trạng thái hồ sơ, thông tin người bệnh, phiếu in, kết quả cận lâm sàng, quyền thao tác hoặc luồng xử lý chưa phù hợp. Nội dung ghi nhận cần thể hiện rõ màn hình phát sinh lỗi, bước thao tác, kết quả thực tế, kết quả mong đợi và mức độ ảnh hưởng.

Thứ tư, tổng hợp vấn đề theo nhóm nghiệp vụ để chuyển cho người phụ trách. Ví dụ, nhóm lỗi tiếp đón, nhóm lỗi thu ngân, nhóm lỗi khám bệnh, nhóm lỗi phiếu in, nhóm lỗi phân quyền hoặc nhóm lỗi đồng bộ kết quả. Việc phân nhóm giúp đội dự án dễ ưu tiên xử lý và tránh ghi nhận rời rạc.

Thứ năm, hỗ trợ kiểm tra lại sau khi có điều chỉnh. Khi một lỗi hoặc góp ý đã được xử lý, sinh viên có thể kiểm tra lại luồng thao tác để xác nhận vấn đề đã được khắc phục hay chưa. Đây là bước giúp bảo đảm phản hồi của người dùng được xử lý đúng và hệ thống ổn định hơn.

Như vậy, công việc hỗ trợ triển khai trong phạm vi thực tập bao gồm quan sát, kiểm tra luồng, ghi nhận lỗi, tổng hợp phản hồi và kiểm tra lại sau điều chỉnh. Đây là nhóm công việc giúp sinh viên hiểu rõ mối liên hệ giữa nghiệp vụ thực tế, tài liệu yêu cầu, giao diện phần mềm và quá trình vận hành tại bệnh viện.

## 5. Bảng mô tả nhanh chương trình có chức năng gì

Có thể chèn sau mục 3.6 hoặc thay cho phần mô tả rời rạc các màn hình.

### Bảng 3.x: Tóm tắt chức năng của chương trình mô phỏng

| Nhóm chức năng | Người dùng sử dụng | Chức năng cụ thể | Kết quả đầu ra |
| --- | --- | --- | --- |
| Đăng nhập và phân quyền | Tất cả người dùng | Đăng nhập bằng tài khoản, điều hướng theo vai trò | Người dùng vào đúng màn hình chức năng được cấp quyền |
| Trang tổng quan | Nhân viên y tế, quản trị viên | Xem số lượng hồ sơ, trạng thái xử lý trong ngày | Người dùng nắm nhanh tình hình tiếp đón, khám, thanh toán |
| Tiếp đón người bệnh | Lễ tân/Nhân viên tiếp đón | Tìm kiếm người bệnh, tạo/cập nhật hồ sơ, nhập sinh hiệu, chọn khu/quầy/phòng khám, tạo lượt khám | Hồ sơ và lượt khám được tạo, người bệnh được đưa vào hàng đợi xử lý |
| Danh sách tiếp đón | Lễ tân/Nhân viên tiếp đón | Lọc hồ sơ theo ngày, trạng thái, khu vực; nạp hồ sơ vào form; hủy tiếp đón; chọn dịch vụ | Nhân viên theo dõi được toàn bộ hồ sơ tiếp đón trong ngày |
| Thu ngân | Thu ngân | Tìm phiếu thu, xác nhận thanh toán, hoàn dịch vụ, in chứng từ | Trạng thái chi phí được cập nhật, chứng từ thanh toán được tạo |
| Quản lý tạm ứng | Thu ngân | Tạo phiếu tạm ứng, hoàn tạm ứng, hủy phiếu tạm ứng | Khoản tạm ứng của người bệnh được ghi nhận và theo dõi |
| Khám bệnh | Bác sĩ | Xem danh sách chờ khám, nhập thông tin khám, chẩn đoán, chỉ định CLS, kê đơn, kết luận | Hồ sơ khám được cập nhật, có chỉ định/đơn thuốc/giấy tờ cần in |
| In giấy tờ khám bệnh | Bác sĩ | Xem trước, ký, hủy ký và in giấy hẹn, giấy kết luận, phiếu tóm tắt, đơn thuốc | Giấy tờ khám bệnh được hiển thị và in theo từng hồ sơ |
| Cận lâm sàng | Nhân viên xét nghiệm, CĐHA/TDCN | Tiếp nhận chỉ định, cập nhật trạng thái thực hiện, trả kết quả | Kết quả CLS được chuyển về cho bác sĩ xem và kết luận |
| Nhà thuốc/Phát thuốc | Nhân viên nhà thuốc | Xem đơn thuốc, xác nhận phát thuốc, bán thuốc không BHYT | Đơn thuốc được xử lý, trạng thái phát thuốc được cập nhật |
| Quản trị người dùng | Quản trị viên | Quản lý tài khoản, vai trò và quyền thao tác | Người dùng được phân quyền đúng chức năng |
| Quản trị danh mục | Quản trị viên | Quản lý thuốc, dịch vụ kỹ thuật, giá dịch vụ, phòng/khu/quầy | Dữ liệu danh mục phục vụ các phân hệ được cập nhật |

## 6. Đoạn thay cho Chương 4 đang trống

### 4.1. Kết quả đạt được

Sau thời gian thực tập và thực hiện báo cáo, sinh viên đã đạt được một số kết quả chính. Về mặt nghiệp vụ, sinh viên nắm được quy trình khám chữa bệnh ngoại trú ở mức tổng quát, hiểu được vai trò của các bộ phận như tiếp đón, thu ngân, bác sĩ, cận lâm sàng, phát thuốc, nhà thuốc và quản trị hệ thống. Sinh viên cũng phân biệt được một số điểm khác nhau giữa luồng người bệnh có BHYT và không có BHYT.

Về mặt sản phẩm, sinh viên đã xây dựng được giao diện mô phỏng hệ thống phần mềm y tế theo mô hình web. Hệ thống mô phỏng có các chức năng chính như đăng nhập, phân quyền, tiếp đón người bệnh, quản lý danh sách hồ sơ, thanh toán, quản lý tạm ứng, khám bệnh, chỉ định cận lâm sàng, kê đơn, in giấy tờ khám bệnh, quản lý thuốc, quản lý dịch vụ kỹ thuật và quản trị người dùng.

Về mặt kiểm thử, sinh viên đã xây dựng được một số test case cơ bản để kiểm tra các luồng thao tác chính trên giao diện mô phỏng. Các test case tập trung vào việc đối chiếu kết quả mong đợi với kết quả thực tế, kiểm tra trạng thái hồ sơ và phát hiện các điểm cần cải thiện về giao diện hoặc luồng thao tác.

Về mặt triển khai, sinh viên hiểu rõ hơn công việc hỗ trợ triển khai phần mềm trong môi trường y tế, bao gồm quan sát người dùng, kiểm tra luồng nghiệp vụ, ghi nhận lỗi, tổng hợp phản hồi và hỗ trợ kiểm tra lại sau điều chỉnh. Đây là kết quả quan trọng giúp sinh viên liên hệ giữa kiến thức hệ thống thông tin với môi trường làm việc thực tế.

### 4.2. Kiến thức được củng cố

Thông qua quá trình thực tập, sinh viên củng cố được kiến thức về hệ thống thông tin quản lý, phân tích nghiệp vụ, thiết kế giao diện, kiểm thử phần mềm và cơ sở dữ liệu. Sinh viên hiểu rõ hơn cách một hệ thống phần mềm y tế được tổ chức theo nhiều phân hệ, mỗi phân hệ phục vụ một nhóm người dùng và một nhóm nghiệp vụ cụ thể.

Ngoài ra, sinh viên cũng củng cố kiến thức về quy trình phát triển phần mềm theo hướng lấy yêu cầu nghiệp vụ làm trung tâm. Trước khi xây dựng giao diện hoặc kiểm thử chức năng, cần hiểu rõ người dùng là ai, thao tác gì, dữ liệu đầu vào là gì, hệ thống xử lý ra sao và kết quả đầu ra cần đạt được là gì.

### 4.3. Kỹ năng tích lũy được

Sinh viên tích lũy được kỹ năng đọc hiểu tài liệu nghiệp vụ, phân tích yêu cầu chức năng, mô tả luồng xử lý, thiết kế giao diện theo vai trò người dùng và xây dựng test case kiểm thử. Bên cạnh đó, sinh viên rèn luyện kỹ năng quan sát thực tế, ghi nhận lỗi, tổng hợp phản hồi và trình bày vấn đề theo nhóm nghiệp vụ.

Trong quá trình xây dựng giao diện mô phỏng, sinh viên cũng rèn luyện kỹ năng sử dụng các công nghệ lập trình web như ReactJS, ASP.NET Core Web API, SQL Server, Entity Framework Core và các thư viện hỗ trợ giao diện. Việc kết hợp giữa nghiệp vụ và lập trình giúp sinh viên hiểu rõ hơn vai trò của ngành Hệ thống thông tin trong việc kết nối giữa người dùng, quy trình nghiệp vụ và giải pháp phần mềm.

### 4.4. Hạn chế

Do thời gian thực tập có giới hạn và phạm vi hệ thống phần mềm y tế khá rộng, báo cáo chỉ tập trung vào một số nghiệp vụ ngoại trú tiêu biểu. Một số nghiệp vụ phức tạp như nội trú, quản lý kho, phẫu thuật/thủ thuật, khám sức khỏe hợp đồng và quản lý máu chưa được đưa vào phạm vi mô phỏng chính.

Hệ thống được xây dựng trong báo cáo chỉ là giao diện mô phỏng, chưa phải sản phẩm triển khai thực tế tại bệnh viện. Một số kết nối quan trọng như cổng BHYT, LIS, PACS, hóa đơn điện tử hoặc dữ liệu thiết bị y tế mới được mô tả ở mức nghiệp vụ, chưa tích hợp thật. Dữ liệu sử dụng trong hệ thống chủ yếu là dữ liệu giả lập, chưa phản ánh đầy đủ các tình huống phức tạp trong môi trường bệnh viện.

### 4.5. Kiến nghị và hướng phát triển

Trong thời gian tới, hệ thống mô phỏng có thể được mở rộng thêm các phân hệ như nội trú, kho dược, khám sức khỏe, phẫu thuật/thủ thuật và báo cáo thống kê. Ngoài ra, có thể bổ sung các kịch bản kiểm thử nâng cao hơn như kiểm thử phân quyền, kiểm thử trạng thái hồ sơ, kiểm thử dữ liệu đầu vào, kiểm thử in giấy tờ và kiểm thử các trường hợp ngoại lệ trong quy trình khám chữa bệnh.

Về mặt kỹ thuật, hệ thống có thể phát triển thêm các chức năng liên kết dữ liệu giữa các phân hệ, giả lập kết nối LIS/PACS, chuẩn hóa mẫu phiếu in và bổ sung báo cáo tổng hợp theo ngày. Nếu có thêm thời gian, sinh viên có thể hoàn thiện giao diện theo hướng gần hơn với quy trình thực tế, cải thiện trải nghiệm người dùng và mở rộng bộ dữ liệu mô phỏng để phục vụ kiểm thử tốt hơn.

Từ kết quả thực hiện, có thể thấy việc kết hợp giữa phân tích nghiệp vụ, kiểm thử, hỗ trợ triển khai và xây dựng giao diện mô phỏng giúp sinh viên hiểu rõ hơn quá trình hình thành và vận hành một hệ thống phần mềm y tế. Đây là nền tảng quan trọng để sinh viên tiếp tục phát triển kỹ năng trong lĩnh vực hệ thống thông tin và phần mềm quản lý bệnh viện.

## 7. Các chỗ nên sửa nhanh trong bản hiện tại

- Ở mục 3.1 và 3.2, thay các cụm như “Nội viết”, “Gợi ý bảng”, “Mục này rất quan trọng...” bằng văn báo cáo hoàn chỉnh.
- Chương 4 hiện chỉ có tiêu đề mục, cần bổ sung nội dung chi tiết theo phần 6 ở trên.
- Mục lục đang bị lặp “2.4. Kiểm thử chức năng và giao diện” hai lần, nên sửa lại đánh số.
- Nên thêm mục “2.7. Công nghệ lập trình và công cụ sử dụng” vào Chương 2, sau mục 2.6.
- Nên thêm mục “1.7. Kết quả dự kiến đạt được” hoặc chèn vào cuối mục 1.6.
- Nên thêm bảng “Tóm tắt chức năng của chương trình mô phỏng” để cô thấy sản phẩm cụ thể.
- Nên sửa tiêu đề/sản phẩm theo hướng rõ hơn: “Hệ thống web mô phỏng quy trình quản lý khám chữa bệnh ngoại trú”.
