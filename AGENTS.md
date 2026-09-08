# HƯỚNG DẪN & NGUYÊN TẮC THIẾT KẾ CHO AGENT (DESIGN SYSTEM & RULES)

Tài liệu này định nghĩa toàn bộ **ngôn ngữ thiết kế (Design Language)**, **luật chuyển động (Animation Rules)** và **nguyên tắc lập trình** của dự án **Ôn Tập Triết (ontaptriet)**. Mọi Agent khi đọc, bảo trì hoặc bổ sung tính năng vào codebase **bắt buộc phải tuân thủ nghiêm ngặt** các nguyên tắc dưới đây.

---

## 1. Triết Lý Thiết Kế: Trang Giấy Thi A4 & Tối Giản Tuyệt Đối (A4 Paper Aesthetic)

* **Bản chất trang giấy:** Tái hiện trung thực cảm giác của một tờ giấy thi A4 — chữ đen tuyền trên giấy trắng (`#000000` trên `#ffffff`), tối giản, không phân tâm.
* **Các thẻ div cha là "tàng hình" (Invisible Containers):**
  * Các khối bọc (`.canvas-wrapper`, `#menu-screen`, `#quiz-screen`, `.menu-row`,...) đóng vai trò là khung lưới định vị tọa độ và layout (Grid/Flex).
  * **TUYỆT ĐỐI KHÔNG gán background, không đổ bóng (`box-shadow`), không viền khung hộp thẻ card 3D, không thêm `padding` hoặc `margin` làm dày khối div cha.** Chúng đơn giản là tàng hình, để nội dung văn bản tự nổi bật và tự thở.
  * Toàn bộ dự án đã reset: `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }`.
* **Đồng bộ Typography duy nhất (`--uniform-size`):**
  * Toàn trang sử dụng **một cỡ chữ chuẩn duy nhất**: `--uniform-size: 18.5px` trên Desktop, giảm xuống `16px` trên Mobile (<= 768px).
  * `line-height: 1.25` đến `1.35`.
  * Phông chữ chuẩn: Họ Serif học thuật (`Times New Roman`, `Lora`, `Merriweather`, `EB Garamond`, `Crimson Pro`,...).
  * **Không dùng font-size quá khổ để phân cấp tiêu đề.** Sự phân cấp thông tin phải đạt được qua:
    * `font-weight: bold` (in đậm)
    * `font-style: italic` (in nghiêng)
    * `opacity` (0.35 - 0.75)
    * Gạch chân nét đứt (dashed underline)
* **Chế độ Tối (Dark Mode) & Live Wallpaper:**
  * Light Mode: Giấy thi A4 trắng tinh khiết, tắt Live Wallpaper để tập trung và tiết kiệm pin.
  * Dark Mode: Nền `#121212`, chữ sáng `#ededed`. Live Wallpaper chỉ bật ở Dark Mode với độ mờ tinh tế (`opacity: 0.18`).

---

## 2. Quy Chuẩn Hệ Thống Nút Bấm & Vi Tương Tác (Flat Text Button System)

Toàn bộ nút bấm trong giao diện là **nút chữ phẳng không nền (Text/Ghost Button)**, không có viền bao khối, không đổ bóng hộp, dựa trên lớp nền tảng `.btn-action`.

### A. Phân Loại Nút & Cấu Trúc HTML Chuẩn:

1. **Nút chính đặc cách (Primary Action - Bắt đầu, Làm lại, Đăng nhập để thảo luận, Gửi tin nhắn):**
   * Class: `class="btn-action btn-primary"`
   * Font: Chữ in đậm `font-weight: bold; font-style: normal;`
   * Cấu trúc HTML bắt buộc: Bọc chữ trong `<span class="btn-label">` và đặt mũi tên bên ngoài `<span class="btn-arrow">›</span>`.
     ```html
     <button class="btn-action btn-primary" id="...">
         <span class="btn-label">Bắt đầu</span> <span class="btn-arrow">›</span>
     </button>
     ```
   * Vi tương tác:
     * Nhãn chữ (`.btn-label`) có viền gạch chân nét đứt `1.5px dashed var(--text-pure-black)` ở trạng thái thường.
     * Khi hover: Đường nét đứt chuyển thành nét liền `solid`. Mũi tên phải `›` trượt sang phải `translateX(3px)`.

