import {useState} from 'react';
import {AlertTriangle,CheckCircle2,Download,Info,Leaf,MapPin} from 'lucide-react';

const zoneNames={1:'Rendah',2:'Sedang',3:'Tinggi'};

function recommendations(issue,zone,settlement){
  if(issue==='sedimentasi')return [
    {title:'Rehabilitasi vegetasi riparian',why:'Vegetasi tepi sungai dapat membantu mengurangi erosi tebing dan menghambat masuknya sedimen dari lahan sekitar.'},
    {title:'Pengendalian erosi pada lahan terbuka',why:'Identifikasi sumber sedimen, perbaiki drainase lahan dan penutup tanah sebelum mempertimbangkan struktur pengendali.'},
    {title:'Monitoring TSS dan sedimentasi',why:'Lokasi dan besaran intervensi harus ditentukan menggunakan pemantauan TSS, debit, dan kondisi dasar sungai.'}
  ];
  if(zone===3)return [
    {title:settlement==='yes'?'Perlindungan kawasan terbangun':'Pengurangan paparan banjir',why:settlement==='yes'?'Prioritaskan pemeriksaan drainase lokal, jalur evakuasi dan inventarisasi bangunan; jangan menetapkan desain fisik tanpa kajian lapangan.':'Verifikasi keberadaan permukiman, akses jalan dan fasilitas penting pada area berindeks tinggi.'},
    {title:'Retensi air dan pengurangan limpasan',why:'Evaluasi lokasi tampungan dan daerah resapan di hulu yang memenuhi syarat topografi, tata guna lahan dan kapasitas hidraulik.'},
    {title:'Rehabilitasi koridor sungai',why:'Perkuat fungsi vegetasi riparian dengan memperhatikan sempadan, potensi erosi, dan konektivitas aliran.'}
  ];
  if(zone===2)return [
    {title:'Bioretensi dan drainase hijau',why:'Alternatif untuk mengurangi limpasan lokal pada lahan yang memiliki ruang serta kondisi infiltrasi yang sesuai.'},
    {title:'Pemulihan vegetasi riparian',why:'Prioritaskan penutupan lahan kritis dan pengurangan erosi di sepanjang koridor sungai.'},
    {title:'Survei lokasi dan pemantauan',why:'Periksa riwayat kejadian dan tanda genangan sebelum menetapkan batas prioritas akhir.'}
  ];
  return [
    {title:'Perlindungan tutupan lahan',why:'Pertahankan vegetasi serta fungsi resapan; zonasi rendah bukan berarti bebas banjir.'},
    {title:'Monitoring berkala',why:'Periksa perubahan penggunaan lahan dan kondisi sungai serta riwayat banjir.'}
  ];
}

function zoneDescription(zone){
  if(zone===3)return 'Nilai indeks relatif tinggi pada model penyaringan awal. Ini bukan prediksi kedalaman atau kepastian genangan.';
  if(zone===2)return 'Kondisi topografi dan kedekatan sungai menunjukkan perhatian menengah pada indeks indikatif.';
  return 'Indeks relatif rendah pada parameter yang digunakan. Tetap diperlukan verifikasi banjir historis dan lapangan.';
}

