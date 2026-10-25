# IKN Riversy — GIS-Based Decision Support System

Prototipe frontend untuk tema **Identifikasi Isu Strategis dan Strategi Penanganan Banjir serta Sedimentasi di Kawasan Muara Sungai IKN**. Fokus kajian saat ini: **Sungai Sepaku dan Semoi**.

## Menjalankan di VS Code (Windows)

1. Pasang Node.js versi LTS (disarankan Node.js 22.12+ atau 24+).
2. Ekstrak ZIP proyek. Salin **isi folder** `ikn-riversy-local` ke `C:\website\riversy` (bukan folder data QGIS). Jika di lokasi tersebut sudah ada kode, cadangkan lebih dulu dan periksa konflik sebelum menimpa.
3. Buka `C:\website\riversy` melalui **File → Open Folder** di VS Code.
4. Buka terminal VS Code (`Ctrl` + `` ` ``).
5. Jalankan:

   ```bash
   npm install
   npm run dev
   ```

6. Buka URL lokal yang ditampilkan Vite (umumnya `http://localhost:5173`).

Perintah `npm run build` menghasilkan paket frontend produksi dalam folder `dist/`.

## Struktur proyek

```text
src/
  components/StudyMap.jsx    Peta Leaflet & kontrol layer
  hooks/useGeoLayers.js      Loader GeoJSON
  data/project.js            Konten dan metadata awal
  App.jsx                    Halaman & navigasi dashboard
  styles.css                 Tampilan responsif
public/data/                 Ekspor GeoJSON dari QGIS (belum diisi)
```

## Integrasi layer QGIS

Ekspor **vector** dari QGIS sebagai GeoJSON dengan koordinat **EPSG:4326 (WGS 84)**, lalu taruh di:

- `public/data/basins.geojson` — batas DAS/sub-DAS yang telah diverifikasi.
- `public/data/rivers.geojson` — jaringan sungai hasil clip.
- `public/data/mangrove.geojson` — sebaran mangrove hasil clip.
- `public/data/locations.geojson` — titik kandidat Muara Sepaku dan Outlet Semoi–Tengin (Point, EPSG:4326). Ditampilkan sebagai marker merah, popup, serta tombol fokus peta. Nama dibaca dari atribut `nama`, `name`, `Name`, atau `label`.

### Pembaruan data Oktober 2026

- `basins.geojson` dan `rivers.geojson` sudah disertakan dari unggahan proyek.
- `locations.geojson` sudah dikonversi dari EPSG:32750 (UTM zona 50S) ke EPSG:4326. Sumber aslinya tidak diubah.
- `flood_susceptibility_preview.png` adalah **preview penelitian, BUKAN peta genangan hasil HEC-RAS**. Cakupan hanya 116.5–117.0 BT dan -1.0 sampai -0.75 LS berdasarkan DEMNAS 1815-31/32. Zona muara selatan yang tidak tercakup **tidak boleh dianggap aman**.
- Indeks uji memakai bobot/asumsi awal: elevasi relatif terhadap sungai terdekat (30%), jarak dari sungai (25%), slope DEM turunan (25%), elevasi absolut (20%). Indeks tersebut belum dikalibrasi atau divalidasi oleh ahli; kelas tinggi/sedang/rendah merupakan **screening awal**, bukan probabilitas atau kedalaman banjir. Model perlu perbaikan dengan data hujan, debit, pasang surut, kawasan terbangun, riwayat kejadian, dan akurasi DEM.
- Peta mendukung pergantian basemap OpenStreetMap / Esri World Imagery (satelit). Pastikan penggunaan tiles memenuhi persyaratan lisensi/atribusi penyedia jika akan dipublikasikan.
- Untuk mengembangkan zonasi selatan, potong DEMNAS bagian sekitar muara dari tile sebelah selatan; jangan menganggap bagian transparan sebagai kategori rendah.

Setelah file ditempatkan, refresh browser. Checkbox layer akan aktif dan status berubah menjadi Ready. Jangan memasukkan seluruh data Asia ke browser: potong lebih dahulu di QGIS ke area studi dan sederhanakan geometri jika perlu.

**DEMNAS dan ESA WorldCover adalah raster**. Jangan hanya mengganti nama ekstensi menjadi `.geojson`. Keduanya memerlukan strategi tile/raster atau konversi terpilih yang akan disiapkan pada tahap berikutnya.

## Batasan prototipe

- Peta dasar menggunakan OpenStreetMap dan memerlukan koneksi internet.
- Titik pusat awal peta hanyalah titik navigasi perkiraan, bukan koordinat observasi atau batas DAS hasil kajian.
- Belum ada backend, akun pengguna, basis data spasial, model banjir, penghitungan sedimentasi, maupun skor prioritas NBS.
- DEMNAS mosaic dan raster slope (`Slope_IKN.tif`) telah selesai diproses dalam QGIS menurut log yang dikirim pengguna. **Raster belum diintegrasikan** sebagai layer web.
- Seluruh usulan mitigasi masih **alternatif konseptual**, harus melalui analisis spasial, metode penilaian yang transparan, dan verifikasi teknis/lapangan.
- Tidak boleh dipakai sebagai sistem peringatan dini atau untuk keputusan operasional pemerintah.

## Tahap pengembangan berikutnya

1. QGIS: audit CRS, batas studi, mosaic DEM, clip layer, quality check.
2. Integrasi GeoJSON dan raster hasil preprocessing.
3. Desain indikator dan bobot multi-kriteria yang disepakati tim/ahli.
4. Tambahkan FastAPI + PostGIS jika kebutuhan API/data dinamis sudah jelas.

Lisensi data dan kewajiban atribusi mengikuti masing-masing penyedia dataset.
