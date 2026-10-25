IKN-RIVERSY — PEMBARUAN DSS INTERAKTIF
=====================================

Pemasangan ke aplikasi Windows yang sudah ada:
1. Tutup proses dev server (Ctrl+C) jika sedang berjalan.
2. Ekstrak ZIP ini ke C:\website\riversy\ dan izinkan penimpaan file yang bernama sama.
   Jangan hapus folder public/data atau file project lain yang sudah ada.
3. Dari C:\website\riversy, jalankan npm run dev.
4. Muat ulang browser (Ctrl+F5).

Fitur baru:
- Klik lokasi pada peta; kelas indeks indikatif dari raster DEM akan dibaca otomatis
  jika klik berada dalam cakupan raster flood_classes.png.
- Pilih fokus masalah, lalu periksa rekomendasi solusi NBS yang ditampilkan.
- Status permukiman dapat diisi dari observasi pengguna. Status otomatis
  'area terbangun' membutuhkan layer builtup.geojson berisi Polygon/MultiPolygon
  pada koordinat WGS84 (EPSG:4326, bujur/lintang).
- Buka kotak GIS Layers > Impor poligon terbangun untuk memuat GeoJSON sementara,
  atau simpan file permanen sebagai C:\website\riversy\public\data\builtup.geojson.
- Unduh ringkasan evaluasi lokasi dalam berkas .txt.

PENTING: Zonasi saat ini hanya penyaringan berbasis dua tile DEM utara,
belum simulasi genangan/HEC-RAS dan belum divalidasi lapangan. Area di luar
cakupan raster hanya dapat menggunakan simulasi skenario INPUT MANUAL, bukan
hasil zonasi otomatis. Jangan menyebut lokasi/bangunan 'pasti terdampak banjir'
tanpa data genangan tervalidasi, sejarah banjir, serta data permukiman.

PEMBARUAN: Layer builtup.geojson sekarang sudah disertakan sebagai data bawaan.
Sumber: 2.560 poligon bangunan OpenStreetMap dari ekspor Overpass Turbo
yang disediakan pengguna pada 25 Oktober 2026. Cakupan data dan tingkat
kelengkapannya mengikuti hasil pemetaan sukarela OpenStreetMap; ketiadaan
poligon tidak membuktikan tidak ada bangunan. Tidak ada klaim bahwa bangunan
tersebut benar-benar terkena genangan sampai model banjir tervalidasi tersedia.

PEMBARUAN ANALISIS OTOMATIS:
- Panel GIS Layers sekarang berada di sisi kanan, zoom Leaflet tetap di kiri.
- Komponen Irisan Bangunan x Zonasi Indikatif otomatis menghitung/filter
  berdasarkan properti screen_zone pada builtup_zoned.geojson.
- Klik kartu Tinggi/Sedang/Rendah/Belum terklasifikasi untuk filter peta.
- Hasil awal: Tinggi 889, Sedang 481, Rendah 89, belum terklasifikasi 1101.
- Dari kategori belum terklasifikasi, 491 poligon berada di luar batas DEM;
  610 lainnya dalam cakupan bbox tetapi tanpa kelas raster valid.
- CSV tersedia melalui tombol Unduh daftar hasil screening.
- Cakupan DEM: 116.5..117.0 BT, -1.0..-0.75 LS; titik Muara Sepaku
  berada di luar batas selatan dan memerlukan DEM tambahan.
- Baca METODE_IRISAN_DAN_CAKUPAN.md untuk transparansi sumber/metode.