export default function DecisionSupport({selection,builtupDataAvailable}){
  const [issue,setIssue]=useState('banjir');
  const [settlement,setSettlement]=useState('unknown');
  const [scenarioZone,setScenarioZone]=useState('');
  const buildingZone=selection?.buildingZone??null;
  const fromBuildingScreen=selection?.zone==null&&buildingZone!=null;
  const measuredZone=selection?.zone??buildingZone;
  const zone=measuredZone??(scenarioZone?Number(scenarioZone):null);
  const isScenario=measuredZone==null;
  const fromSpatial=selection?.builtup==='yes';
  const settled=fromSpatial?'yes':settlement;
  const canRecommend=zone!=null;
  const items=canRecommend?recommendations(issue,zone,settled):[];

  const exportNote=()=>{
    const lines=[
      'IKN-RIVERSY | RINGKASAN EVALUASI AWAL',
      `Lokasi: ${selection?.lat?.toFixed(6)??'-'}, ${selection?.lng?.toFixed(6)??'-'}`,
      `Kelas: ${zoneNames[zone]??'Belum tersedia'} (${isScenario?'SIMULASI INPUT':fromBuildingScreen?'IRISAN POLIGON–RASTER INDIKATIF':'INDEKS GIS INDIKATIF'})`,
      `Isu: ${issue}`,
      `Kawasan terbangun: ${fromSpatial?'Beririsan data built-up':settled==='yes'?'Menurut input pengguna':settled==='no'?'Tidak terlihat menurut input pengguna':'Belum diverifikasi'}`,
      '',...items.map((item,i)=>`${i+1}. ${item.title}: ${item.why}`),
      '', 'CATATAN: Hasil penyaringan awal, bukan desain rekayasa atau simulasi banjir tervalidasi. Data historis, debit, hujan, pasang-surut, permukiman dan lapangan masih perlu diverifikasi.'
    ];
    const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='IKN-Riversy-Evaluasi-Lokasi.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return <section className="dss-panel" aria-label="Evaluasi DSS interaktif">
    <div className="dss-title"><div><span className="dss-kicker">INTERACTIVE DECISION SUPPORT</span><h3>Evaluasi Lokasi & Alternatif Penanganan</h3><p>Klik lokasi pada peta, pilih kondisi yang ingin dianalisis, lalu lihat hasilnya.</p></div><span className="dss-beta">MODEL INDIKATIF</span></div>
    <div className="dss-body">
      <div className="dss-inputs">
        <h4><MapPin size={16}/> Input Analisis</h4>
        <div className="dss-location">{selection?<><strong>{selection.lat.toFixed(5)}, {selection.lng.toFixed(5)}</strong><small>{measuredZone?(fromBuildingScreen?'Kelas dari irisan bangunan dengan raster model':'Lokasi memiliki nilai indeks dari raster model'):'Lokasi tidak memiliki kelas pada raster yang tersedia'}</small>{selection.buildingId&&<small>Bangunan OSM: {selection.buildingId} · {buildingZone!=null?`kelas poligon ${zoneNames[buildingZone]} (indikatif)`:'poligon belum terklasifikasi'}</small>}</>:<><strong>Belum memilih lokasi</strong><small>Klik area di peta untuk mengisi koordinat otomatis</small></>}</div>
        <label>Fokus masalah<select value={issue} onChange={e=>setIssue(e.target.value)}><option value="banjir">Banjir & limpasan</option><option value="sedimentasi">Erosi & sedimentasi</option></select></label>
        <label>Indikasi kawasan terbangun<select value={fromSpatial?'yes':settlement} disabled={fromSpatial} onChange={e=>setSettlement(e.target.value)}><option value="unknown">Belum diketahui</option><option value="yes">Ada / terlihat permukiman</option><option value="no">Tidak terlihat permukiman</option></select></label>
        <small className="dss-field-note">{fromSpatial?'Area terbangun teridentifikasi dari GeoJSON built-up.':builtupDataAvailable?'Di luar poligon built-up yang tersedia: status tetap memerlukan verifikasi.':'Belum ada layer built-up. Input permukiman adalah observasi pengguna, bukan deteksi otomatis.'}</small>
        {isScenario&&<label>Uji skenario manual (bukan kelas GIS)<select value={scenarioZone} onChange={e=>setScenarioZone(e.target.value)}><option value="">Pilih kelas untuk simulasi</option><option value="1">Rendah</option><option value="2">Sedang</option><option value="3">Tinggi</option></select></label>}
      </div>
      <div className="dss-results">
        <h4><Leaf size={16}/> Hasil Evaluasi</h4>
        {!canRecommend?<div className="dss-empty"><Info size={23}/><strong>Belum ada hasil zona</strong><p>Klik area berwarna pada peta. Untuk area yang belum tercakup DEM, pilih skenario manual sebagai demonstrasi tanpa mengklaim hasil geospasial.</p></div>:<>
          <div className={`dss-zone dss-zone-${zone}`}><div><span>KELAS {isScenario?'SKENARIO':fromBuildingScreen?'IRISAN POLIGON':'INDEKS KERAWANAN'}</span><strong>{zoneNames[zone]}</strong></div><small>{isScenario?'Pilihan pengguna — bukan hasil pemodelan':'GIS screening — belum divalidasi'}</small></div>
          <p className="dss-zone-desc">{zoneDescription(zone)}</p>
          <h5>Alternatif tindakan yang relevan</h5>
          <ol>{items.map(item=><li key={item.title}><strong>{item.title}</strong><p>{item.why}</p></li>)}</ol>
          {settled==='yes'&&<div className="dss-exposure"><AlertTriangle size={16}/><span>Indikasi permukiman: perlu verifikasi batas bangunan, penduduk, dan kejadian banjir sebelum menyimpulkan dampak.</span></div>}
          <button className="dss-export" onClick={exportNote}><Download size={15}/> Unduh ringkasan evaluasi</button>
        </>}
      </div>
    </div>
    <p className="dss-disclaimer"><CheckCircle2 size={15}/> Sistem ini membantu penyaringan alternatif, bukan menetapkan kebijakan, memprediksi genangan, atau menggantikan survei dan pemodelan hidraulik.</p>
  </section>;
}
