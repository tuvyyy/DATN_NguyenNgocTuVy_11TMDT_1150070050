# HUONG DAN SU DUNG HE THONG QUAN LY PHONG KHAM

## 1. Gioi thieu chung

He thong quan ly phong kham ho tro cac nghiep vu chinh trong quy trinh kham benh ngoai tru:

- Quan ly tai khoan, vai tro va phan quyen nguoi dung.
- Tiep don benh nhan, tao ho so kham, cap nhat thong tin hanh chinh va sinh hieu.
- Chi dinh phong kham, dich vu ky thuat va thuoc.
- Bac si thuc hien kham benh, ke don, chi dinh can lam sang, ket luan va in giay to.
- Nhan vien can lam sang tiep nhan chi dinh, tra ket qua va xuat phieu ket qua.
- Thu ngan lap va xac nhan thanh toan hoa don.
- Quan tri danh muc thuoc, dich vu, DVKT, nguoi dung, quyen, thong bao va yeu cau ho tro.
- Bao cao, thong ke phuc vu quan ly.

Tai lieu nay duoc viet cho nguoi dung cuoi va can bo van hanh he thong.

## 2. Chuan bi truoc khi su dung

### 2.1. Dieu kien can co

- May tinh co trinh duyet web hien dai nhu Chrome, Edge hoac Firefox.
- May chu backend va frontend da duoc khoi dong.
- Tai khoan dang nhap da duoc quan tri vien cap.
- Tai khoan phai duoc gan vai tro va quyen phu hop voi nghiep vu can thuc hien.

### 2.2. Dia chi truy cap

Neu chay tai may local:

- Backend Swagger: `https://localhost:7007/swagger`
- Frontend React: thuong chay tai `http://localhost:3000`

Neu cai dat tren may chu noi bo, su dung dia chi do bo phan ky thuat cung cap.

### 2.3. Khoi dong backend

Tu thu muc goc project, co the chay:

```powershell
dotnet run --project "Backend\ThucTapTotNghiep_1150070050_NguyenNgocTuVy\ThucTapTotNghiep_1150070050_NguyenNgocTuVy.csproj" --launch-profile https
```

Hoac di vao thu muc backend roi chay:

```powershell
cd Backend\ThucTapTotNghiep_1150070050_NguyenNgocTuVy
dotnet run --launch-profile https
```

Neu bao loi port `7007` hoac `5006` dang duoc su dung, nghia la backend dang chay san o mot cua so khac. Hay tat tien trinh cu hoac doi port.

### 2.4. Khoi dong frontend

Tu thu muc frontend:

```powershell
cd Frontend\layout-dacn
npm install
npm start
```

Sau khi frontend khoi dong, mo trinh duyet va truy cap dia chi duoc hien thi trong terminal.

## 3. Dang nhap va thao tac chung

### 3.1. Dang nhap

1. Truy cap trang dang nhap.
2. Nhap ten dang nhap va mat khau.
3. Bam nut dang nhap.
4. Neu thanh cong, he thong chuyen vao man hinh dashboard.

Neu tai khoan bi khoa, sai mat khau hoac chua duoc cap quyen, he thong se hien thong bao loi.

### 3.2. Dang xuat

1. Bam vao khu vuc tai khoan tren thanh dieu huong.
2. Chon dang xuat.
3. He thong xoa phien dang nhap va dua ve trang dang nhap.

### 3.3. Phien dang nhap het han

Neu phien lam viec het han, he thong hien hop thoai yeu cau dang nhap lai. Bam `Dang nhap lai`, sau do dang nhap de tiep tuc.

Du lieu chua luu tren man hinh co the can nhap lai sau khi dang nhap.

### 3.4. Quyen truy cap

Moi man hinh duoc bao ve theo vai tro hoac theo quyen chuc nang. Neu nguoi dung khong co quyen, he thong hien thong bao khong duoc phep truy cap.

Mot so nhom quyen thuong gap:

- `ADMIN`: quan tri he thong.
- `TIEP_DON`: tiep don, quan ly ho so tiep don.
- `KHAM_BENH`: bac si kham benh.
- `DVKT`: nhan vien thuc hien dich vu ky thuat/can lam sang.
- `THANH_TOAN`: thu ngan.
- `BAO_CAO`: xem bao cao.

## 4. Quy trinh nghiep vu tong quat

Quy trinh su dung he thong thuong dien ra theo thu tu sau:

1. Tiep don tao ho so benh nhan va luot kham.
2. Tiep don chi dinh phong kham hoac dich vu ban dau neu can.
3. Thu ngan thu tien cac dich vu/hoa don phat sinh.
4. Bac si tiep nhan benh nhan, thuc hien kham va nhap ket qua.
5. Bac si ke don thuoc hoac chi dinh DVKT/can lam sang.
6. Nhan vien can lam sang tiep nhan chi dinh, thuc hien va tra ket qua.
7. Bac si xem ket qua, ket luan, hen tai kham hoac hoan tat kham.
8. Thu ngan thanh toan cac khoan con lai neu co.
9. Quan ly/quan tri xem bao cao, nhat ky va dieu chinh danh muc khi can.

## 5. Huong dan cho bo phan tiep don

### 5.1. Tao ho so tiep don moi

1. Dang nhap bang tai khoan co quyen tiep don.
2. Vao menu `Tiep don`.
3. Chon man hinh `Nhap` hoac `Tao tiep don moi`.
4. Nhap thong tin benh nhan:
   - Ho ten.
   - Ngay sinh hoac nam sinh.
   - Gioi tinh.
   - So dien thoai.
   - CCCD neu co.
   - Dia chi tinh/thanh, quan/huyen, xa/phuong.
   - Thong tin bao hiem neu benh nhan co BHYT.
   - Nguoi lien he khan cap hoac nguoi giam ho neu can.
5. Nhap thong tin tiep don:
   - Loai kham.
   - Nguon tiep nhan.
   - Khu tiep don/quay tiep don.
   - Phong kham du kien.
   - Ly do kham.
6. Nhap sinh hieu neu co:
   - Mach.
   - Nhiet do.
   - Huyet ap.
   - Nhip tho.
   - Chieu cao, can nang.
7. Bam `Luu` de tao ho so.

Sau khi luu thanh cong, he thong tao ma benh nhan/ma ho so va cap nhat trang thai ho so.

### 5.2. Kiem tra trung thong tin benh nhan

Khi nhap CCCD, so dien thoai hoac thong tin dinh danh, he thong co the canh bao benh nhan da ton tai hoac co ho so trong ngay.

Khi gap canh bao:

- Kiem tra lai thong tin benh nhan.
- Neu la benh nhan cu, nap thong tin co san thay vi tao moi.
- Neu la benh nhan moi thuc su, tiep tuc tao ho so theo thong bao cua he thong.

### 5.3. Quan ly danh sach tiep don
Vao `Tiep don > Danh sach` de xem danh sach ho so. Cac tab thuong gap:

- `Tiep don trong ngay`: ho so phat sinh trong ngay.
- `Ho so ton`: ho so chua hoan tat.
- `Ho so da huy`: ho so bi huy.
- `Ho so hoan tat`: ho so da dong/da kham xong.

Co the su dung cac bo loc:

- Tu khoa: ten benh nhan, ma benh nhan, ma ho so, so dien thoai, CCCD.
- Ngay tiep don.
- Trang thai ho so.
- Loai kham.
- Nguon tiep nhan.
- Khu tiep don.

### 5.4. Thao tac tren ho so tiep don

Trong bang danh sach, nguoi dung co the:

- Mo chi tiet ho so.
- Nap ho so vao form de cap nhat.
- In phieu kham.
- Chon dich vu/chi dinh dich vu.
- Xem timeline trang thai ho so.
- Huy tiep don neu ho so con du dieu kien huy.
- Xem ly do huy doi voi ho so da huy.

### 5.5. Huy ho so tiep don

1. Mo danh sach tiep don.
2. Chon ho so can huy.
3. Bam thao tac `Huy tiep don`.
4. Chon ly do huy:
   - Benh nhan khong tiep tuc kham.
   - Nhap nham thong tin.
   - Tao trung ho so.
   - Sai dich vu/phong kham.
   - Benh nhan chuyen co so khac.
   - Ly do khac.
5. Nhap ghi chu neu can, bat buoc khi chon ly do khac.
6. Xac nhan huy.

Sau khi huy, ho so chuyen sang trang thai `Da huy` va duoc dua vao tab ho so huy.

## 6. Huong dan cho bac si

### 6.1. Mo man hinh kham benh

1. Dang nhap bang tai khoan bac si.
2. Vao menu `Bac si` hoac duong dan `/bac-si`.
3. Neu bac si duoc gan nhieu phong, chon phong kham can lam viec.
4. He thong hien danh sach benh nhan theo trang thai:
   - Cho kham.
   - Dang kham.
   - Da kham.

Neu tai khoan co quyen xem nhung chua duoc phan phong, he thong thong bao chua co pham vi du lieu.

### 6.2. Bat dau kham

