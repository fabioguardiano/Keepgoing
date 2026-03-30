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
  companyIconUrl?: string;
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
  companyIconUrl,
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

  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Fechar month picker ao clicar fora
  useEffect(() => {
    if (!showMonthPicker) return;
    const handler = () => setShowMonthPicker(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMonthPicker]);

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
    fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordStr}?overview=full&geometries=geojson`)
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

  const changeDay = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
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

  // Dias do mês para visão mensal
  const getMonthDays = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Preencher com dias do mês anterior para alinhar na semana
    const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // segunda=0
    const days: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }
    return days;
  };
  const monthDays = getMonthDays(selectedDate);

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

  // Pin gota SVG — destinos numerados com nome do cliente
  const createNumberedIcon = (number: number, color: string, clientName?: string) => {
    const label = clientName
      ? clientName.split(' ').slice(0, 2).join(' ').substring(0, 16).toUpperCase()
      : '';
    const bubbleWidth = Math.max(80, label.length * 7 + 24);
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="position:relative;width:${bubbleWidth}px;height:42px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.25))">
        <!-- Pin gota centralizado -->
        <div style="position:absolute;left:${bubbleWidth / 2 - 16}px;top:0;width:32px;height:42px">
          <svg viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26S32 26.667 32 16C32 7.163 24.837 0 16 0z" fill="${color}"/>
            <circle cx="16" cy="15" r="9" fill="white" opacity="0.2"/>
          </svg>
          <div style="position:absolute;top:6px;left:0;width:32px;text-align:center;color:white;font-weight:900;font-size:13px;font-family:sans-serif;line-height:1">${number}</div>
        </div>
        ${label ? `<!-- Label nome cliente -->
        <div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:center">
          <div style="margin-top:-18px;background:${color};color:white;font-weight:800;font-size:9px;font-family:sans-serif;padding:2px 6px;border-radius:4px;white-space:nowrap;letter-spacing:0.05em;box-shadow:0 2px 4px rgba(0,0,0,0.2)">
            ${label}
          </div>
        </div>` : ''}
      </div>`,
      iconSize: [bubbleWidth, 42],
      iconAnchor: [bubbleWidth / 2, 42]
    });
  };

  // Pin gota SVG — empresa (favicon ou ícone de prédio)
  const createCompanyIcon = () => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="position:relative;width:36px;height:48px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35))">
        <svg viewBox="0 0 36 48" width="36" height="48" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.059 0 0 8.059 0 18c0 12 18 30 18 30S36 30 36 18C36 8.059 27.941 0 18 0z" fill="white" stroke="#e2e8f0" stroke-width="1.5"/>
          <circle cx="18" cy="17" r="11" fill="#f1f5f9" opacity="0.8"/>
        </svg>
        <div style="position:absolute;top:4px;left:0;width:36px;height:26px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%">
          ${(companyIconUrl || companyLogoUrl)
            ? `<img src="${companyIconUrl || companyLogoUrl}" style="width:20px;height:20px;object-fit:contain;border-radius:4px"/>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f2937" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/></svg>`
          }
        </div>
      </div>`,
      iconSize: [36, 48],
      iconAnchor: [18, 48]
    });
  };

  // Pin gota SVG — medidor em trânsito (verde pulsante com ícone de carro)
  const createMeasurerIcon = () => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="position:relative;width:36px;height:48px;filter:drop-shadow(0 4px 8px rgba(16,185,129,0.5))">
      <style>.pulse-ring{animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite}@keyframes ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.6);opacity:0}}</style>
      <div class="pulse-ring" style="position:absolute;top:2px;left:2px;width:32px;height:32px;border-radius:50%;background:rgba(16,185,129,0.3)"></div>
      <svg viewBox="0 0 36 48" width="36" height="48" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.059 0 0 8.059 0 18c0 12 18 30 18 30S36 30 36 18C36 8.059 27.941 0 18 0z" fill="#10b981"/>
        <circle cx="18" cy="17" r="11" fill="white" opacity="0.15"/>
      </svg>
      <div style="position:absolute;top:5px;left:0;width:36px;display:flex;align-items:center;justify-content:center">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l3 4v6z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>
      </div>
    </div>`,
    iconSize: [36, 48],
    iconAnchor: [18, 48]
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

          {/* Toggle Semana / Mês */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${calendarView === 'week' ? 'bg-white shadow text-blue-600 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >Semana</button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${calendarView === 'month' ? 'bg-white shadow text-blue-600 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >Mês</button>
          </div>

          {/* Navegação de período + seletor rápido */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 relative">
            <button
              onClick={() => calendarView === 'week' ? changeWeek('prev') : setSelectedDate(d => {
                const dt = new Date(d + 'T12:00:00'); dt.setMonth(dt.getMonth() - 1); return dt.toISOString().split('T')[0];
              })}
              className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600 active:scale-90"
            ><ChevronLeft size={16} /></button>

            <button
              onClick={() => { setPickerYear(new Date(selectedDate + 'T12:00:00').getFullYear()); setShowMonthPicker(v => !v); }}
              className="px-4 py-1 text-[11px] font-black text-slate-800 uppercase min-w-[180px] text-center hover:bg-white rounded-lg transition-all"
            >
              {calendarView === 'week'
                ? `${new Date(getWeekDays(selectedDate)[0]).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${new Date(getWeekDays(selectedDate)[6]).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              }
            </button>

            <button
              onClick={() => calendarView === 'week' ? changeWeek('next') : setSelectedDate(d => {
                const dt = new Date(d + 'T12:00:00'); dt.setMonth(dt.getMonth() + 1); return dt.toISOString().split('T')[0];
              })}
              className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-600 active:scale-90"
            ><ChevronRight size={16} /></button>

            {/* Popup seletor de mês/ano */}
            {showMonthPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border p-4 z-[3000] w-72">
                {/* Seletor de ano */}
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setPickerYear(y => y - 1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all"><ChevronLeft size={14} /></button>
                  <span className="text-sm font-black text-slate-800">{pickerYear}</span>
                  <button onClick={() => setPickerYear(y => y + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all"><ChevronRight size={14} /></button>
                </div>
                {/* Grid de meses */}
                <div className="grid grid-cols-3 gap-1.5">
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((mes, idx) => {
                    const cur = new Date(selectedDate + 'T12:00:00');
                    const isActive = cur.getFullYear() === pickerYear && cur.getMonth() === idx;
                    return (
                      <button
                        key={mes}
                        onClick={() => {
                          const d = new Date(pickerYear, idx, 1);
                          setSelectedDate(d.toISOString().split('T')[0]);
                          setCalendarView('month');
                          setShowMonthPicker(false);
                        }}
                        className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                      >{mes}</button>
                    );
                  })}
                </div>
              </div>
            )}
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
        {/* ===== DESKTOP LAYOUT ===== */}
        <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
        {calendarView === 'month' ? (
          /* ===== VISÃO MENSAL ===== */
          <div className="flex-1 overflow-y-auto scroll-sidebar bg-white p-4">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 mb-2">
              {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-2">{d}</div>
              ))}
            </div>
            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((dayStr, idx) => {
                if (!dayStr) return <div key={`empty-${idx}`} />;
                const dayMeas = activeMeasurements.filter(m => m.date === dayStr);
                const isSelected = dayStr === selectedDate;
                const isToday = dayStr === new Date().toISOString().split('T')[0];
                return (
                  <div
                    key={dayStr}
                    onClick={() => { setSelectedDate(dayStr); setCalendarView('week'); }}
                    className={`min-h-[80px] p-2 rounded-xl border cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm flex flex-col gap-1 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}
                  >
                    <span className={`text-[12px] font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : isSelected ? 'text-blue-600' : 'text-slate-600'}`}>
                      {new Date(dayStr + 'T12:00:00').getDate()}
                    </span>
                    {dayMeas.slice(0, 3).map(m => (
                      <div key={m.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate ${m.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' : m.status === 'Cancelada' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                        {m.time} {m.clientName}
                      </div>
                    ))}
                    {dayMeas.length > 3 && (
                      <span className="text-[9px] font-black text-slate-400">+{dayMeas.length - 3} mais</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
        /* ===== VISÃO SEMANAL (original) ===== */
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
        )} {/* fim ternário semana/mês */}

        {/* Action Bar & Map Strip - More Height as Requested (500px) */}
        <div className="h-[680px] shrink-0 flex flex-col lg:flex-row relative bg-slate-200 border-t shadow-[0_-15px_30px_rgba(0,0,0,0.1)]">
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
                         <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black tracking-tight mb-0.5 uppercase leading-tight">{m.clientName}</p>
                            <p className="text-[9px] font-bold opacity-70 mb-1">{m.time} • {m.measurerName || 'Sem medidor'}</p>
                            <p className="text-[9px] font-medium leading-snug break-words" style={{ color: selectedMeasurementId === m.id ? 'rgba(255,255,255,0.8)' : '#64748b' }}>
                              {[m.address, m.addressNumber, m.addressComplement].filter(Boolean).join(', ')}
                            </p>
                         </div>
                      </div>
                   ))}
                </div>
                <div className="p-4 border-t bg-slate-50 flex flex-col gap-2">
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
                   <button
                     onClick={() => {
                       const sorted = [...mapMeasurements].sort((a, b) => a.time.localeCompare(b.time));
                       const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
                       const rows = sorted.map((m, i) => `
                         <tr>
                           <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:900;color:#2563eb;font-size:13px">${i + 1}</td>
                           <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:700;white-space:nowrap">${m.time}</td>
                           <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:800;text-transform:uppercase">${m.clientName}</td>
                           <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;color:#475569;word-break:break-word">${[m.address, m.addressNumber, m.addressComplement].filter(Boolean).join(', ')}</td>
                           <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;color:#475569;white-space:nowrap">${m.clientPhone || '—'}</td>
                           <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;color:#475569">${m.measurerName || '—'}</td>
                           <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;color:#475569">${m.description || '—'}</td>
                         </tr>`).join('');
                       const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Roteiro de Medições — ${dateLabel}</title>
                         <style>
                           body{font-family:Arial,sans-serif;padding:20px;color:#1e293b;font-size:10px}
                           h1{font-size:15px;font-weight:900;text-transform:uppercase;margin:0 0 3px}
                           .sub{color:#64748b;font-size:9px;margin-bottom:16px}
                           table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}
                           th{background:#1e293b;color:white;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.05em}
                           tr:nth-child(even) td{background:#f8fafc}
                           .footer{margin-top:20px;color:#94a3b8;font-size:9px;border-top:1px solid #e2e8f0;padding-top:8px}
                           @media print{body{padding:10px}@page{margin:10mm}}
                         </style></head><body>
                         ${companyLogoUrl ? `<img src="${companyLogoUrl}" style="height:48px;object-fit:contain;margin-bottom:12px"/>` : ''}
                         <h1>Roteiro de Medições</h1>
                         <div class="sub">${dateLabel} &nbsp;•&nbsp; ${companyName} &nbsp;•&nbsp; Partida: ${companyAddress}</div>
                         <table>
                           <thead><tr>
                             <th style="width:40px">#</th>
                             <th style="width:60px">Hora</th>
                             <th>Cliente</th>
                             <th>Endereço</th>
                             <th style="width:120px">Telefone</th>
                             <th style="width:110px">Medidor</th>
                             <th>Observações</th>
                           </tr></thead>
                           <tbody>${rows}</tbody>
                         </table>
                         <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} — ${companyName}</div>
                         <script>window.onload=()=>{window.print()}<\/script>
                       </body></html>`;
                       const w = window.open('', '_blank');
                       if (w) { w.document.write(html); w.document.close(); }
                     }}
                     className="w-full py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                   >
                     <FileDown size={14} /> Imprimir / Salvar PDF
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
                        icon={createNumberedIcon(i + 1, '#2563eb', m.clientName)}
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
        </div> {/* end desktop layout */}

        {/* ===== MOBILE LAYOUT ===== */}
        <div className="flex flex-col flex-1 overflow-hidden lg:hidden">
          {/* Mobile date navigator */}
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
            <button
              onClick={() => changeDay('prev')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600 active:scale-90"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
              </p>
              <p className="text-base font-black text-slate-900">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => changeDay('next')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600 active:scale-90"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Mobile content */}
          {activeMobileView === 'list' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
              {mapMeasurements.length === 0 ? (
                <div className="py-24 text-center">
                  <CalendarIcon size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Nenhuma medição neste dia</p>
                  <button
                    onClick={() => openNewMeasurementModal()}
                    className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wide shadow-lg shadow-blue-600/20"
                  >
                    + Agendar Medição
                  </button>
                </div>
              ) : (
                <>
                  {[...mapMeasurements].sort((a, b) => a.time.localeCompare(b.time)).map((m, i) => (
                    <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="flex items-stretch">
                        <div className="w-12 bg-blue-600 flex items-center justify-center shrink-0">
                          <span className="text-white font-black text-[16px]">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0 p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-[13px] font-black text-slate-900 uppercase leading-tight">{m.clientName}</p>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                              m.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' :
                              m.status === 'Cancelada' ? 'bg-red-100 text-red-600' :
                              'bg-blue-100 text-blue-700'
                            }`}>{m.status}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={11} className="text-blue-500 shrink-0" />
                            <span className="text-[11px] font-black text-blue-600">{m.time}</span>
                            {m.measurerName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <UserIcon size={11} className="text-slate-400 shrink-0" />
                                <span className="text-[11px] font-bold text-slate-500">{m.measurerName}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-start gap-1.5">
                            <MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-500 font-medium leading-snug">
                              {[m.address, m.addressNumber, m.addressComplement].filter(Boolean).join(', ')}
                            </p>
                          </div>
                          {m.clientPhone && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              <p className="text-[11px] text-slate-500 font-medium">{m.clientPhone}</p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditClick(m)}
                          className="px-3 flex items-center text-slate-300 hover:text-blue-500 border-l border-slate-100 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const sorted = [...mapMeasurements].sort((a, b) => a.time.localeCompare(b.time));
                      const destination = sorted.length > 0 ? sorted[sorted.length - 1].address : '';
                      const waypoints = sorted.slice(0, -1).map(m => m.address).join('/');
                      window.open(`https://www.google.com/maps/dir/${encodeURIComponent(companyAddress)}/${waypoints ? encodeURIComponent(waypoints) + '/' : ''}${encodeURIComponent(destination)}`, '_blank');
                    }}
                    className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Navigation size={14} /> Rota no Maps
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 relative">
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapController center={mapCenter} />
                {coords[companyAddress] && (
                  <Marker position={coords[companyAddress]} icon={createCompanyIcon()}>
                    <Popup>
                      <div className="p-1">
                        <p className="font-black text-[10px] uppercase text-slate-400">Partida</p>
                        <p className="font-bold text-xs">{companyName}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {[...mapMeasurements].sort((a, b) => a.time.localeCompare(b.time)).map((m, i) => (
                  coords[m.address] && (
                    <Marker
                      key={m.id}
                      position={coords[m.address]}
                      icon={createNumberedIcon(i + 1, '#2563eb', m.clientName)}
                      eventHandlers={{ click: () => { setSelectedMeasurementId(m.id); setActiveMobileView('list'); } }}
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
                {routeCoords.length > 1 && (
                  <Polyline positions={routeCoords} color="#2563eb" weight={4} opacity={0.75} />
                )}
                {Object.entries(driverTrackingLocations).map(([name, location]) => (
                  <Marker key={name} position={[location.lat, location.lng]} icon={createMeasurerIcon()}>
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
          )}

          {/* Bottom tab bar */}
          <div className="border-t bg-white flex shrink-0 z-10 safe-area-pb">
            <button
              onClick={() => setActiveMobileView('list')}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[9px] font-black uppercase tracking-widest transition-all ${activeMobileView === 'list' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <ListIcon size={20} />
              Lista
            </button>
            <button
              onClick={() => setActiveMobileView('map')}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[9px] font-black uppercase tracking-widest transition-all ${activeMobileView === 'map' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <MapIcon size={20} />
              Mapa
            </button>
            <button
              onClick={() => setIsTrashOpen(true)}
              className="flex-1 py-3 flex flex-col items-center gap-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all"
            >
              <Trash2 size={20} />
              Lixeira
            </button>
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
