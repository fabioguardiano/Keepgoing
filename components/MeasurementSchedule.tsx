import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Calendar as CalendarIcon, MapPin, Navigation, 
  Trash2, Edit2, X, CheckCircle2, Clock, Info, User as UserIcon,
  ChevronLeft, ChevronRight, Filter, AlertCircle, Phone, Truck, Building2, Map as MapIcon, List as ListIcon, FileDown
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Measurement, WorkOrder, DriverStatus, CompanyInfo, AppUser } from '../types';

// O ícone padrão do Leaflet não funciona bem no Next.js/Vite sem isso
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MeasurementScheduleProps {
  measurements: Measurement[];
  orders: WorkOrder[];
  onAddMeasurement: (m: Omit<Measurement, 'id' | 'company_id'>) => Promise<any>;
  onUpdateMeasurement: (id: string, updates: Partial<Measurement>) => Promise<void>;
  onDeleteMeasurement: (id: string) => Promise<void>;
  driverTrackingLocations: Record<string, DriverStatus>;
  companyAddress: string;
  companyName: string;
  companyLogoUrl?: string;
  appUsers: AppUser[];
}

// Subcomponente para controlar o centro do mapa
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13);
  }, [center, map]);
  return null;
};

export const MeasurementSchedule: React.FC<MeasurementScheduleProps> = ({ 
  measurements, 
  orders, 
  onAddMeasurement, 
  onUpdateMeasurement, 
  onDeleteMeasurement,
  driverTrackingLocations,
  companyAddress,
  companyName,
  companyLogoUrl,
  appUsers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [activeMobileView, setActiveMobileView] = useState<'list' | 'map'>('list');
  
  const [newMeasurement, setNewMeasurement] = useState({
    clientName: '',
    address: '',
    cep: '',
    date: selectedDate,
    time: '08:00',
    description: '',
    measurerName: '',
    status: 'Pendente' as Measurement['status'],
    osId: '',
    osNumber: '',
    addressComplement: '',
    clientPhone: '',
    sellerName: ''
  });

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2').substring(0, 9);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const [mapCenter, setMapCenter] = useState<[number, number]>([-21.1767, -47.8208]); // Ribeirão Preto default
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});

  // Busca por CEP (ViaCEP)
  useEffect(() => {
    const cepDigits = (newMeasurement.cep || '').replace(/\D/g, '');
    if (cepDigits.length === 8) {
      fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
        .then(r => r.json())
        .then(data => {
          if (!data.erro) {
            setNewMeasurement(prev => ({
              ...prev,
              address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
            }));
          }
        })
        .catch(err => console.error('Erro ao buscar CEP:', err));
    }
  }, [newMeasurement.cep]);

  // Geocodificação Real via Nominatim (OpenStreetMap)
  useEffect(() => {
    const timer = setTimeout(() => {
      const addressesToGeocode = [
        ...measurements.map(m => m.address),
        newMeasurement.address,
        companyAddress
      ].filter((v, i, a) => v && a.indexOf(v) === i); // Unique only

      addressesToGeocode.forEach(addr => {
        if (coords[addr] || !addr || addr.length < 5) return; // Já geocodificado ou curto

        // Nominatim search
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`)
          .then(r => r.json())
          .then(data => {
            if (data && data[0]) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              setCoords(prev => ({ ...prev, [addr]: [lat, lon] }));
              if (addr === newMeasurement.address) {
                setMapCenter([lat, lon]);
              }
            }
          })
          .catch(err => console.error('Erro geocoding:', addr, err));
      });
    }, 1500); // 1.5s debounce para respeitar política do Nominatim

    return () => clearTimeout(timer);
  }, [measurements, newMeasurement.address, companyAddress]);

  // Atualizar centro do mapa quando o endereço da nova medição mudar (caso já tenhamos a coordenada)
  useEffect(() => {
    if (newMeasurement.address && coords[newMeasurement.address]) {
      setMapCenter(coords[newMeasurement.address]);
    } else if (companyAddress && coords[companyAddress]) {
      setMapCenter(coords[companyAddress]);
    }
  }, [newMeasurement.address, coords, companyAddress]);

  const getWeekDays = (baseDate: string) => {
    const d = new Date(baseDate + 'T12:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      return dayDate.toISOString().split('T')[0];
    });
  };

  const weekDays = getWeekDays(selectedDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 08:00 to 21:00

  const changeWeek = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const weekMeasurements = measurements.filter(m => weekDays.includes(m.date));
  const mapMeasurements = measurements.filter(m => m.date === selectedDate);

  const getDayMeasurements = (dayStr: string) => {
    return weekMeasurements.filter(m => m.date === dayStr).sort((a, b) => a.time.localeCompare(b.time));
  };

  const getTimePosition = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const startHour = hours[0];
    const endHour = hours[hours.length - 1] + 1;
    const totalMinutes = (endHour - startHour) * 60;
    const currentMinutes = (h - startHour) * 60 + m;
    return (currentMinutes / totalMinutes) * 100;
  };

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMeasurementId) {
        await onUpdateMeasurement(editingMeasurementId, newMeasurement);
      } else {
        await onAddMeasurement(newMeasurement);
      }
      setIsModalOpen(false);
      setEditingMeasurementId(null);
      setNewMeasurement({ 
        clientName: '', address: '', cep: '', date: selectedDate, time: '08:00', description: '', measurerName: '', status: 'Pendente', osId: '', osNumber: '',
        addressComplement: '', clientPhone: '', sellerName: ''
      });
    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      alert('Houve um erro ao salvar a medição.');
    }
  };

  const handleEditClick = (m: Measurement) => {
    setEditingMeasurementId(m.id);
    setNewMeasurement({
      clientName: m.clientName,
      address: m.address,
      date: m.date,
      time: m.time,
      description: m.description || '',
      measurerName: m.measurerName || '',
      status: m.status,
      osId: m.osId || '',
      osNumber: m.osNumber || '',
      cep: m.cep || '',
      addressComplement: m.addressComplement || '',
      clientPhone: m.clientPhone || '',
      sellerName: m.sellerName || ''
    });
    setIsModalOpen(true);
  };

  const createNumberedIcon = (number: number, color: string) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); transform: translateY(-50%);">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 0]
  });

  const createCompanyIcon = () => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #1f2937; color: white; border: 2px solid white; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); transform: translateY(-50%);">
            ${companyLogoUrl ? `<img src="${companyLogoUrl}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover" />` : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M16 18h.01"/></svg>'}
           </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 0]
  });

  const createMeasurerIcon = () => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #10b981; color: white; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 0 15px rgba(16, 185, 129, 0.5); border: 3px solid white; animation: pulse 2s infinite; transform: translateY(-50%);">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 0]
  });

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden font-sans">
      {/* Top Header / Navigation */}
      <div className="bg-white border-b px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-md relative z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-xl shadow-blue-600/20">
              <CalendarIcon size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Agenda de Medição</h1>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linha do Tempo Semanal</p>
                 <span className="w-1 h-1 bg-slate-300 rounded-full" />
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Outlook Schedule View</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <button 
              onClick={() => changeWeek('prev')}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600 active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-6 py-2 text-sm font-black text-slate-800 uppercase min-w-[220px] text-center">
              {new Date(weekDays[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {new Date(weekDays[6]).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <button 
              onClick={() => changeWeek('next')}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600 active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente, medidor ou O.S..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-600/5 focus:bg-white transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-600/40 hover:bg-blue-700 active:scale-95 transition-all shrink-0"
          >
            <Plus size={20} strokeWidth={3} /> Agendar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Weekly Timeline View - Horizontal Hours */}
        <div className="bg-white border-b overflow-x-auto custom-scrollbar shrink-0 shadow-inner">
          <div className="min-w-[1200px] flex flex-col">
             {/* Timeline Header (Hours) */}
             <div className="flex border-b bg-slate-50/50">
                <div className="w-48 shrink-0 py-3 px-6 border-r text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white sticky left-0 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  Dia da Semana
                </div>
                <div className="flex-1 flex relative">
                   {hours.map(h => (
                     <div key={h} className="flex-1 min-w-[80px] py-3 text-center border-r last:border-r-0">
                        <span className="text-[10px] font-black text-slate-500">{h.toString().padStart(2, '0')}:00</span>
                     </div>
                   ))}
                </div>
             </div>

             {/* Days Rows */}
             {weekDays.map(dayStr => {
               const dayDate = new Date(dayStr + 'T12:00:00');
               const isToday = dayStr === new Date().toISOString().split('T')[0];
               const isSelected = dayStr === selectedDate;
               const dayMeasurements = getDayMeasurements(dayStr);

               return (
                 <div key={dayStr} className={`flex border-b last:border-b-0 min-h-[60px] group transition-all ${isToday ? 'bg-blue-50/20' : ''}`}>
                    <div 
                      onClick={() => setSelectedDate(dayStr)}
                      className={`w-48 shrink-0 p-4 border-r sticky left-0 z-40 cursor-pointer transition-all flex flex-col justify-center ${isSelected ? 'bg-blue-600 text-white shadow-xl' : 'bg-white group-hover:bg-slate-50'}`}
                    >
                       <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {dayDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </span>
                          {isToday && <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${isSelected ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>Hoje</span>}
                       </div>
                       <span className="text-lg font-black leading-tight">{dayDate.getDate()} {dayDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                    </div>

                    <div className="flex-1 flex relative items-center p-2 min-h-[80px]">
                       {/* Grid vertical lines */}
                       <div className="absolute inset-0 flex pointer-events-none">
                          {hours.map(h => <div key={h} className="flex-1 border-r border-slate-100 last:border-r-0" />)}
                       </div>

                       {/* Current time indicator line if today */}
                       {isToday && (
                         <div 
                           className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-30 opacity-50 pointer-events-none"
                           style={{ left: `${getTimePosition(new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' }))}%` }}
                         />
                       )}

                       {/* Measurements Markers on Timeline */}
                       <div className="relative w-full h-full flex items-center">
                          {dayMeasurements.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => { setSelectedDate(dayStr); setIsModalOpen(true); }}
                                 className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-blue-600 transition-colors"
                               >
                                 <Plus size={14} /> Agendar neste dia
                               </button>
                            </div>
                          ) : (
                            dayMeasurements.map((m, idx) => {
                               const pos = getTimePosition(m.time);
                               return (
                                 <div 
                                   key={m.id}
                                   onClick={(e) => { e.stopPropagation(); setSelectedMeasurementId(m.id); setSelectedDate(m.date); }}
                                   className={`absolute h-12 min-w-[120px] max-w-[200px] p-2.5 rounded-xl border-2 transition-all cursor-pointer shadow-sm flex flex-col justify-center z-10 ${
                                     selectedMeasurementId === m.id 
                                       ? 'bg-blue-600 border-blue-400 text-white z-20 scale-105 shadow-xl shadow-blue-600/30' 
                                       : 'bg-white border-slate-100 text-slate-900 hover:border-blue-300 hover:shadow-md'
                                   }`}
                                   style={{ 
                                     left: `${pos}%`, 
                                     transform: `translateX(-5%) translateY(${dayMeasurements.length > 2 ? (idx % 2 === 0 ? '-10px' : '10px') : '0'})`,
                                   }}
                                 >
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                       <span className={`text-[9px] font-black ${selectedMeasurementId === m.id ? 'text-blue-100' : 'text-blue-600'}`}>
                                         {m.time}
                                       </span>
                                       <button onClick={(e) => { e.stopPropagation(); handleEditClick(m); }} className={`p-1 rounded-lg ${selectedMeasurementId === m.id ? 'hover:bg-blue-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                                         <Edit2 size={10} />
                                       </button>
                                    </div>
                                    <p className="text-[10px] font-black truncate leading-none mb-1 uppercase tracking-tight">{m.clientName}</p>
                                    <p className={`text-[8px] font-bold truncate opacity-80 ${selectedMeasurementId === m.id ? 'text-white' : 'text-slate-500'}`}>
                                       {m.measurerName || 'Sem medidor'}
                                    </p>
                                 </div>
                               );
                            })
                          )}
                       </div>
                    </div>
                 </div>
               );
             })}
          </div>
        </div>

        {/* Bottom Section - Map & Action Bar */}
        <div className="flex-1 flex flex-col relative bg-slate-200">
           <div className="flex-1 relative z-0">
             {/* Floating Info Over Map */}
             <div className="absolute top-4 left-4 z-[1000] space-y-2 pointer-events-none">
                <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-2xl border pointer-events-auto min-w-[240px]">
                   <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foco do Dia</h4>
                      <span className="px-2 py-0.5 bg-blue-50 text-[9px] font-black text-blue-600 rounded-full uppercase">
                        {mapMeasurements.length} Atendimentos
                      </span>
                   </div>
                   <p className="text-sm font-black text-slate-900 leading-none mb-1">
                     {new Date(selectedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                   </p>
                   <div className="flex items-center gap-2 mb-4">
                      <div className={`w-2 h-2 rounded-full ${Object.keys(driverTrackingLocations).length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        {Object.keys(driverTrackingLocations).length} Medidores em Rota
                      </span>
                   </div>

                   <button 
                     onClick={() => {
                       const destination = mapMeasurements.length > 0 ? mapMeasurements[mapMeasurements.length - 1].address : '';
                       const waypoints = mapMeasurements.slice(0, -1).map(m => m.address).join('/');
                       window.open(`https://www.google.com/maps/dir/${encodeURIComponent(companyAddress)}/${waypoints ? encodeURIComponent(waypoints) + '/' : ''}${encodeURIComponent(destination)}`, '_blank');
                     }}
                     className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-2 group pointer-events-auto cursor-pointer"
                   >
                     <Navigation size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                     Iniciar Rota no Maps
                   </button>
                </div>
             </div>

             <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                 <TileLayer
                   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                 />
                 <MapController center={mapCenter} />
                 
                 {/* Company Home Marker */}
                 {coords[companyAddress] && !isNaN(coords[companyAddress][0]) && (
                   <Marker position={coords[companyAddress] as L.LatLngTuple} icon={createCompanyIcon()}>
                     <Popup>
                       <div className="p-1">
                         <p className="font-black text-xs uppercase text-slate-400 mb-1">Sede / Ponto de Saída</p>
                         <p className="font-bold text-sm">{companyName}</p>
                       </div>
                     </Popup>
                   </Marker>
                 )}
   
                 {/* Measurement Markers */}
                 {mapMeasurements.map((m, i) => (
                   coords[m.address] && !isNaN(coords[m.address][0]) && (
                     <Marker 
                       key={m.id} 
                       position={coords[m.address] as L.LatLngTuple} 
                       icon={createNumberedIcon(i + 1, '#2563eb')}
                       eventHandlers={{ click: () => setSelectedMeasurementId(m.id) }}
                     >
                       <Popup>
                         <div className="p-1 min-w-[150px]">
                           <p className="font-black text-[10px] uppercase text-slate-400 mb-1">Medição {i + 1}</p>
                           <p className="font-bold text-sm text-slate-900">{m.clientName}</p>
                           <p className="text-xs text-blue-600 font-bold mb-1">{m.time}</p>
                           <p className="text-[10px] text-slate-500 line-clamp-2">{m.address}</p>
                         </div>
                       </Popup>
                     </Marker>
                   )
                 ))}
   
                 {/* Route Path Line */}
                 {mapMeasurements.length > 0 && (
                   <Polyline 
                     positions={[
                       coords[companyAddress] as [number, number],
                       ...mapMeasurements.filter(m => coords[m.address]).map(m => coords[m.address] as [number, number])
                     ]}
                     color="#2563eb"
                     weight={3}
                     opacity={0.5}
                     dashArray="5, 10"
                   />
                 )}
   
                 {/* Real-time Tracking Markers */}
                 {Object.entries(driverTrackingLocations).map(([name, location]) => (
                   <Marker 
                     key={name}
                     position={[location.lat, location.lng]} 
                     icon={createMeasurerIcon()}
                   >
                     <Popup>
                       <div className="p-1">
                         <div className="flex items-center gap-2 mb-1">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                           <p className="font-black text-xs uppercase text-emerald-600">Medidor Online</p>
                         </div>
                         <p className="font-bold text-sm tracking-tight">{name}</p>
                         <p className="text-[10px] text-slate-500 font-medium">Visto às: {location.lastUpdate}</p>
                       </div>
                     </Popup>
                   </Marker>
                 ))}
               </MapContainer>
             </div>
           </div>
        </div>

      {/* Modal Adicionar / Editar Medição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                {editingMeasurementId ? 'Editar Medição' : 'Agendar Medição'}
              </h3>
              <button 
                onClick={() => { 
                  setIsModalOpen(false); 
                  setEditingMeasurementId(null); 
                  setNewMeasurement({ 
                    clientName: '', 
                    address: '', 
                    cep: '',
                    date: selectedDate, 
                    time: '08:00', 
                    description: '', 
                    measurerName: '', 
                    status: 'Pendente', 
                    osId: '', 
                    osNumber: '',
                    addressComplement: '',
                    clientPhone: '',
                    sellerName: ''
                  }); 
                }} 
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddMeasurement} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome do Cliente</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.clientName}
                    onChange={e => setNewMeasurement({...newMeasurement, clientName: e.target.value.toUpperCase()})}
                    placeholder="Nome completo ou empresa"
                    required
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">CEP</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.cep}
                    onChange={e => setNewMeasurement({...newMeasurement, cep: formatCEP(e.target.value)})}
                    placeholder="00000-000"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Telefone</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.clientPhone}
                    onChange={e => setNewMeasurement({...newMeasurement, clientPhone: formatPhone(e.target.value)})}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Vendedor</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.sellerName}
                    onChange={e => setNewMeasurement({...newMeasurement, sellerName: e.target.value})}
                    required
                  >
                    <option value="">Selecione o vendedor</option>
                    {appUsers
                      .filter(u => (u.role === 'seller' || u.role === 'admin') && u.status === 'ativo')
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))
                    }
                  </select>
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Endereço da Medição</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.address}
                    onChange={e => setNewMeasurement({...newMeasurement, address: e.target.value.toUpperCase()})}
                    placeholder="Logradouro, número, bairro e cidade"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Complemento (Apt, Bloco, Casa)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.addressComplement}
                    onChange={e => setNewMeasurement({...newMeasurement, addressComplement: e.target.value.toUpperCase()})}
                    placeholder="Ex: Ap 402, Bloco B ou Condomínio X"
                  />
                </div>

                {/* Map Preview in Modal */}
                <div className="sm:col-span-2 h-32 rounded-2xl overflow-hidden border border-gray-100 relative">
                   <MapContainer 
                     key={`modal-map-${mapCenter[0]}-${mapCenter[1]}`}
                     center={mapCenter} 
                     zoom={15} 
                     style={{ height: '100%', width: '100%' }} 
                     zoomControl={false}
                     scrollWheelZoom={false}
                     dragging={false}
                   >
                     <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                     <MapController center={mapCenter} />
                     <Marker position={mapCenter} />
                   </MapContainer>
                   <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur rounded text-[9px] font-black uppercase text-gray-500 shadow-sm z-[500]">
                     Prévia da Localização
                   </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Data</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.date}
                    onChange={e => setNewMeasurement({...newMeasurement, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Horário</label>
                  <input 
                    type="time" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.time}
                    onChange={e => setNewMeasurement({...newMeasurement, time: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Vincular O.S. (Opcional)</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.osId}
                    onChange={e => {
                      const order = orders.find(o => o.id === e.target.value);
                      setNewMeasurement({
                        ...newMeasurement, 
                        osId: e.target.value,
                        osNumber: order ? `${order.osNumber}-${order.osSubNumber}` : '',
                        clientName: (order?.clientName || newMeasurement.clientName).toUpperCase()
                      });
                    }}
                  >
                    <option value="">Nenhuma O.S.</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>O.S. {o.osNumber}-{o.osSubNumber} - {o.clientName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Medidor Responsável</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.measurerName}
                    onChange={e => setNewMeasurement({...newMeasurement, measurerName: e.target.value})}
                    required
                  >
                    <option value="">Selecione o medidor</option>
                    {appUsers
                      .filter(u => (u.role === 'driver' || u.role === 'admin') && u.status === 'ativo')
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Instruções / Observações</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none h-24"
                    value={newMeasurement.description}
                    onChange={e => setNewMeasurement({...newMeasurement, description: e.target.value.toUpperCase()})}
                    placeholder="Detalhes sobre a medição, pontos de atenção, etc..."
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingMeasurementId(null);
                    setNewMeasurement({ 
                      clientName: '', address: '', cep: '', date: selectedDate, time: '08:00', description: '', measurerName: '', status: 'Pendente', osId: '', osNumber: '',
                      addressComplement: '', clientPhone: '', sellerName: ''
                    });
                  }}
                  className="flex-1 py-4 font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-[2] bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all transform active:scale-95"
                >
                  {editingMeasurementId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