1. Chon benh nhan trong danh sach cho kham.
2. He thong mo ho so kham va co the tu dong chuyen trang thai sang `Dang kham`.
3. Xem thong tin hanh chinh, sinh hieu, ly do kham va lich su kham.
4. Nhap thong tin kham:
   - Trieu chung.
   - Chan doan.
   - Dien bien.
   - Ket luan.
   - Huong xu tri.
   - Loi dan.

### 6.3. Ke don thuoc

1. Trong man hinh kham, bam `Ke don`.
2. Tim thuoc theo ma hoac ten thuoc.
3. Chon thuoc can ke.
4. Nhap thong tin su dung:
   - So ngay.
   - So lan/ngay.
   - So luong moi lan.
   - Duong dung.
   - Thoi diem dung.
   - Huong dan su dung.
5. Kiem tra canh bao an toan neu co:
   - Trung hoat chat.
   - Sai lieu.
   - Chong chi dinh.
   - Tuong tac thuoc.
   - Di ung thuoc.
6. Bam luu don thuoc.

Neu phong khong ke thuoc, co the nhap loi dan/ghi chu don trang theo quy dinh cua he thong.

### 6.4. Chi dinh DVKT/can lam sang

1. Trong man hinh kham, bam `Chi dinh DVKT`.
2. Tim dich vu theo ma, ten dich vu hoac nhom dich vu.
3. Chon mot hoac nhieu dich vu can chi dinh.
4. Kiem tra tong tien va danh sach da chon.
5. Bam luu chi dinh.
6. In phieu chi dinh neu can.

Chi dinh sau khi tao se chuyen sang bo phan can lam sang/DVKT de tiep nhan va thuc hien.

### 6.5. Xem ket qua can lam sang

1. Mo ho so benh nhan dang kham.
2. Xem danh sach DVKT da chi dinh.
3. Voi chi dinh da co ket qua, bam `Xem ket qua`.
4. Kiem tra chi so, ket luan, file dinh kem hoac phieu PDF.
5. Danh dau da doc neu he thong yeu cau.

### 6.6. Hoan tat kham va in giay to

Sau khi co du thong tin:

1. Nhap ket luan cuoi cung.
2. Nhap loi dan sau kham.
3. Lap giay hen tai kham neu can.
4. Lap giay ket luan, giay chuyen tuyen hoac giay vao vien neu nghiep vu yeu cau.
5. Ky/xac nhan ho so.
6. In cac giay to hop le.
7. Hoan tat kham.

## 7. Huong dan cho bo phan can lam sang/DVKT

### 7.1. Mo man hinh DVKT

1. Dang nhap bang tai khoan co quyen `DVKT`.
2. Vao menu `Can lam sang` hoac duong dan `/can-lam-sang`.
3. Man hinh gom cac tab:
   - Cho tiep nhan.
   - Dang thuc hien.
   - Da hoan thanh.

### 7.2. Tiep nhan chi dinh

1. O tab `Cho tiep nhan`, chon chi dinh can lam.
2. Bam thao tac tiep nhan/nhan thuc hien.
3. Chi dinh duoc chuyen sang tab `Dang thuc hien`.

### 7.3. Tra ket qua

1. O tab `Dang thuc hien`, chon chi dinh can tra ket qua.
2. Bam thao tac tra ket qua.
3. Nhap gia tri chi so/ket qua theo mau dich vu.
4. Nhap danh gia hoac ket luan can lam sang.
5. Nhap ghi chu neu co.
6. Dinh kem duong dan tai lieu ket qua neu can.
7. Bam luu ket qua.

Sau khi luu, chi dinh chuyen sang `Da hoan thanh`.

### 7.4. Xuat PDF ket qua

1. Mo chi tiet ket qua.
2. Bam xuat/in PDF.
3. Kiem tra noi dung phieu ket qua.
4. In hoac luu file theo yeu cau.

## 8. Huong dan cho thu ngan

### 8.1. Mo danh sach hoa don

1. Dang nhap bang tai khoan thu ngan.
2. Vao menu `Thu ngan`.
3. He thong hien danh sach hoa don/benh nhan can thanh toan.

### 8.2. Xem chi tiet hoa don

1. Chon hoa don can xu ly.
2. Vao man hinh `Chi tiet hoa don`.
3. Kiem tra:
   - Thong tin benh nhan.
   - Ma hoa don.
   - Khu/quay tiep don.
   - Danh sach dich vu/thuoc.
   - Tong tien.
   - Trang thai thanh toan.

### 8.3. Xac nhan thanh toan

