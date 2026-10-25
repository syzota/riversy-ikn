import {useState,useEffect,useRef,useCallback,useMemo} from 'react';
import L from 'leaflet';
import {MapContainer,TileLayer,GeoJSON,ImageOverlay,ScaleControl,useMap,useMapEvents,CircleMarker,Tooltip,Rectangle} from 'react-leaflet';
import {Layers3,MapPin,Building2,AlertTriangle} from 'lucide-react';
import {useGeoLayers} from '../hooks/useGeoLayers.js';
import DecisionSupport from './DecisionSupport.jsx';

const labels={basins:'Batas DAS',rivers:'Jaringan sungai',mangrove:'Mangrove',builtup:'Area terbangun',locations:'Titik lokasi'};
const styles={basins:{color:'#218266',weight:2,fillOpacity:.1},rivers:{color:'#4cabc4',weight:3},mangrove:{color:'#2b9555',fillOpacity:.5,weight:1}};
const buildingColors={1:'#258a61',2:'#d39b28',3:'#dd594a',unknown:'#8b5da0'};
const buildingStyle=feature=>{
  const key=String(feature.properties?.screen_zone??'unknown');
  const color=buildingColors[key]||buildingColors.unknown;
  return {color,fillColor:color,weight:key==='3'?1.5:1,fillOpacity:key==='3'?.56:.32};
};
const RASTER={west:116.5,east:117,south:-1,north:-.75};
const RASTER_BOUNDS=[[RASTER.south,RASTER.west],[RASTER.north,RASTER.east]];
const PUBLIC_DATA=`${import.meta.env.BASE_URL}data/`;

function getFeatures(data){
  return data?.type==='FeatureCollection'?data.features:data?.type==='Feature'?[data]:[];
}

