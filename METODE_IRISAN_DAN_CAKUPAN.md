# IKN-RIVERSY — Metode irisan bangunan dan zonasi awal

**Status:** prototipe penelitian; bukan pemetaan genangan banjir tervalidasi.

## Sumber data yang dipakai

1. Dua tile DEMNAS utara (`DEMNAS_1815-31` dan `DEMNAS_1815-32`), jaringan sungai HydroRIVERS dan batas DAS HydroBASINS, sebagaimana dipakai pembangkit raster `build_preview.py`.
2. Sebanyak **2.560 poligon bangunan** dari OpenStreetMap melalui berkas GeoJSON hasil Overpass Turbo yang disediakan pengguna pada 25 Oktober 2026.
3. Titik kajian *indikatif*: Muara Sepaku (116,748668° BT; -1,009596° LS) dan Outlet Semoi–Tengin (116,782034° BT; -0,979137° LS).

## Cara kerja otomatis

1. Raster awal memakai empat proksi: elevasi relatif terhadap sungai 30%, jarak ke sungai 25%, lereng 25%, dan elevasi absolut 20%. Bobot serta ambang batas merupakan **asumsi penyaringan awal**, bukan hasil kalibrasi ilmiah/hidraulika.
2. `analyze_building_zones.py` menumpang-susunkan masing-masing poligon bangunan pada raster kelas `1 = rendah`, `2 = sedang`, dan `3 = tinggi`.
3. Jika poligon melintasi lebih dari satu kelas, dipakai **kelas maksimum yang beririsan** sebagai indikator konservatif. Bangunan yang lebih kecil dari satu piksel memiliki ketidakpastian posisi/skala yang penting.
4. Poligon yang tidak memiliki piksel kelas valid diberi label **belum terklasifikasi**, BUKAN risiko rendah ataupun aman.
5. Hasil disimpan sebagai `public/data/builtup_zoned.geojson`, `builtup_screening_stats.json`, dan `builtup_screening.csv`, lalu ditampilkan otomatis pada peta dan kartu filter.

## Hasil penyaringan awal

| Kategori indeks indikatif | Jumlah poligon bangunan |
|---|---:|
| Tinggi | 889 |
| Sedang | 481 |
| Rendah | 89 |
| Belum terklasifikasi | 1.101 |
| **Total** | **2.560** |

**Audit cakupan:** 491 bangunan berada di luar persegi cakupan dua tile DEM; 610 lain berada di dalam persegi tetapi tidak memiliki piksel zonasi yang valid. Persegi model: 116,5–117,0 BT dan -1,0 sampai -0,75 LS. Titik kandidat Muara Sepaku berada di selatan batas raster (`-1,009596 < -1,0`) sehingga **belum dapat dinilai otomatis**. Belum ada dasar untuk mengisi area kosong dengan interpolasi yang diklaim sebagai hasil bahaya banjir.

## Keterbatasan wajib disebutkan dalam poster

- Nilai di atas **bukan jumlah rumah terendam**, bukan estimasi penduduk terdampak, bukan simulasi kedalaman genangan, dan bukan prediksi periode ulang banjir.
- Kelengkapan OSM mengikuti hasil pemetaan sukarela. Poligon yang tidak terdata tidak berarti bangunannya tidak ada.
- Satuan raster awal berada pada skala puluhan meter; perhitungan bangunan individual bersifat **screening indikatif** yang memerlukan verifikasi lapangan serta model hidrologi/hidraulika untuk klaim paparan sebenarnya.
- Untuk memperluas cakupan, diperlukan tile DEMNAS yang menutupi wilayah selatan -1,0 LS (termasuk Muara Sepaku), mosaik dan pembuatan ulang raster zonasi. Jangan mengisi area kosong dengan kelas rendah.

## Status data resmi lainnya

- API Satu Data **Kota Samarinda** `Luas Kawasan Rawan Bencana Per Jenis Bencana` yang disampaikan pengguna memuat nilai agregat tingkat kota (16.601 ha pada 2020–2021 dan 18.151 ha pada 2022–2025 untuk banjir). Dataset itu **tidak menyediakan bentuk poligon spasial** dan tidak mewakili Kabupaten Penajam Paser Utara, lokasi pilot Sepaku–Semoi. Karena itu data Samarinda tidak dipakai untuk pewarnaan peta atau penentuan kelas bangunan.
- Untuk acuan bahaya spasial yang lebih sesuai, BNPB memiliki layanan InaRISK **Indeks Bahaya Banjir**: https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_BANJIR/ImageServer serta portal unduh: https://inarisk.bnpb.go.id/portal/Unduh . Sebelum menggunakannya sebagai layer atau pembanding, periksa metadata, proyeksi, klasifikasi, waktu data, cakupan, dan syarat penggunaannya.

**Kalimat aman untuk poster:** “IKN-RIVERSY mengidentifikasi 889 poligon bangunan yang beririsan dengan kelas indeks kerawanan *indikatif tinggi* pada cakupan model DEM tersedia. Hasil merupakan penyaringan awal dan belum merepresentasikan banjir teramati atau genangan tervalidasi.”