1. Chon phuong thuc thanh toan:
   - Tien mat.
   - VNPay.
   - MoMo.
2. Bam `Xac nhan thu`.
3. Xac nhan hop thoai neu he thong yeu cau.
4. Sau khi thanh toan thanh cong, hoa don chuyen sang trang thai `Da thanh toan`.

### 8.4. In bien lai

1. Mo chi tiet hoa don.
2. Bam nut in bien lai.
3. Kiem tra noi dung bien lai.
4. Thuc hien in theo may in cua don vi.

## 9. Huong dan cho quan tri vien

### 9.1. Quan ly nguoi dung

Duong dan: `Admin > Users`

Quan tri vien co the:

- Tim kiem nguoi dung theo ho ten, tai khoan hoac email.
- Loc theo vai tro.
- Them nguoi dung moi.
- Sua thong tin nguoi dung.
- Gan vai tro cho nguoi dung.
- Dat lai mat khau.
- Khoa hoac mo khoa tai khoan.

Khi them/sua nguoi dung, can nhap:

- Ho va ten.
- Ten dang nhap.
- Email.
- So dien thoai.
- Chuc danh.
- Khoa/phong.
- Vai tro.

### 9.2. Quan ly vai tro va phan quyen

Duong dan: `Admin > Roles`

Man hinh phan quyen dung de:

- Gan vai tro cho tung nguoi dung.
- Cap quyen xem, them, sua, xoa, xuat theo tung chuc nang.
- Cap quyen theo vai tro.
- Thiet lap pham vi du lieu/phong ban cho nguoi dung.

Sau khi thay doi, bam luu o dung khu vuc dang thao tac. Neu khong luu, thay doi co the bi mat khi chuyen man hinh.

### 9.3. Quan ly danh muc thuoc

Duong dan: `Admin > Danh muc thuoc`

Chuc nang chinh:

- Loc theo nhom thuoc.
- Loc theo trang thai.
- Tim theo ma hoac ten thuoc.
- Them thuoc moi.
- Sua thong tin thuoc.
- Vo hieu hoa/kich hoat lai thuoc.
- Chon thuoc de xem bang gia.
- Them/sua/kich hoat/vo hieu hoa gia thuoc.
- Tuy chinh cot hien thi.

Thong tin thuoc gom:

- Nhom thuoc.
- Ma thuoc.
- Ten thuoc.
- Don vi tinh.
- Trang thai.
- Mo ta/ghi chu.

Thong tin gia thuoc gom:

- Don gia.
- Ngay ap dung.
- Ngay het han neu co.
- Doi tuong ap dung.
- Ghi chu.
- Trang thai.

### 9.4. Quan ly danh muc DVKT

Duong dan: `Admin > Danh muc DVKT`

Chuc nang chinh:

- Loc theo nhom DVKT.
- Tim kiem theo ma/ten.
- Them DVKT moi.
- Sua DVKT.
- Khoa/mo khoa DVKT.
- Chon DVKT de xem bang gia.
- Them/sua/kich hoat/vo hieu hoa gia DVKT.

### 9.5. Quan ly danh muc dich vu

Duong dan: `Admin > Danh muc dich vu`

Su dung de quan ly cac dich vu kham/chung cua phong kham. Thao tac co ban gom them, sua, tim kiem va cap nhat trang thai dich vu tuy theo quyen duoc cap.

### 9.6. Trung tam van hanh

Duong dan: `Admin > Logs` hoac `Trung tam van hanh`

Man hinh nay gom hai phan:

#### Yeu cau ho tro

- Xem danh sach yeu cau ho tro tu nguoi dung.
- Chon mot yeu cau de xem chi tiet.
- Xem nguoi gui, loai ho tro, muc do, thoi gian, man hinh phat sinh va mo ta.
- Bam `Tiep nhan` de chuyen sang dang xu ly.
- Nhap ghi chu phan hoi.
- Bam `Hoan tat` khi da xu ly xong.

#### Thong bao noi bo

- Soan thong bao moi.
- Chon muc do: thong tin, canh bao, khan cap.
- Chon doi tuong nhan: tat ca, theo vai tro hoac mot nguoi dung.
- Gui thong bao realtime.
- Sua thong bao da gui.
- Xoa thong bao khi khong con can hien thi.

## 10. Huong dan xem bao cao

1. Dang nhap bang tai khoan co quyen bao cao.
2. Vao menu `Bao cao`.
3. Chon khoang thoi gian hoac bo loc can xem.
4. Xem cac chi so/thong ke hien thi tren man hinh.
5. Xuat file neu he thong cung cap nut xuat.