function ringContains(coords,lng,lat){
  let inside=false;
  for(let i=0,j=coords.length-1;i<coords.length;j=i++){
    const [xi,yi]=coords[i], [xj,yj]=coords[j];
    if(((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function polygonContains(rings,lng,lat){
  return Boolean(rings?.length&&ringContains(rings[0],lng,lat)&&!rings.slice(1).some(r=>ringContains(r,lng,lat)));
}
function geometryContains(geometry,lng,lat){
  if(!geometry)return false;
  if(geometry.type==='Polygon')return polygonContains(geometry.coordinates,lng,lat);
  if(geometry.type==='MultiPolygon')return geometry.coordinates.some(rings=>polygonContains(rings,lng,lat));
  if(geometry.type==='GeometryCollection')return geometry.geometries.some(g=>geometryContains(g,lng,lat));
  return false;
}
function identifyBuilding(data,lng,lat){
  return getFeatures(data).find(f=>geometryContains(f.geometry,lng,lat))||null;
}
function MapClickCapture({onSelect}){
  useMapEvents({click:e=>onSelect(e.latlng)});
  return null;
}

function getPoints(data){
  if(!data)return [];
  const features=data.type==='FeatureCollection'?data.features:data.type==='Feature'?[data]:[];
  return features.filter(f=>f.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates))
    .map((f,index)=>({name:String(f.properties?.nama||f.properties?.name||f.properties?.Name||f.properties?.label||`Lokasi ${index+1}`),coords:[f.geometry.coordinates[1],f.geometry.coordinates[0]]}))
    .filter(p=>p.coords.every(Number.isFinite));
}

function MapFocus({target}){
  const map=useMap();
  useEffect(()=>{if(target)map.flyTo(target.coords,13,{duration:.9});},[map,target]);
  return null;
}

export default function StudyMap(){
  const layers=useGeoLayers();
  const [visible,setVisible]=useState({basins:true,rivers:true,mangrove:true,builtup:true,locations:true,preview:true,extent:false});
  const [basemap,setBasemap]=useState('street');
  const [focus,setFocus]=useState(null);
  const [selection,setSelection]=useState(null);
  const [buildingFilter,setBuildingFilter]=useState('all');
  const [importedBuiltup,setImportedBuiltup]=useState(null);
  const [importMessage,setImportMessage]=useState('');
  const builtupLayer=importedBuiltup||layers.builtup_zoned||layers.builtup;
  const buildingFeatures=useMemo(()=>getFeatures(builtupLayer),[builtupLayer]);
  const buildingSummary=useMemo(()=>{
    const counts={all:buildingFeatures.length,1:0,2:0,3:0,unknown:0,outside:0};
    for(const feature of buildingFeatures){
      const key=String(feature.properties?.screen_zone??'unknown');
      counts[key in counts?key:'unknown']++;
      if(feature.properties?.screen_method==='outside_dem_extent')counts.outside++;
    }
    return counts;
  },[buildingFeatures]);
  const displayedBuildings=useMemo(()=>buildingFilter==='all'?builtupLayer:{type:'FeatureCollection',features:buildingFeatures.filter(f=>String(f.properties?.screen_zone??'unknown')===buildingFilter)},[buildingFilter,builtupLayer,buildingFeatures]);
  const pixels=useRef(null);
  useEffect(()=>{
    let live=true;
    const img=new Image();
    img.onload=()=>{
      if(!live)return;
      const canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0);
      pixels.current={ctx,width:canvas.width,height:canvas.height};
    };
    img.onerror=()=>{if(live)pixels.current=null;};
    img.src=`${PUBLIC_DATA}flood_classes.png`;
    return()=>{live=false;};
  },[]);
  const evaluate=useCallback(({lat,lng})=>{
    let zone=null;
    const raster=pixels.current;
    if(raster&&lng>=RASTER.west&&lng<RASTER.east&&lat>=RASTER.south&&lat<RASTER.north){
      const x=Math.min(raster.width-1,Math.floor((lng-RASTER.west)/(RASTER.east-RASTER.west)*raster.width));
      const y=Math.min(raster.height-1,Math.floor((RASTER.north-lat)/(RASTER.north-RASTER.south)*raster.height));
      const value=raster.ctx.getImageData(x,y,1,1).data[0];
      if(value>=1&&value<=3)zone=value;
    }
    const building=identifyBuilding(builtupLayer,lng,lat);
    setSelection({lat,lng,zone,builtup:building?'yes':'unknown',buildingId:building?.properties?.['@id']??null,buildingZone:building?.properties?.screen_zone??null});
  },[builtupLayer]);
  const importBuiltup=async event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      if(file.size>25*1024*1024)throw Error('GeoJSON lebih dari 25 MB; sederhanakan terlebih dahulu di QGIS.');
      const data=JSON.parse(await file.text());
      const features=data.type==='FeatureCollection'?data.features:data.type==='Feature'?[data]:null;
      if(!Array.isArray(features)||!features.length||!features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)))throw Error('File harus GeoJSON berisi poligon area terbangun, bukan titik atau raster.');
      setImportedBuiltup(data);
      setVisible(v=>({...v,builtup:true}));
      setBuildingFilter('all');
      setImportMessage(`${features.length} poligon terbangun dimuat. Klik peta untuk mengecek indikasi beririsan.`);
      setSelection(null);
    }catch(error){setImportMessage(`Gagal memuat: ${error.message}`);}
    event.target.value='';
  };
  const points=getPoints(layers.locations);
  return <><div className="map-shell">
    <MapContainer center={[-1.04,116.85]} zoom={10} scrollWheelZoom={false} className="map-container">
      {basemap==='street'?<TileLayer key="street" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>:
        <TileLayer key="satellite" attribution='Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"/>}
      {visible.preview&&<ImageOverlay url={`${PUBLIC_DATA}flood_susceptibility_preview.png`} bounds={RASTER_BOUNDS} opacity={.65}/>}
      {visible.extent&&<Rectangle bounds={RASTER_BOUNDS} pathOptions={{color:'#18385b',weight:2,dashArray:'8 6',fillOpacity:0}}><Tooltip>Acuan batas dua tile DEM; tidak seluruh piksel di dalamnya memiliki klasifikasi</Tooltip></Rectangle>}
      {['basins','rivers','mangrove','builtup'].map(key=>{
        const data=key==='builtup'?displayedBuildings:layers[key];
        return data&&visible[key]&&<GeoJSON key={`${key}-${key==='builtup'?`${importedBuiltup?'imported':'default'}-${buildingFilter}`:'default'}`} data={data} style={key==='builtup'?buildingStyle:styles[key]}/>;
      })}
      {layers.locations&&visible.locations&&<GeoJSON key="locations" data={layers.locations}
        pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,{radius:8,color:'#fff',weight:2.5,fillColor:'#e14f49',fillOpacity:1})}
        onEachFeature={(feature,layer)=>{const name=feature.properties?.nama||feature.properties?.name||feature.properties?.Name||feature.properties?.label||'Lokasi kajian';const safe=String(name).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');layer.bindPopup(`<strong>${safe}</strong><br/>Titik kandidat kajian · belum diverifikasi lapangan`);}}/>}
      <MapFocus target={focus}/>
      <MapClickCapture onSelect={evaluate}/>
      {selection&&<CircleMarker center={[selection.lat,selection.lng]} radius={9} pathOptions={{color:'#092e56',weight:3,fillColor:'#ffca55',fillOpacity:.9}}><Tooltip direction="top" offset={[0,-10]} permanent>Lokasi evaluasi</Tooltip></CircleMarker>}
      <ScaleControl position="bottomright"/>
    </MapContainer>
    <div className="layer-switch"><strong><Layers3 size={15}/> GIS Layers</strong>
      <div className="basemap-switch" role="group" aria-label="Jenis peta"><button className={basemap==='street'?'on':''} onClick={()=>setBasemap('street')}>Peta</button><button className={basemap==='satellite'?'on':''} onClick={()=>setBasemap('satellite')}>Satelit</button></div>
      {Object.entries(labels).map(([key,label])=>{const ready=key==='builtup'?builtupLayer:layers[key];return <label key={key}><input type="checkbox" checked={visible[key]} onChange={e=>setVisible(v=>({...v,[key]:e.target.checked}))}/>{label}<small className={ready?'ready':''}>{ready?'Ready':'Pending'}</small></label>;})}
      <div className="builtup-upload"><label htmlFor="builtup-file">Impor poligon terbangun (.geojson)</label><input id="builtup-file" type="file" accept=".geojson,.json,application/geo+json" onChange={importBuiltup}/>{importMessage&&<small>{importMessage}</small>}</div>
      <label><input type="checkbox" checked={visible.preview} onChange={e=>setVisible(v=>({...v,preview:e.target.checked}))}/>Zonasi awal<small className="ready">Preview</small></label>
      <label><input type="checkbox" checked={visible.extent} onChange={e=>setVisible(v=>({...v,extent:e.target.checked}))}/>Batas DEM<small>Cakupan</small></label>
      <div className="preview-legend"><span><i style={{background:'#32a064'}}/>Rendah</span><span><i style={{background:'#fab837'}}/>Sedang</span><span><i style={{background:'#e65248'}}/>Tinggi</span></div>
      {points.length>0&&<div className="location-jump"><strong><MapPin size={14}/> Fokus lokasi</strong>{points.map((point,index)=><button key={`${point.name}-${index}`} onClick={()=>{setVisible(v=>({...v,locations:true}));setFocus({...point,id:`${index}-${Date.now()}`});}}>{point.name}</button>)}</div>}
    </div>
    <div className="map-note"><strong>Klik peta untuk mengevaluasi lokasi.</strong> Warna = indeks awal DEM, bukan genangan tervalidasi. Garis batas DEM bisa diaktifkan. Area muara selatan belum tercakup.</div>
  </div>
  {buildingSummary.all>0&&<section className="exposure-summary" aria-label="Analisis indikatif irisan bangunan dan zonasi">
    <div className="exposure-heading"><div><strong><Building2 size={17}/> Irisan Bangunan × Zonasi Indikatif</strong><p>Analisis otomatis poligon OSM terhadap raster model awal. Klik kartu untuk memfilter bangunan pada peta.</p></div><span>SCREENING · BUKAN DAMPAK TERKONFIRMASI</span></div>
    <div className="exposure-stat-grid">
      {[{key:'all',label:'Semua bangunan',color:'#1b5885'},{key:'3',label:'Indeks tinggi',color:buildingColors[3]},{key:'2',label:'Indeks sedang',color:buildingColors[2]},{key:'1',label:'Indeks rendah',color:buildingColors[1]},{key:'unknown',label:'Belum terklasifikasi',color:buildingColors.unknown}].map(item=><button type="button" key={item.key} className={`exposure-stat ${buildingFilter===item.key?'selected':''}`} aria-pressed={buildingFilter===item.key} onClick={()=>{setBuildingFilter(item.key);setVisible(v=>({...v,builtup:true}));}} style={{'--exposure-color':item.color}}><strong>{buildingSummary[item.key].toLocaleString('id-ID')}</strong><small>{item.label}</small></button>)}
    </div>
    <div className="exposure-warning"><AlertTriangle size={16}/><span><strong>{buildingSummary.outside.toLocaleString('id-ID')} bangunan di luar batas DEM.</strong> Bangunan tanpa kelas juga mencakup lokasi dalam batas DEM tetapi tanpa piksel zonasi valid. Tidak terklasifikasi ≠ aman. Cakupan muara Sepaku belum lengkap; hasil ini bukan jumlah rumah terdampak banjir. {!importedBuiltup&&<a href={`${PUBLIC_DATA}builtup_screening.csv`} download>Unduh daftar hasil screening (CSV)</a>}</span></div>
  </section>}
  <DecisionSupport selection={selection} builtupDataAvailable={Boolean(builtupLayer)}/></>;
}