2. **Nút điều hướng có mũi tên (Regular Nav - Quay lại, Câu tiếp theo, Câu trước):**
   * Class: `class="btn-action btn-nav"` hoặc `.btn-quiz-back` / `.btn-quiz-next`
   * Font: Chữ thường `font-weight: normal; font-style: normal;`
   * Cấu trúc HTML bắt buộc: Bọc chữ trong `<span class="btn-label">` và tách mũi tên `<span class="btn-arrow">‹</span>` (hoặc `›`).
     ```html
     <button class="btn-action btn-nav" id="...">
         <span class="btn-arrow">‹</span> <span class="btn-label">Quay lại</span>
     </button>
     ```
   * Vi tương tác: Nhãn chữ có nét đứt ở trạng thái thường, chuyển thành nét liền khi hover. Mũi tên trượt theo hướng chỉ (`‹` trượt `-3px`, `›` trượt `3px`).

3. **Nút phụ in nghiêng (Secondary Ghost - Xem lịch sử, Cài đặt, Thay tên, Về menu chính, Xóa):**
   * Class: `class="btn-action btn-secondary"`
   * Font: Chữ in nghiêng `font-style: italic; font-weight: normal;`
   * Cấu trúc HTML tiêu chuẩn: **Ghi trực tiếp nội dung chữ vào `<button>`, TUYỆT ĐỐI KHÔNG lồng thẻ `<span class="btn-label">`!**
     ```html
     <button class="btn-action btn-secondary" id="...">
         Xem lịch sử
     </button>
     ```
   * Cấu trúc HTML khi có hiệu ứng cuộn chữ (Roll Transition - ví dụ: *Copy câu hỏi*, *Thay tên*):
     ```html
     <button class="btn-action btn-secondary btn-chat-set-name" id="...">
         <span class="label-viewport" id="...">
             <span class="label-text-current">Thay tên</span>
         </span>
     </button>
     ```
     *(Lưu ý: Nút cha phải có `border-bottom: none !important`, viền nét đứt được giao cho `.label-viewport` quản lý để co giãn mượt mà theo chữ và tránh double line).*
   * Vi tương tác:
     * Trạng thái thường: **HOÀN TOÀN KHÔNG CÓ NÉT ĐỨT** (`border-bottom: 1.5px dashed transparent`).
     * Khi hover: `opacity: 0.75` (hoặc `1` ở các nút nhỏ), nét đứt ẩn hiện lên bằng cách đổi `border-bottom-color: var(--text-pure-black)`. Không có mũi tên.

4. **Nút hành động nguy hiểm / hủy bỏ (Destructive Action - Xóa lịch sử, Đăng xuất):**
   * Class: `class="btn-action btn-danger"`
   * Font: Chữ in nghiêng `font-style: italic; font-weight: normal;`
   * Cấu trúc HTML bắt buộc: **Ghi trực tiếp nội dung chữ vào `<button>`, TUYỆT ĐỐI KHÔNG lồng thẻ `<span class="btn-label">`!**
     ```html
     <button class="btn-action btn-danger" id="...">
         Đăng xuất
     </button>
     ```
   * Vi tương tác:
     * Trạng thái thường: Chữ màu đen thường, không có gạch chân (`border-bottom: 1.5px dashed transparent`).
     * Khi hover: Đổi sang màu cảnh báo (Đỏ `#d93025` ở Light Mode, `#ff5252` ở Dark Mode) cả về màu chữ lẫn nét đứt bên dưới (`color: ...; border-bottom-color: ...; opacity: 0.75;`).

5. **Nút lựa chọn đang kích hoạt (Active Choice - Số câu, Toggle Random):**
   * Đổi sang màu xanh dương: `color: blue;` ở Light Mode, `#64b5f6` ở Dark Mode.
   * Đường gạch chân bên dưới chuyển thành nét liền (`solid`) cùng màu qua pseudo-element `::after` để tránh hiện tượng giật nảy layout (layout shift).

6. **Trạng thái bị vô hiệu hóa (Disabled State - `.btn-disabled`):**
   * Sử dụng khi nút đang trong thời gian chờ cooldown (ví dụ: đang đếm ngược gửi tin nhắn chat).
   * Style: `opacity: 0.45 !important; cursor: not-allowed !important; pointer-events: none;`.

### B. Luật Bất Biến Của Hệ Thống Nút Bấm (Anti-Patterns & Rules):

* **LUẬT CHỐNG DOUBLE LINE (CỰC KỲ QUAN TRỌNG):**
  * Thẻ `<span class="btn-label">` **CHỈ DÀNH RIÊNG** cho Nút chính (`.btn-primary`) và Nút điều hướng (`.btn-nav`, `.btn-quiz-*`).
  * **TUYỆT ĐỐI KHÔNG lồng `<span class="btn-label">` vào trong `.btn-secondary` hoặc `.btn-danger`!**
  * *Lý do:* Bản thân `.btn-secondary` và `.btn-danger` đã có thuộc tính `border-bottom: 1.5px dashed transparent` trên chính phần tử `<button>`. Nếu lồng thêm `.btn-label`, ở trạng thái bình thường nhãn sẽ bị lộ nét đứt sai thiết kế, và khi hover sẽ xuất hiện cùng lúc cả 2 đường kẻ chồng lên nhau (1 nét liền từ `.btn-label` + 1 nét đứt từ `.btn-secondary`/`.btn-danger`), gây ra lỗi **Double Line**.
