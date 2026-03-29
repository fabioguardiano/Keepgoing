import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Calendar as CalendarIcon, MapPin, Navigation, 
  Trash2, Edit2, X, CheckCircle2, Clock, Info, User as UserIcon,
  ChevronLeft, ChevronRight, Filter, AlertCircle, Phone, Truck, Building2, Map as MapIcon, List as ListIcon, FileDown
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Measurement, WorkOrder, DriverStatus, CompanyInfo, AppUser, ProductionStaff, PermissionProfile } from '../types';

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
  onRestoreMeasurement?: (id: string) => Promise<void>;
  driverTrackingLocations: Record<string, DriverStatus>;
  companyAddress: string;
  companyName: string;
  companyLogoUrl?: string;
  appUsers: AppUser[];
  staff: ProductionStaff[];
  permissionProfiles: PermissionProfile[];
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
  onRestoreMeasurement,
  driverTrackingLocations,
  companyAddress,
  companyName,
  companyLogoUrl,
  appUsers,
  staff,
  permissionProfiles
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [showWeekends, setShowWeekends] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(60);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
    addressNumber: '',
    addressComplement: '',
    clientPhone: '',
    sellerName: ''
  });

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2').substring(0, 9);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    if (digits.length <= 10) return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  };

  const [mapCenter, setMapCenter] = useState<[number, number]>([-21.1767, -47.8208]); // Ribeirão Preto default
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const [viaCepData, setViaCepData] = useState<{ logradouro: string; localidade: string; uf: string } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [previewMapCenter, setPreviewMapCenter] = useState<[number, number] | null>(null);

  // Busca por CEP (ViaCEP)
  useEffect(() => {
    const cepDigits = (newMeasurement.cep || '').replace(/\D/g, '');
    if (cepDigits.length === 8) {
      fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
        .then(r => r.json())
        .then(data => {
          if (!data.erro) {
            setViaCepData({ logradouro: data.logradouro, localidade: data.localidade, uf: data.uf });
            setNewMeasurement(prev => ({
              ...prev,
              address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
            }));
          }
        })
        .catch(err => console.error('Erro ao buscar CEP:', err));
    } else {
      setViaCepData(null);
    }
  }, [newMeasurement.cep]);

  // Geocodificar preview do mapa no modal — efeito dedicado e isolado
  useEffect(() => {
    if (!viaCepData) { setPreviewMapCenter(null); return; }
    const number = newMeasurement.addressNumber?.trim();
    const street = number
      ? `${number}, ${viaCepData.logradouro}`
      : viaCepData.logradouro;
    const url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(street)}&city=${encodeURIComponent(viaCepData.localidade)}&state=${encodeURIComponent(viaCepData.uf)}&countrycodes=br&limit=1`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) {
          setPreviewMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      })
      .catch(() => {});
  }, [viaCepData, newMeasurement.addressNumber]);

  // Geocodificação Real via Nominatim (OpenStreetMap)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Geocodificar endereço da empresa
      if (companyAddress && companyAddress.length >= 5 && !coords[companyAddress]) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(companyAddress)}&countrycodes=br&limit=1`)
          .then(r => r.json())
          .then(data => {
            if (data?.[0]) setCoords(prev => ({ ...prev, [companyAddress]: [parseFloat(data[0].lat), parseFloat(data[0].lon)] }));
          })
          .catch(() => {});
      }

      // Geocodificar endereços das medições — usa query estruturada (rua + cidade) para melhor precisão
      measurements.forEach(m => {
        if (!m.address || m.address.length < 5 || coords[m.address]) return;
        const parts = m.address.split(',');
        let url: string;
        if (parts.length >= 3) {
          // Formato ViaCEP: "Logradouro, Bairro, Cidade - UF"
          const street = parts[0].trim();
          const cityPart = parts[parts.length - 1].trim().replace(/ - \w{2}$/, '').trim();
          url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(street)}&city=${encodeURIComponent(cityPart)}&countrycodes=br&limit=1`;
        } else {
          url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(m.address)}&countrycodes=br&limit=1`;
        }
        fetch(url)
          .then(r => r.json())
          .then(data => {
            if (data?.[0]) setCoords(prev => ({ ...prev, [m.address]: [parseFloat(data[0].lat), parseFloat(data[0].lon)] }));
          })
          .catch(() => {});
      });

      // Geocodificar o endereço da nova medição usando dados estruturados (mais preciso)
      if (!newMeasurement.address || newMeasurement.address.length < 5) return;

      const fullAddr = newMeasurement.addressNumber
        ? `${newMeasurement.address}, ${newMeasurement.addressNumber}`
        : newMeasurement.address;

      if (coords[fullAddr]) return;

      let geocodeUrl: string;
      if (viaCepData && newMeasurement.addressNumber) {
        const street = `${newMeasurement.addressNumber} ${viaCepData.logradouro}`;
        geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(street)}&city=${encodeURIComponent(viaCepData.localidade)}&state=${encodeURIComponent(viaCepData.uf)}&countrycodes=br&limit=1`;
      } else if (viaCepData) {
        geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(viaCepData.logradouro)}&city=${encodeURIComponent(viaCepData.localidade)}&state=${encodeURIComponent(viaCepData.uf)}&countrycodes=br&limit=1`;
      } else {
        geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddr)}&countrycodes=br&limit=1`;
      }

      fetch(geocodeUrl)
        .then(r => r.json())
        .then(data => {
          if (data && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setCoords(prev => ({ ...prev, [fullAddr]: [lat, lon] }));
            setMapCenter([lat, lon]);
          }
        })
        .catch(err => console.error('Erro geocoding:', fullAddr, err));
    }, 1000);

    return () => clearTimeout(timer);
  }, [measurements, newMeasurement.address, newMeasurement.addressNumber, companyAddress, viaCepData]);

  // Atualizar centro do mapa quando o endereço da nova medição mudar (caso já tenhamos a coordenada)
  useEffect(() => {
    const fullAddr = newMeasurement.addressNumber
      ? `${newMeasurement.address}, ${newMeasurement.addressNumber}`
      : newMeasurement.address;

    if (newMeasurement.address && coords[fullAddr]) {
      setMapCenter(coords[fullAddr]);
    } else if (companyAddress && coords[companyAddress]) {
      setMapCenter(coords[companyAddress]);
    }
  }, [newMeasurement.address, newMeasurement.addressNumber, coords, companyAddress]);

  // Atualizar centro do mapa ao trocar de dia selecionado
  useEffect(() => {
    const dayMeas = measurements
      .filter(m => m.status !== 'Excluída' && m.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
    if (dayMeas.length > 0) {
      const first = dayMeas[0];
      if (coords[first.address]) setMapCenter(coords[first.address]);
    } else if (coords[companyAddress]) {
      setMapCenter(coords[companyAddress]);
    }
  }, [selectedDate, measurements, coords]);

  // Buscar rota por ruas via OSRM quando as medições do dia ou coordenadas mudarem
  useEffect(() => {
    const dayMeas = measurements
      .filter(m => m.status !== 'Excluída' && m.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));

    const waypoints: [number, number][] = [];

    if (coords[companyAddress]) waypoints.push(coords[companyAddress]);
    // Geocoding salva sob m.address (sem addressNumber), usar mesma chave
    for (const m of dayMeas) {
      if (coords[m.address]) waypoints.push(coords[m.address]);
    }

    if (waypoints.length < 2) { setRouteCoords([]); return; }

    const coordStr = waypoints.map(([lat, lon]) => `${lon},${lat}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          setRouteCoords(data.routes[0].geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]));
        } else {
          setRouteCoords(waypoints);
        }
      })
      .catch(() => setRouteCoords(waypoints));
  }, [selectedDate, measurements, coords, companyAddress]);

  const getWeekDays = (baseDate: string) => {
    const d = new Date(baseDate + 'T12:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day.toISOString().split('T')[0]);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate).filter(dayStr => {
    if (showWeekends) return true;
    const day = new Date(dayStr + 'T12:00:00').getDay();
    return day !== 0 && day !== 6; // Filter out Sat (6) and Sun (0)
  });

  const START_HOUR = 7;
  const SLOT_MINUTES = 30;
  const SLOT_COUNT = 24; // 07:00 até 19:00
  // Slots de 30 em 30 minutos
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const totalMinutes = START_HOUR * 60 + i * SLOT_MINUTES;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return { h, m, label: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` };
  });

  const handleZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
       e.preventDefault();
       const delta = e.deltaY > 0 ? -5 : 5;
       setZoomLevel(prev => Math.min(Math.max(30, prev + delta), 150));
    }
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const filteredMeasurements = measurements.filter(m => {
    const matchesSearch = m.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || m.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const activeMeasurements = filteredMeasurements.filter(m => m.status !== 'Excluída');
  const trashMeasurements = measurements.filter(m => m.status === 'Excluída');

  const weekMeasurements = activeMeasurements.filter(m => weekDays.includes(m.date));
  const mapMeasurements = activeMeasurements.filter(m => m.date === selectedDate);

  const getTimePosition = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m - START_HOUR * 60;
    return (totalMinutes / SLOT_MINUTES) * zoomLevel;
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
        addressNumber: '', addressComplement: '', clientPhone: '', sellerName: ''
      });
    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      alert('Houve um erro ao salvar a medição.');
    }
  };

  const openNewMeasurementModal = (date?: string, time?: string) => {
    setEditingMeasurementId(null);
    setConfirmingDelete(false);
    setViaCepData(null);
    setPreviewMapCenter(null);
    setNewMeasurement({
      clientName: '', address: '', cep: '', date: date ?? selectedDate,
      time: time ?? '08:00', description: '', measurerName: '',
      status: 'Pendente', osId: '', osNumber: '',
      addressNumber: '', addressComplement: '', clientPhone: '', sellerName: ''
    });
    setIsModalOpen(true);
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
      addressNumber: m.addressNumber || '',
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
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Top Header / Navigation - With Weekend Toggle */}
      <div className="bg-white border-b px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-sm relative z-[2000]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h1 className="text-md font-black text-slate-900 uppercase">Agenda de Medição</h1>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button onClick={() => changeWeek('prev')} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600 active:scale-90">
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 py-1 text-[11px] font-black text-slate-800 uppercase min-w-[180px] text-center">
              {new Date(getWeekDays(selectedDate)[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {new Date(getWeekDays(selectedDate)[6]).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <button onClick={() => changeWeek('next')} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600 active:scale-90">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-4 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none" htmlFor="weekend-toggle">Finais de Semana</label>
             <input 
               id="weekend-toggle"
               type="checkbox" 
               checked={showWeekends} 
               onChange={() => setShowWeekends(!showWeekends)}
               className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
             />
          </div>
          <div className="px-2 py-1 text-[8px] font-bold text-slate-400 border border-dashed rounded-lg">Ctrl + Scroll p/ Zoom</div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => openNewMeasurementModal()}
            className="flex items-center gap-1 px-5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} /> Agendar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Weekly Calendar with Dynamic Zoom & Forced Scrollbar */}
        <div 
          onWheel={handleZoom}
          className="flex-1 overflow-y-scroll scroll-sidebar bg-white select-none"
        >
          <div className="min-w-[800px] flex flex-col relative">
            {/* Days Header */}
            <div className="flex sticky top-0 z-[1001] bg-white border-b shadow-md">
               <div className="w-16 shrink-0 border-r py-2.5 px-1 text-center text-[10px] font-black uppercase text-slate-400 bg-slate-50">HORA</div>
               {weekDays.map(dayStr => {
                 const dayDate = new Date(dayStr + 'T12:00:00');
                 const isSelected = dayStr === selectedDate;
                 return (
                   <div 
                     key={dayStr}
                     onClick={() => setSelectedDate(dayStr)}
                     className={`flex-1 py-2 text-center border-r last:border-r-0 cursor-pointer transition-all ${isSelected ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-slate-50'}`}
                   >
                     <p className={`text-[9px] font-black uppercase tracking-tight ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                       {dayDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                     </p>
                     <p className="text-lg font-black leading-none">{dayDate.getDate()}</p>
                   </div>
                 );
               })}
            </div>

            {/* Hours Grid */}
            <div className="flex relative">
               {/* Hour Labels */}
               <div className="w-16 shrink-0 border-r bg-slate-50/50">
                  {slots.map(slot => (
                    <div key={slot.label} className="flex items-start justify-center pt-1 border-b last:border-b-0" style={{ height: `${zoomLevel}px` }}>
                      <span className={`text-[10px] font-${slot.m === 0 ? 'black' : 'medium'} ${slot.m === 0 ? 'text-slate-500' : 'text-slate-300'}`}>
                        {slot.label}
                      </span>
                    </div>
                  ))}
               </div>

               {/* Grid Columns for Days */}
               <div className="flex-1 flex relative">
                  {weekDays.map(dayStr => {
                    const isSelected = dayStr === selectedDate;
                    const dayMeasurements = weekMeasurements.filter(m => m.date === dayStr);
                    
                    return (
                      <div 
                        key={dayStr} 
                        onClick={() => setSelectedDate(dayStr)}
                        className={`flex-1 border-r last:border-r-0 relative transition-all ${isSelected ? 'bg-blue-50/20 shadow-inner' : ''}`}
                        style={{ minHeight: `${slots.length * zoomLevel}px` }}
                      >
                         {/* Slot Dividers — 30 min each */}
                         {slots.map(slot => (
                           <div key={slot.label} className={`border-b last:border-b-0 w-full flex items-center justify-center group/slot ${slot.m === 0 ? 'opacity-20' : 'opacity-10'}`} style={{ height: `${zoomLevel}px` }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedDate(dayStr); openNewMeasurementModal(dayStr, slot.label); }}
                                className="opacity-0 group-hover/slot:opacity-100 p-1.5 bg-blue-100 text-blue-600 rounded-full transition-all shadow-sm"
                              >
                                <Plus size={14} strokeWidth={3} />
                              </button>
                           </div>
                         ))}

                         {/* Measurements */}
                         {dayMeasurements.map((m) => {
                            const top = getTimePosition(m.time);
                            return (
                              <div 
                                key={m.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedMeasurementId(m.id); setSelectedDate(m.date); }}
                                onDoubleClick={(e) => { e.stopPropagation(); handleEditClick(m); }}
                                className={`absolute left-0.5 right-0.5 p-2 rounded-xl border transition-all cursor-pointer shadow-sm items-start flex flex-col ${
                                  selectedMeasurementId === m.id 
                                    ? 'bg-blue-600 border-blue-400 text-white z-40 shadow-xl' 
                                    : 'bg-white border-slate-100 text-slate-900 border hover:border-blue-200 z-10'
                                }`}
                                style={{ top: `${top}px`, height: `${Math.max(45, zoomLevel * 0.8)}px` }}
                              >
                                 <div className="flex items-center justify-between w-full mb-1">
                                    <span className={`text-[10px] font-black leading-tight ${selectedMeasurementId === m.id ? 'text-blue-100' : 'text-blue-600'}`}>{m.time}</span>
                                    {m.status === 'Concluída' && <CheckCircle2 size={12} className={selectedMeasurementId === m.id ? 'text-blue-200' : 'text-emerald-500'} />}
                                 </div>
                                 <p className="text-[11px] font-black truncate uppercase tracking-tight leading-none w-full">{m.clientName}</p>
                                 {zoomLevel > 80 && (
                                   <p className={`text-[9px] font-bold mt-1 truncate opacity-70 ${selectedMeasurementId === m.id ? 'text-blue-50' : 'text-slate-500'}`}>{m.measurerName}</p>
                                 )}
                              </div>
                            );
                         })}
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        </div>

        {/* Action Bar & Map Strip - More Height as Requested (500px) */}
        <div className="h-[500px] shrink-0 flex flex-col lg:flex-row relative bg-slate-200 border-t shadow-[0_-15px_30px_rgba(0,0,0,0.1)]">
           {/* Daily Focus Summary */}
           <div className="w-80 bg-white border-r flex flex-col shrink-0 overflow-y-auto hidden lg:flex scroll-sidebar">
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                   <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo do Dia</h4>
                      <p className="text-[14px] font-black text-slate-900">{new Date(selectedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                   </div>
                   <Navigation size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 p-3 space-y-2">
                   {mapMeasurements.length === 0 ? (
                      <div className="py-20 text-center opacity-30">
                        <CalendarIcon size={40} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-[10px] font-black uppercase text-slate-400">Nenhuma medição</p>
                      </div>
                   ) : mapMeasurements.sort((a,b) => a.time.localeCompare(b.time)).map((m, i) => (
                      <div key={m.id} 
                        onClick={() => setSelectedMeasurementId(m.id)} 
                        onDoubleClick={() => handleEditClick(m)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${selectedMeasurementId === m.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                      >
                         <div className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${selectedMeasurementId === m.id ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                            {i+1}
                         </div>
                         <div className="min-w-0">
                            <p className="text-[11px] font-black truncate tracking-tight mb-0.5 uppercase">{m.clientName}</p>
                            <p className="text-[9px] font-bold opacity-70">{m.time} • {m.measurerName || 'Sem medidor'}</p>
                         </div>
                      </div>
                   ))}
                </div>
                <div className="p-4 border-t bg-slate-50">
                   <button 
                     onClick={() => {
                        const destination = mapMeasurements.length > 0 ? mapMeasurements[mapMeasurements.length - 1].address : '';
                        const waypoints = mapMeasurements.slice(0, -1).map(m => m.address).join('/');
                        window.open(`https://www.google.com/maps/dir/${encodeURIComponent(companyAddress)}/${waypoints ? encodeURIComponent(waypoints) + '/' : ''}${encodeURIComponent(destination)}`, '_blank');
                     }}
                     className="w-full py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl focus:ring-4 focus:ring-slate-900/20"
                   >
                     <Navigation size={14} /> Rota no Maps
                   </button>
                </div>
           </div>

           <div className="flex-1 relative z-0">
              <MapContainer center={mapCenter} zoom={13} className="w-full h-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapController center={mapCenter} />
                  
                  {/* Company/Start marker */}
                  {coords[companyAddress] && (
                    <Marker position={coords[companyAddress]} icon={createCompanyIcon()}>
                      <Popup>
                        <div className="p-1">
                          <p className="font-black text-[10px] uppercase text-slate-400">Ponto de Partida</p>
                          <p className="font-bold text-xs">Sua Empresa</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Measurement markers — geocoding salva sob m.address */}
                  {mapMeasurements.map((m, i) => (
                    coords[m.address] && (
                      <Marker
                        key={m.id}
                        position={coords[m.address]}
                        icon={createNumberedIcon(i + 1, '#2563eb')}
                        eventHandlers={{ click: () => setSelectedMeasurementId(m.id) }}
                      >
                        <Popup>
                          <div className="p-1 min-w-[120px]">
                            <p className="font-black text-[9px] uppercase text-slate-400 mb-0.5">Medição {i + 1}</p>
                            <p className="font-bold text-xs text-slate-900">{m.clientName}</p>
                            <p className="text-[10px] text-blue-600 font-bold">{m.time}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  ))}
    
                  {/* Route Path Line — rota por ruas via OSRM */}
                  {routeCoords.length > 1 && (
                    <Polyline
                      positions={routeCoords}
                      color="#2563eb"
                      weight={4}
                      opacity={0.75}
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
                         <div className="flex items-center gap-1.5 mb-1 text-emerald-600">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                           <p className="font-black text-[10px] uppercase">Online</p>
                         </div>
                         <p className="font-bold text-xs tracking-tight">{name}</p>
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
                    addressNumber: '',
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
                      .filter(u => {
                        if (u.status !== 'ativo') return false;
                        const profile = permissionProfiles.find(p => p.id === u.profileId);
                        if (!profile) return u.role === 'seller' || u.role === 'admin';
                        const pname = profile.name.toLowerCase();
                        return pname.includes('vendedor') || pname.includes('administrador') || pname.includes('admin') || u.role === 'seller' || u.role === 'admin';
                      })
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))
                    }
                  </select>
                </div>
                
                <div className="sm:col-span-2 grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Endereço da Medição</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={newMeasurement.address}
                      onChange={e => setNewMeasurement({...newMeasurement, address: e.target.value.toUpperCase()})}
                      placeholder="Logradouro, Bairro, Cidade - UF"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Número</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={newMeasurement.addressNumber}
                      onChange={e => setNewMeasurement({...newMeasurement, addressNumber: e.target.value})}
                      placeholder="123"
                      required
                    />
                  </div>
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
                  {previewMapCenter ? (
                    <MapContainer
                      key={`modal-map-${previewMapCenter[0]}-${previewMapCenter[1]}`}
                      center={previewMapCenter}
                      zoom={16}
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                      scrollWheelZoom={false}
                      dragging={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={previewMapCenter} />
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-1">
                      <MapPin size={20} className="text-slate-300" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preencha o CEP para ver o mapa</p>
                    </div>
                  )}
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
                    {[
                      ...staff.filter(s => s.position === 'medidor' && s.status === 'ativo').map(s => s.name),
                      ...appUsers.filter(u => {
                        if (u.status !== 'ativo') return false;
                        const profile = permissionProfiles.find(p => p.id === u.profileId);
                        return profile?.name.toLowerCase().includes('medidor');
                      }).map(u => u.name)
                    ]
                      .filter((v, i, a) => v && a.indexOf(v) === i)
                      .sort((a, b) => a.localeCompare(b))
                      .map(name => (
                        <option key={name} value={name}>{name}</option>
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

              <div className="pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingMeasurementId(null);
                      setNewMeasurement({ 
                        clientName: '', address: '', cep: '', date: selectedDate, time: '08:00', description: '', measurerName: '', status: 'Pendente', osId: '', osNumber: '',
                        addressNumber: '', addressComplement: '', clientPhone: '', sellerName: ''
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

                {editingMeasurementId && onDeleteMeasurement && (
                  confirmingDelete ? (
                    <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                      <p className="flex-1 text-[10px] font-black text-red-600 uppercase tracking-wide">Confirma a exclusão?</p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await onDeleteMeasurement(editingMeasurementId);
                            setIsModalOpen(false);
                            setEditingMeasurementId(null);
                            setConfirmingDelete(false);
                          } catch (err: any) {
                            const msg = err?.message || err?.details || JSON.stringify(err) || 'Erro desconhecido';
                            alert(`Erro ao excluir: ${msg}`);
                            setConfirmingDelete(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wide hover:bg-red-700 transition-all"
                      >
                        Sim, excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wide hover:bg-slate-50 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100"
                    >
                      <Trash2 size={14} /> Excluir Agendamento
                    </button>
                  )
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lixeira */}
      {isTrashOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2001] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border">
            <div className="p-6 border-b flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-3">
                <Trash2 className="text-red-500" size={24} />
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Lixeira de Medições</h3>
              </div>
              <button 
                onClick={() => setIsTrashOpen(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {trashMeasurements.length === 0 ? (
                <div className="text-center py-12">
                   <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
                   <p className="text-gray-400 font-bold">A lixeira está vazia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trashMeasurements.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 border rounded-2xl">
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-gray-900">{m.clientName}</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{m.date} - {m.time}</span>
                      </div>
                      <button 
                        onClick={async () => {
                           if (onRestoreMeasurement) {
                              await onRestoreMeasurement(m.id);
                           }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
                      >
                        Restaurar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50/50 flex justify-end">
               <button 
                 onClick={() => setIsTrashOpen(false)}
                 className="px-6 py-3 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
               >
                 Fechar
               </button>
            </div>
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