Neu khong truy cap duoc trang bao cao, lien he quan tri vien de cap quyen `BAO_CAO`.

## 11. Trang thai ho so thuong gap

- `Moi tao`: ho so vua duoc tao.
- `Da tiep don`: ho so da duoc tiep nhan.
- `Cho dich vu`: dang cho chon/thuc hien dich vu.
- `Cho thanh toan`: co chi phi can thu.
- `Da thanh toan`: hoa don da duoc thu.
- `Cho kham`: benh nhan dang cho bac si kham.
- `Dang kham`: bac si dang xu ly ho so.
- `Cho can lam sang`: da co chi dinh can lam sang.
- `Cho ket qua`: dang cho bo phan DVKT tra ket qua.
- `Cho ket luan`: da co ket qua, cho bac si ket luan.
- `Da kham`: ho so da kham xong.
- `Da dong`: ho so da dong nghiep vu.
- `Da huy`: ho so bi huy.

## 12. Loi thuong gap va cach xu ly

### 12.1. Khong dang nhap duoc

Nguyen nhan co the:

- Sai ten dang nhap hoac mat khau.
- Tai khoan bi khoa.
- Backend chua chay.
- Ket noi database loi.

Cach xu ly:

- Kiem tra lai thong tin dang nhap.
- Lien he admin neu tai khoan bi khoa hoac quen mat khau.
- Kiem tra backend va database neu la moi truong local.

### 12.2. Khong vao duoc mot man hinh

Nguyen nhan thuong la tai khoan chua duoc cap quyen.

Cach xu ly:

- Dang xuat va dang nhap lai.
- Lien he admin kiem tra vai tro/quyen.
- Admin vao man hinh phan quyen de cap quyen xem cho chuc nang tuong ung.

### 12.3. Backend bao loi port dang duoc su dung

Thong bao thuong gap:

```text
Failed to bind to address https://127.0.0.1:7007: address already in use
```

Nguyen nhan: backend da chay san o mot cua so khac.

Cach xu ly:

- Tat cua so terminal dang chay backend cu.
- Hoac tim va tat process dang dung port `7007`/`5006`.
- Sau do chay lai backend.

### 12.4. Luu ho so khong thanh cong

Kiem tra:

- Cac truong bat buoc da nhap du chua.
- Ma/CCCD/so dien thoai co bi trung khong.
- Tai khoan co quyen them/sua khong.
- Ket noi backend/database co on dinh khong.

### 12.5. Khong in duoc phieu/PDF

Kiem tra:

- Trinh duyet co chan popup khong.
- Ho so/hoa don/ket qua da du du lieu de in chua.
- May in da ket noi chua.
- Backend co quyen ghi/doc file trong thu muc `wwwroot` khong.

## 13. Luu y khi van hanh

- Khong dung chung tai khoan giua nhieu nguoi.
- Luon dang xuat khi roi may.
- Kiem tra thong tin benh nhan truoc khi luu ho so.
- Khong huy ho so neu ho so da phat sinh nghiep vu khong cho phep huy.
- Khi cap quyen, chi cap dung pham vi nguoi dung can su dung.
- Truoc khi sua danh muc thuoc, dich vu, DVKT, can kiem tra tac dong den don gia va hoa don.
- Nen sao luu database truoc khi cap nhat phien ban he thong.

## 14. Phu luc: duong dan chuc nang chinh

| Chuc nang | Duong dan |
| --- | --- |
| Dang nhap | `/login` |
| Dang ky | `/register` |
| Dashboard nhan vien | `/dashboard` |
| Tai khoan ca nhan | `/dashboard/tai-khoan` |
| Bao cao | `/bao-cao` |
| Bac si kham benh | `/bac-si` |
| Can lam sang/DVKT | `/can-lam-sang` |
| Tiep don - nhap ho so | `/tiep-don/nhap` |
| Tiep don - danh sach | `/tiep-don/danh-sach` |
| Tiep don - ho so huy | `/tiep-don/huy` |
| Tiep don - chi dinh | `/tiep-don/chi-dinh` |
| Thu ngan | `/thu-ngan` |
| Chi tiet hoa don | `/thu-ngan/detail/:maHoaDon` |
| Admin dashboard | `/admin` |
| Quan ly nguoi dung | `/admin/users` |
| Phan quyen | `/admin/roles` |
| Trung tam van hanh | `/admin/logs` |
| Danh muc dich vu | `/admin/danh-muc-dv` |
| Danh muc thuoc | `/admin/danh-muc-thuoc` |
| Danh muc DVKT | `/admin/danh-muc-dvkt` |

