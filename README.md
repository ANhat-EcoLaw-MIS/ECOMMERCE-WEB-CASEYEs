# DoAnWEB

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.2.

## Chạy thủ công trên Windows

Mở PowerShell hoặc terminal tại thư mục project `D:\Code\Project_Web`, sau đó chạy:

```powershell
npm.cmd ci
npm.cmd start
```

`npm.cmd ci` chỉ cần chạy lần đầu hoặc sau khi lockfile thay đổi. Khi server báo đã sẵn sàng, mở:

- Trang chủ: `http://localhost:4200/`
- Giỏ hàng: `http://localhost:4200/cart`

Giữ cửa sổ terminal mở trong lúc sử dụng; nhấn `Ctrl+C` để dừng server. Nếu `npm` báo lỗi PowerShell Execution Policy, dùng `npm.cmd` như các lệnh ở trên.

### Xem giao diện mobile

- **Mô phỏng trên máy tính:** mở trang giỏ hàng trong Chrome hoặc Edge, nhấn `F12`, bật Device Toolbar bằng `Ctrl+Shift+M`, chọn thiết bị/chiều rộng màn hình và tải lại trang nếu cần.
- **Mở trên điện thoại thật:** để điện thoại và máy tính cùng mạng Wi-Fi, chạy `npm.cmd run start:network`. Tìm địa chỉ IPv4 của máy tính bằng `ipconfig`, rồi mở `http://<IPv4-may-tinh>:4200/cart` trên điện thoại. Không dùng `localhost` trên điện thoại vì địa chỉ đó trỏ về chính điện thoại. Nếu không kết nối được, cho phép Node.js/port 4200 qua Windows Firewall trên mạng riêng.

Ở màn hình hẹp, nội dung giỏ hàng và phần tóm tắt xếp thành một cột; phần điều hướng dùng menu mobile.

### Build và test

```powershell
npm.cmd run build
npm.cmd test -- --watch=false
```

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
