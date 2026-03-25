import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Calendar as CalendarIcon, MapPin, Navigation, 
  Trash2, Edit2, X, CheckCircle2, Clock, Info, User as UserIcon,
  ChevronLeft, ChevronRight, Filter, AlertCircle, Phone, Truck, Building2, Map as MapIcon, List as ListIcon, FileDown
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Measurement, WorkOrder, DriverStatus, CompanyInfo } from '../types';

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
  companyLogoUrl
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
    date: selectedDate,
    time: '08:00',
    description: '',
    measurerName: '',
    status: 'Pendente' as Measurement['status'],
    osId: '',
    osNumber: ''
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([-21.1767, -47.8208]); // Ribeirão Preto default
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});

  // Geocodificação básica para demonstração (na vida real usaria Google Maps / Nominatim API)
  useEffect(() => {
    const addresses = [
      ...measurements.map(m => m.address),
      companyAddress
    ];
    
    const newCoords: Record<string, [number, number]> = {};
    addresses.forEach((addr, idx) => {
      // Simulação: gera coordenadas próximas a Ribeirão Preto baseadas no hash do endereço
      const hash = addr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const latOffset = (hash % 100) / 1000;
      const lngOffset = ((hash * 7) % 100) / 1000;
      newCoords[addr] = [-21.1767 + latOffset, -47.8208 + lngOffset];
    });
    setCoords(newCoords);
  }, [measurements, companyAddress]);

  // Filtrar medições pela data selecionada e termo de busca
  const filteredMeasurements = measurements.filter(m => {
    const matchesDate = m.date === selectedDate;
    const matchesSearch = m.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.osNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

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
        clientName: '',
        address: '',
        date: selectedDate,
        time: '08:00',
        description: '',
        measurerName: '',
        status: 'Pendente',
        osId: '',
        osNumber: ''
      });
    } catch (error) {
      console.error('Erro ao salvar medição:', error);
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
      osNumber: m.osNumber || ''
    });
    setIsModalOpen(true);
  };

  const createNumberedIcon = (number: number, color: string) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); transform: translateY(-50%);">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 0]
  });

  const createCompanyIcon = () => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #1f2937; color: white; border: 2px solid white; border-radius: 8px; width: 34px; height: 34px; display: flex; items: center; justify-content: center; font-weight: bold; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); transform: translateY(-50%);">
            ${companyLogoUrl ? `<img src="${companyLogoUrl}" style="width: 24px; height: 24px; border-radius: 4px; object-cover" />` : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M16 18h.01"/></svg>'}
           </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 0]
  });

  const createMeasurerIcon = () => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #10b981; color: white; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 0 15px rgba(16, 185, 129, 0.5); border: 3px solid white; animation: pulse 2s infinite; transform: translateY(-50%);">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 0]
  });

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gray-50 overflow-hidden font-sans relative">
      {/* Mobile Nav Switcher */}
      <div className="lg:hidden flex border-b bg-white relative z-[1001]">
        <button 
          onClick={() => setActiveMobileView('list')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeMobileView === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
        >
          Lista de Medições
        </button>
        <button 
          onClick={() => setActiveMobileView('map')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeMobileView === 'map' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
        >
          Mapa / Rota
        </button>
      </div>

      {/* Sidebar - Measurement List */}
      <div className={`${activeMobileView === 'list' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 border-r bg-white flex-col shrink-0 overflow-y-auto`}>
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Agenda de Medição</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-[var(--secondary-color)] transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Date Picker (Small Calendar Context) */}
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl">
             <CalendarIcon size={18} className="text-gray-400 shrink-0" />
             <input 
               type="date"
               className="bg-transparent border-none text-sm font-bold text-gray-700 w-full focus:ring-0 outline-none"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
             />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente, endereço ou O.S..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agendados para Hoje</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              {filteredMeasurements.length} medições
            </span>
          </div>
          
          {filteredMeasurements.length === 0 ? (
            <div className="text-center py-12 px-6">
              <CalendarIcon className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-500 font-medium">Nenhuma medição para esta data</p>
              <p className="text-xs text-gray-400 mt-1">Clique no + para agendar uma nova medição</p>
            </div>
          ) : (
            filteredMeasurements.map((m, i) => (
              <div 
                key={m.id} 
                className={`p-4 rounded-2xl border transition-all group cursor-pointer shadow-sm ${selectedMeasurementId === m.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 bg-white hover:border-blue-300'}`}
                onClick={() => {
                  setSelectedMeasurementId(m.id);
                  if (coords[m.address]) setMapCenter(coords[m.address]);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-md">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{m.clientName}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-600">{m.time}</span>
                        {m.osNumber && <span className="text-[10px] font-bold text-gray-400">O.S. {m.osNumber}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(m); }} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir esta medição?')) onDeleteMeasurement(m.id); }} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <p className="line-clamp-2">{m.address}</p>
                </div>
                {m.measurerName && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserIcon size={12} className="text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Medidor: {m.measurerName}</span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        m.status === 'Concluída' ? 'bg-green-100 text-green-700' : 
                        m.status === 'Cancelada' ? 'bg-red-100 text-red-700' : 
                        'bg-blue-100 text-blue-700'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Map View */}
      <div className={`${activeMobileView === 'map' ? 'flex' : 'hidden'} lg:flex flex-1 relative bg-gray-200 min-h-[400px]`}>
        <div className="absolute inset-0 bg-[#f8f9fa] flex flex-col">
          <div className="p-3 lg:p-4 bg-white/80 backdrop-blur-md border-b flex flex-col sm:flex-row items-center justify-between gap-3 z-[1000] absolute top-0 left-0 right-0">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border shadow-sm text-sm font-bold text-gray-700">
                 <CalendarIcon size={16} className="text-blue-600" /> {new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100 shadow-sm text-[11px] font-black uppercase text-green-700">
                 <div className={`w-2 h-2 rounded-full ${Object.keys(driverTrackingLocations).length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                 {Object.keys(driverTrackingLocations).length} Medidores Online (GPS)
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button 
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
                  onClick={() => alert('Download do roteiro de medição iniciado...')}
                >
                  <FileDown size={18} /> Baixar Roteiro
               </button>
               <button 
                onClick={() => {
                   const destination = filteredMeasurements.length > 0 ? filteredMeasurements[filteredMeasurements.length - 1].address : '';
                   const waypoints = filteredMeasurements.slice(0, -1).map(m => m.address).join('/');
                   window.open(`https://www.google.com/maps/dir/${encodeURIComponent(companyAddress)}/${waypoints ? encodeURIComponent(waypoints) + '/' : ''}${encodeURIComponent(destination)}`, '_blank');
                 }}
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
               >
                 <Navigation size={18} /> Rota no Maps
               </button>
            </div>
          </div>
          
          <div className="flex-1 relative z-0">
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
                      <p className="font-black text-xs uppercase text-gray-400 mb-1">Sede / Ponto de Saída</p>
                      <p className="font-bold text-sm">{companyName}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Measurement Markers */}
              {filteredMeasurements.map((m, i) => (
                coords[m.address] && !isNaN(coords[m.address][0]) && (
                  <Marker 
                    key={m.id} 
                    position={coords[m.address] as L.LatLngTuple} 
                    icon={createNumberedIcon(i + 1, '#2563eb')}
                    eventHandlers={{ click: () => setSelectedMeasurementId(m.id) }}
                  >
                    <Popup>
                      <div className="p-1 min-w-[150px]">
                        <p className="font-black text-[10px] uppercase text-gray-400 mb-1">Medição {i + 1}</p>
                        <p className="font-bold text-sm text-gray-900">{m.clientName}</p>
                        <p className="text-xs text-blue-600 font-bold mb-1">{m.time}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-2">{m.address}</p>
                        {m.description && <p className="mt-2 text-[10px] bg-gray-50 p-1.5 rounded italic opacity-70">"{m.description}"</p>}
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* Route Path Line */}
              {filteredMeasurements.length > 0 && (
                <Polyline 
                  positions={[
                    coords[companyAddress] as [number, number],
                    ...filteredMeasurements.filter(m => coords[m.address]).map(m => coords[m.address] as [number, number])
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
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="font-black text-xs uppercase text-green-600">Medidor Online</p>
                      </div>
                      <p className="font-bold text-sm">{name}</p>
                      <p className="text-[10px] text-gray-500 font-medium tracking-tight">Visto às: {location.lastUpdate}</p>
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
                  setNewMeasurement({ clientName: '', address: '', date: selectedDate, time: '08:00', description: '', measurerName: '', status: 'Pendente', osId: '', osNumber: '' }); 
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
                    onChange={e => setNewMeasurement({...newMeasurement, clientName: e.target.value})}
                    placeholder="Nome completo ou empresa"
                    required
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Endereço da Medição</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.address}
                    onChange={e => setNewMeasurement({...newMeasurement, address: e.target.value})}
                    placeholder="Logradouro, número, bairro e cidade"
                    required
                  />
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
                        clientName: order?.clientName || newMeasurement.clientName
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
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newMeasurement.measurerName}
                    onChange={e => setNewMeasurement({...newMeasurement, measurerName: e.target.value})}
                    placeholder="Nome do medidor"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Instruções / Observações</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none h-24"
                    value={newMeasurement.description}
                    onChange={e => setNewMeasurement({...newMeasurement, description: e.target.value})}
                    placeholder="Detalhes sobre a medição, pontos de atenção, etc..."
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