* **Mũi tên điều hướng (`.btn-arrow`, `.dropdown-arrow`):**
  * **TUYỆT ĐỐI KHÔNG BAO GIỜ BỊ GẠCH CHÂN.** Luôn tách riêng thành `span.btn-arrow`.
  * Khi hover vào nút: mũi tên tự trượt nhẹ theo hướng chỉ (mũi tên phải `›` trượt `translateX(3px)`, mũi tên trái `‹` trượt `translateX(-3px)` với transition `0.15s ease`).
* **Ký tự phân cách hành động (`.action-separator`):**
  * Giữa các nút hành động nằm ngang cùng hàng (ví dụ: `Bắt đầu ›  /  Xem lịch sử  /  Cài đặt`, hoặc `Chat dưới tên ...  /  Thay tên  /  Đăng xuất`, hoặc `Gửi tin nhắn ›  /  Xóa`) luôn sử dụng:
    ```html
    <span class="action-separator">/</span>
    ```
  * Có `margin: 0 6px`, `opacity: 0.3`.


---

## 3. Hệ Thống Luật Animation Chuẩn Expo (Expo Motion System)

Mọi chuyển động trong dự án phải dùng đường cong Easing Exponential:
* `--ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1)`: Xuất hiện, bay vào, trồi lên, mở rộng (tốc độ vọt nhanh ban đầu, tiếp đất êm ái).
* `--ease-expo-in: cubic-bezier(0.7, 0, 0.84, 0)`: Biến mất, bay ra, trượt thoát, thu hồi (chậm ở đầu, lao vút đi về cuối).

### Các Mẫu Chuyển Động Chuẩn:
1. **Enter (Phần tử trồi lên màn hình):**
   * `from: translateY(28px), opacity: 0` -> `to: translateY(0), opacity: 1`
   * Thời lượng: `0.38s var(--ease-expo-out)`.
2. **Exit (Phần tử bay lên trên thoát khỏi màn hình):**
   * `from: translateY(0), opacity: 1` -> `to: translateY(-24px), opacity: 0`
   * Thời lượng: `0.28s var(--ease-expo-in)`.
3. **Dropdown Menu:**
   * Mở: Kéo từ trên xuống bằng `clip-path: inset(0 0 100% 0)` -> `inset(0 0 0 0)` trong `0.25s var(--ease-expo-out)`.
   * Đóng: Trượt sang phải `translateX(30px)` + fadeout trong `0.22s var(--ease-expo-in)`.
   * Các item con trượt từ phải sang với stagger delay tuần tự (`--item-delay`).
4. **Hiệu ứng Cuộn Chữ (Vertical Text Roll Transition - `animateLabelRoll`):**
   * Giai đoạn 1: Chữ cũ bay lên trên `translateY(-120%)` và mờ dần trong `160ms` (`--ease-expo-in`).
   * Đo đạc: Tính chiều rộng text mới bằng phần tử ruler ẩn.
   * Giai đoạn 2: Khung `label-viewport` co giãn độ rộng trong `300ms` (`--ease-expo-out`), chữ mới trồi từ dưới lên `translateY(120%) -> 0` trong `280ms` (`--ease-expo-out`).
   * Mũi tên cạnh bên tự trôi theo độ rộng co giãn một cách liền mạch.
5. **Animation Lock Khóa Chuột (`DropdownAnimationLock` / `animating-lock`):**
   * Trong lúc chạy animation chuyển cảnh hoặc chuyển chữ, bắt buộc gọi `DropdownAnimationLock.lock()` (gán class `animating-lock` lên `body` với `pointer-events: none !important; cursor: default !important;`) để ngăn chặn việc spam click gây vỡ trạng thái DOM. Sau khi hiệu ứng hoàn tất mới gọi `unlock()`.

---

## 4. Giao Diện Làm Bài & Phản Hồi Trắc Nghiệm (Quiz Feedback)

* **Hover đáp án chưa chọn:** Chỉ giảm nhẹ `opacity: 0.55`, không đổi màu, không gạch chân.
* **Khi chọn ĐÚNG (`answer-correct`):**
  * Màu chữ chuyển xanh lá (`#1e8e3e` ở Light, `#34c759` ở Dark).
  * Viền SVG chạy vòng quanh đáp án theo chiều kim đồng hồ (`stroke-dashoffset` từ 100 về 0 trong `0.85s var(--ease-expo-out)`).
