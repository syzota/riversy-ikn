# GitHub Pages untuk syzota

Target URL: https://syzota.github.io/RIVERSY-IKN/

1. Gunakan repository **public** bernama **RIVERSY-IKN** di https://github.com/syzota/RIVERSY-IKN.
2. Upload seluruh isi folder proyek RIVERSY ke root repository, **termasuk folder tersembunyi `.github/workflows`**. Jangan upload `node_modules`, `dist`, atau DEMNAS mentah.
3. Pastikan branch default bernama `main`.
4. Buka repository -> **Settings** -> **Pages** -> **Build and deployment** -> **Source: GitHub Actions**.
5. Buka tab **Actions**, tunggu workflow `Deploy IKN RIVERSY to GitHub Pages` selesai (hijau). Bila workflow belum jalan setelah mengubah Settings, jalankan secara manual lewat Actions -> workflow -> Run workflow.
6. Kunjungi https://syzota.github.io/RIVERSY-IKN/, cek basemap satelit, garis sungai, warna zonasi, poligon bangunan, input analisis DSS, tautan unduh CSV, dan tampilan HP.

**Penting:** konfigurasi Vite dan path aset sudah disesuaikan untuk repository `RIVERSY-IKN`, sedangkan mode development lokal tetap menggunakan `/`.

Data banjir di website adalah model screening DEM indikatif dan bukan peta genangan hasil simulasi hidraulika. Nilai agregat banjir Kota Samarinda tidak digunakan sebagai geometri banjir Sepaku–Semoi.