* **Khi chọn SAI (`answer-wrong`):**
  * Màu chữ chuyển đỏ (`#d93025` ở Light, `#ff5252` ở Dark).
  * Rung 4 hướng cực nhẹ nhàng bằng keyframe rời rạc `steps(1)` trong `0.28s`.
  * Đồng thời đáp án đúng được hé lộ (`answer-correct-revealed`) với đường gạch chân màu xanh lá quét từ trái qua phải (`borderLineSweepRight` trong `0.42s var(--ease-expo-out)`).
* **Khóa chọn sau khi trả lời:** Thêm class `.quiz-answered` khóa cứng `pointer-events: none` trên toàn bộ danh sách câu trả lời.

---

## 5. Tối Ưu Hóa Giao Diện Mobile (`mobile.css`)

* Cỡ chữ chuẩn chuyển thành `16px`.
* Hàng menu (`.menu-row`) chuyển thành cột `flex-direction: column` canh lề trái.
* Dropdown mở đổ xuống ngay bên dưới (`top: calc(100% + 6px); left: 0`) thay vì mở sang bên phải.
* Status bar ở đáy chuyển index câu hỏi sang góc phải.
* Vô hiệu hóa tap-highlight mặc định màu xanh của mobile webkit (`-webkit-tap-highlight-color: transparent` trên các đáp án để ngăn gian lận khi giữ ngón tay).

---

## 6. Lời Nhắc Dành Cho Agent Kế Nhiệm

* **Không bao giờ tự ý đưa thư viện bên ngoài (Bootstrap, Tailwind, jQuery, v.v.)** vào dự án. Toàn bộ dự án chạy bằng HTML/CSS/JS thuần (vanilla).
* Mọi component mới phải tuân thủ triết lý: **phẳng, không viền khối, không nền hộp, chữ đen tuyền trên giấy A4, cỡ chữ đồng bộ 18.5px, vi tương tác qua nét đứt và mũi tên trượt.**

---

## 7. Quản Trị Hệ Thống Sảnh Chat & Chế Độ Bỏ Qua Cooldown (`cli.mjs`)

* **Công cụ Moderation CLI (`cli.mjs` - được bỏ trong `.gitignore`):**
  * Viết bằng Node.js thuần (ESM), không phụ thuộc package ngoài.
  * Hỗ trợ điều hướng mũi tên `↑ / ↓`, phím `d / Delete` để kiểm duyệt xóa tin nhắn vi phạm, phím `g` để bật/tắt Bỏ qua Cooldown, phím `r` để làm mới dữ liệu, phím `q` để thoát.
  * Tự động xác thực tài khoản Google `@eaut.edu.vn` lần đầu qua popup trình duyệt và lưu phiên làm việc vào `.admin_session.json` (tự động refresh token vĩnh viễn). Hỗ trợ cả file `serviceAccountKey.json` nếu có.
* **Đặc quyền Bỏ qua Cooldown (`25002894@eaut.edu.vn`):**
  * Tài khoản duy nhất được phép kích hoạt: `25002894@eaut.edu.vn`.
  * Trạng thái lưu trên Firestore document `users/JfewpDCx6YV7OSezz8YyKNwCPm63` với trường `{ bypassCooldown: true/false, godMode: true/false }` và được lắng nghe realtime `onSnapshot`.
  * Khi kích hoạt:
    * Bỏ qua hoàn toàn bộ đếm Cooldown 5 phút giữa các lần gửi tin.
    * Bỏ qua giới hạn 24 giờ đổi biệt danh, cho phép đổi tên liên tục không giới hạn.
    * **Hoàn toàn ẩn và không gắn nhãn/badge lên UI** để giữ trải nghiệm tự nhiên, kín đáo.
* **Cấu hình Quyền Firestore (Security Rules) khi xóa tin hoặc đổi trạng thái:**
  * Thêm hàm `isAdmin()` kiểm tra `request.auth.token.email == '25002894@eaut.edu.vn'` trong Firestore Rules trên Firebase Console để cho phép tài khoản admin xóa tin vi phạm của người khác và cập nhật trạng thái.
  * Hoặc đặt file `serviceAccountKey.json` vào thư mục dự án để chạy với quyền SuperAdmin (tự động vượt qua mọi Security Rules).
* **Hệ thống Trực tuyến Realtime (Realtime Online Presence):**
  * Tự động gửi heartbeat mỗi 25s lên collection `presence/{sessionId}`.
  * Lắng nghe realtime `onSnapshot` đếm các phiên có tín hiệu trong vòng 60 giây gần nhất.
  * Tự động xóa phiên khi đóng tab (`beforeunload`) và dọn dẹp các phiên cũ quá hạn (> 3 phút).
  * Quy tắc Firestore: `match /presence/{sessionId} { allow read, write: if true; }`.