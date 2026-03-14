import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, Calendar, Plus, Search, ChevronRight, X, Navigation, Phone, Map as MapIcon, Building2, Info, History, Edit2, Trash2, Ruler, FileDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Measurement, OrderService, DriverStatus } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Fix Leaflet marker icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map view reset
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

interface MeasurementScheduleProps {
  orders: OrderService[];
  measurements: Measurement[];
  onAddMeasurement: (measurement: Omit<Measurement, 'id'>) => void;
  onUpdateMeasurementStatus: (id: string, status: Measurement['status']) => void;
  onUpdateMeasurement: (id: string, updates: Partial<Measurement>) => void;
  onDeleteMeasurement: (id: string) => void;
  onReorderMeasurements?: (measurements: Measurement[]) => void;
  companyAddress: string;
  companyName: string;
  companyLogoUrl?: string;
}

export const MeasurementSchedule: React.FC<MeasurementScheduleProps> = ({ 
  orders, 
  measurements = [], 
  onAddMeasurement, 
  onUpdateMeasurementStatus,
  onUpdateMeasurement,
  onDeleteMeasurement,
  onReorderMeasurements,
  companyAddress,
  companyName,
  companyLogoUrl
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(measurements.length > 0 ? measurements[0].id : null);
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const [roadPaths, setRoadPaths] = useState<Record<string, [number, number][]>>({});
  const [newMeasurement, setNewMeasurement] = useState({
    orderId: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    routeGroup: ''
  });
  const [staffLocation, setStaffLocation] = useState<DriverStatus | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const createCompanyIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background-color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 2px solid white;
          overflow: hidden;
        ">
          ${companyLogoUrl 
            ? '<img src="' + companyLogoUrl + '" style="width: 100%; height: 100%; object-fit: cover;" />'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'
          }
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  const createNumberedIcon = (number: number, color: string) => {
    return L.divIcon({
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background-color: ${color};
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border: 2px solid white;
        ">
          ${number}
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createStaffIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          width: 44px;
          height: 44px;
          background-color: #2563eb;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.5);
          border: 3px solid white;
          animation: pulse 2s infinite;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(37, 99, 235, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
          }
        </style>
      `,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  };

  // Geocoding effect
  useEffect(() => {
    const geocode = async (address: string) => {
      if (!address || coords[address]) return;
      try {
        const response = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address));
        const data = await response.json();
        if (data && data[0]) {
          setCoords(prev => ({ ...prev, [address]: [parseFloat(data[0].lat), parseFloat(data[0].lon)] }));
        }
      } catch (e) {
        console.error("Geocoding failed for", address, e);
      }
    };

    if (companyAddress) geocode(companyAddress);
    measurements.forEach(m => geocode(m.address));
  }, [companyAddress, measurements, coords]);

  // Routing effect
  useEffect(() => {
    const fetchRoutes = async () => {
      const groups = Array.from(new Set(measurements.map(m => m.routeGroup || 'Manhã')));
      const newPaths: Record<string, [number, number][]> = {};

      for (const group of groups) {
        const groupMeasurements = measurements.filter(m => (m.routeGroup || 'Manhã') === group);
        const positions: [number, number][] = [];
        
        if (coords[companyAddress]) positions.push(coords[companyAddress]);
        groupMeasurements.forEach(m => {
          if (coords[m.address]) positions.push(coords[m.address]);
        });
        
        if (coords[companyAddress] && positions.length > 1) {
          positions.push(coords[companyAddress]);
        }

        if (positions.length < 2) {
          newPaths[group] = positions;
          continue;
        }

        try {
          const query = positions.map(pos => pos[1] + ',' + pos[0]).join(';');
          const response = await fetch('https://router.project-osrm.org/route/v1/driving/' + query + '?overview=full&geometries=geojson&steps=false');
          const data = await response.json();
          
          if (data.routes && data.routes[0]) {
            newPaths[group] = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          } else {
            newPaths[group] = positions;
          }
        } catch (e) {
          console.error('Routing failed for group ' + group, e);
          newPaths[group] = positions;
        }
      }
      setRoadPaths(newPaths);
    };

    if (Object.keys(coords).length > 0) fetchRoutes();
  }, [coords, companyAddress, measurements]);

  const filteredMeasurements = measurements.filter(m => 
    m.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.osNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMeasurementId) {
      onUpdateMeasurement(editingMeasurementId, {
        orderId: newMeasurement.orderId,
        address: newMeasurement.address,
        date: newMeasurement.date,
        time: newMeasurement.time,
        routeGroup: newMeasurement.routeGroup
      });
      setEditingMeasurementId(null);
    } else {
      const order = orders.find(o => o.id === newMeasurement.orderId);
      if (!order) return;

      onAddMeasurement({
        orderId: order.id,
        osNumber: order.osNumber,
        clientName: order.clientName,
        address: newMeasurement.address,
        date: newMeasurement.date,
        time: newMeasurement.time,
        status: 'pendente',
        routeGroup: newMeasurement.routeGroup
      });
    }
    
    setIsModalOpen(false);
    setNewMeasurement({ orderId: '', address: '', date: new Date().toISOString().split('T')[0], time: '08:00', routeGroup: '' });
  };

  const handleEditClick = (measurement: Measurement) => {
    setEditingMeasurementId(measurement.id);
    setNewMeasurement({
      orderId: measurement.orderId,
      address: measurement.address,
      date: measurement.date,
      time: measurement.time,
      routeGroup: measurement.routeGroup || ''
    });
    setIsModalOpen(true);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(20);
    doc.setTextColor(236, 91, 19);
    doc.text('KeepGoing CRM - Roteiro de Medições', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Data da Rota: ' + today, 14, 30);
    doc.text('Empresa: ' + companyName, 14, 35);
    doc.text('Ponto de Saída: ' + companyAddress, 14, 40);

    const tableData = measurements.map((m, i) => [
      i + 1,
      m.clientName,
      m.osNumber,
      m.address,
      m.time
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['#', 'Cliente', 'O.S.', 'Endereço de Medição', 'Horário']],
      body: tableData,
      headStyles: { fillColor: [236, 91, 19] },
      margin: { top: 50 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 25 }
      }
    });

    const filename = 'roteiro-medicoes-' + today.replace(/\//g, '-') + '.pdf';
    doc.save(filename);
  };

  const mapCenter = useMemo(() => {
    const target = selectedMeasurementId ? measurements.find(m => m.id === selectedMeasurementId)?.address : companyAddress;
    const center = (coords[target || ''] || [-21.1767, -47.8208]) as [number, number];
    return center;
  }, [selectedMeasurementId, companyAddress, coords, measurements]);

  const routePositions = useMemo(() => {
    return Object.values(roadPaths).flat();
  }, [roadPaths]);

  useEffect(() => {
    if (!isSimulating || routePositions.length === 0) {
      if (!isSimulating) setStaffLocation(null);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      const pos = routePositions[currentIndex];
      if (pos) {
        setStaffLocation({
          lat: pos[0],
          lng: pos[1],
          lastUpdate: new Date().toLocaleTimeString('pt-BR'),
          isOnline: true
        });
      }

      currentIndex = (currentIndex + 1) % routePositions.length;
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, routePositions]);

  const moveMeasurement = (id: string, direction: 'up' | 'down') => {
    if (!onReorderMeasurements) return;
    const index = measurements.findIndex(m => m.id === id);
    if (index === -1) return;
    
    const currentGroup = measurements[index].routeGroup || 'Manhã';
    const groupMeasurements = measurements.filter(m => (m.routeGroup || 'Manhã') === currentGroup);
    const indexInGroup = groupMeasurements.findIndex(m => m.id === id);
    
    if (direction === 'up' && indexInGroup > 0) {
      const targetId = groupMeasurements[indexInGroup - 1].id;
      const newMeasurements = [...measurements];
      const targetIndex = newMeasurements.findIndex(m => m.id === targetId);
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[targetIndex];
      newMeasurements[targetIndex] = temp;
      onReorderMeasurements(newMeasurements);
    } else if (direction === 'down' && indexInGroup < groupMeasurements.length - 1) {
      const targetId = groupMeasurements[indexInGroup + 1].id;
      const newMeasurements = [...measurements];
      const targetIndex = newMeasurements.findIndex(m => m.id === targetId);
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[targetIndex];
      newMeasurements[targetIndex] = temp;
      onReorderMeasurements(newMeasurements);
    }
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden font-sans">
      <div className="w-96 border-r bg-white flex flex-col shrink-0">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Agenda de Medições</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-[#ec5b13] text-white rounded-lg hover:bg-[#d84a0d] transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por O.S. ou Cliente..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#ec5b13]/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Medições do Dia</span>
            <span className="text-xs font-bold text-[#ec5b13] bg-orange-50 px-2 py-1 rounded-full">
              {measurements.length} total
            </span>
          </div>
          
          {Array.from(new Set(filteredMeasurements.map(m => m.routeGroup || 'Sem Nome'))).map(group => (
            <div key={group || 'Sem Nome'} className="space-y-3">
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-lg">
                <Navigation size={14} className="text-gray-500" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">Rota: {group || 'Sem Nome'}</span>
              </div>
              {filteredMeasurements.filter(m => (m.routeGroup || 'Sem Nome') === group).map(measurement => (
                <div 
                  key={measurement.id} 
                  onClick={() => setSelectedMeasurementId(measurement.id)}
                  className={`p-4 rounded-2xl border transition-all group cursor-pointer shadow-sm ${selectedMeasurementId === measurement.id ? 'border-[#ec5b13] bg-orange-50/50' : 'border-gray-100 bg-white hover:border-[#ec5b13]/30 hover:bg-orange-50/20'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-[#ec5b13] transition-colors">{measurement.clientName}</h3>
                      <span className="text-xs font-bold text-gray-400">O.S. {measurement.osNumber}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditClick(measurement); }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar medição"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('Excluir este agendamento?')) onDeleteMeasurement(measurement.id); }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir medição"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveMeasurement(measurement.id, 'up'); }}
                        className="p-1 text-gray-400 hover:text-[#ec5b13] hover:bg-orange-50 rounded transition-colors"
                        title="Subir posição na rota"
                      >
                        <ChevronRight className="-rotate-90 w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveMeasurement(measurement.id, 'down'); }}
                        className="p-1 text-gray-400 hover:text-[#ec5b13] hover:bg-orange-50 rounded transition-colors"
                        title="Descer posição na rota"
                      >
                        <ChevronRight className="rotate-90 w-4 h-4" />
                      </button>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                        measurement.status === 'entregue' ? 'bg-green-100 text-green-600' :
                        measurement.status === 'em_rota' ? 'bg-blue-100 text-blue-600' :
                        'bg-orange-100 text-[#ec5b13]'
                      }`}>
                        {measurement.status === 'pendente' ? 'Pendente' : measurement.status === 'em_rota' ? 'Em Rota' : 'Realizada'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="truncate">{measurement.address}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{new Date(measurement.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <span>{measurement.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {filteredMeasurements.length === 0 && (
            <div className="text-center py-10">
              <Ruler className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-500 font-medium">Nenhuma medição agendada</p>
              <p className="text-xs text-gray-400 mt-1">Clique no + para agendar uma nova medição</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative bg-gray-200">
        <div className="absolute inset-0 bg-[#f8f9fa] flex flex-col">
          <div className="p-4 bg-white/80 backdrop-blur-md border-b flex items-center justify-between z-[1000] absolute top-0 left-0 right-0">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border shadow-sm text-sm font-bold text-gray-700">
                 <Ruler size={16} className="text-[#ec5b13]" /> Rota de hoje: {measurements.length} paradas
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border shadow-sm text-sm font-bold text-gray-700">
                 <Navigation size={16} className="text-blue-500" /> Estimativa: 3h 45min
               </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all"
              >
                <FileDown size={18} /> PDF da Rota
              </button>
              <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all ${isSimulating ? 'bg-red-500 text-white animate-pulse' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-white' : 'bg-green-300'}`} />
                {isSimulating ? 'Parar Rastreamento' : 'Rastrear Medidor (Simular)'}
              </button>
              <button 
                onClick={() => {
                  const destination = filteredMeasurements.length > 0 ? filteredMeasurements[filteredMeasurements.length - 1].address : '';
                  const waypoints = filteredMeasurements.slice(0, -1).map(m => m.address).join('/');
                  window.open('https://www.google.com/maps/dir/' + encodeURIComponent(companyAddress) + '/' + (waypoints ? encodeURIComponent(waypoints) + '/' : '') + encodeURIComponent(destination), '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                <Navigation size={18} /> Ver Rota no Google Maps
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
              
              {coords[companyAddress] && (
                <Marker position={coords[companyAddress] as L.LatLngTuple} icon={createCompanyIcon()}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-black text-xs uppercase text-gray-400 mb-1">Ponto de Saída</p>
                      <p className="font-bold text-sm">{companyName}</p>
                      <p className="text-xs text-gray-500">{companyAddress}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {measurements.map((m, i) => (
                coords[m.address] && (
                  <Marker 
                    key={m.id} 
                    position={coords[m.address] as L.LatLngTuple} 
                    icon={createNumberedIcon(i + 1, m.id === selectedMeasurementId ? '#2563eb' : '#ec5b13')}
                    eventHandlers={{ click: () => setSelectedMeasurementId(m.id) }}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-black text-[10px] uppercase text-gray-400 mb-1">Medição {i + 1}</p>
                        <p className="font-bold text-sm text-gray-900">{m.clientName}</p>
                        <p className="text-[11px] font-bold text-[#ec5b13] mb-1">O.S. {m.osNumber}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{m.address}</p>
                        <div className="mt-2 text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                          <Clock size={10} /> {m.time}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {Array.from(new Set(measurements.map(m => m.routeGroup || 'Manhã'))).map((group, idx) => {
                const colors = ['#ec5b13', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
                const groupColor = colors[idx % colors.length];
                
                if (roadPaths[group]) {
                  return (
                    <Polyline 
                      key={group}
                      positions={roadPaths[group] as L.LatLngExpression[]} 
                      color={groupColor} 
                      weight={5} 
                      opacity={0.6}
                    />
                  );
                }
                return null;
              })}

              {staffLocation && (
                <Marker position={[staffLocation.lat, staffLocation.lng]} icon={createStaffIcon()}>
                  <Popup>
                    <div className="p-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="font-black text-xs uppercase text-green-600">Medidor Online</p>
                      </div>
                      <p className="font-bold text-sm">Equipe de Medição</p>
                      <p className="text-[10px] text-gray-500 font-medium">Última atualização: {staffLocation.lastUpdate}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
            
            <div className="absolute bottom-6 left-6 space-y-2 z-[1000]">
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white flex flex-col gap-3 min-w-[280px] max-h-[400px] overflow-y-auto">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Legenda das Rotas</h4>
                  
                  {Array.from(new Set(measurements.map(m => m.routeGroup || 'Manhã'))).map((group, groupIdx) => {
                    const colors = ['#ec5b13', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
                    const groupColor = colors[groupIdx % colors.length];
                    
                    return (
                      <div key={group} className="space-y-2 pb-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: groupColor }} />
                          <span className="text-[10px] font-black text-gray-500 uppercase">{group}</span>
                        </div>
                        
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 rounded-lg transition-all"
                          onClick={() => setSelectedMeasurementId(null)}
                        >
                          <div className="w-8 h-8 bg-white border border-gray-200 text-gray-400 rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
                            {companyLogoUrl ? (
                              <img src={companyLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 size={16} />
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Saída (Sede)</p>
                            <p className="text-xs font-bold text-gray-800 line-clamp-1">{companyAddress}</p>
                          </div>
                        </div>

                        {measurements.filter(m => (m.routeGroup || 'Manhã') === group).map((m, i) => (
                          <div 
                            key={m.id} 
                            className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 rounded-lg transition-all"
                            onClick={() => setSelectedMeasurementId(m.id)}
                          >
                            <div className={`w-8 h-8 ${m.id === selectedMeasurementId ? 'bg-blue-600' : ''} text-white rounded-lg flex items-center justify-center font-black text-xs shadow-lg`} style={{ backgroundColor: m.id === selectedMeasurementId ? '#2563eb' : groupColor }}>
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Medição {i + 1}</p>
                              <p className="text-xs font-bold text-gray-800 line-clamp-1">{m.clientName}</p>
                              <p className="text-[10px] text-gray-500 font-medium line-clamp-1">{m.address}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editingMeasurementId ? 'Editar Medição' : 'Agendar Medição'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingMeasurementId(null); setNewMeasurement({ orderId: '', address: '', date: new Date().toISOString().split('T')[0], time: '08:00', routeGroup: '' }); }} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddMeasurement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Selecionar O.S.</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[#ec5b13]/20 transition-all outline-none"
                  value={newMeasurement.orderId}
                  onChange={e => {
                    const order = orders.find(o => o.id === e.target.value);
                    if (order) {
                      setNewMeasurement({
                        ...newMeasurement, 
                        orderId: e.target.value,
                        address: order.installationAddress || ''
                      });
                    } else {
                      setNewMeasurement({
                        ...newMeasurement, 
                        orderId: e.target.value,
                      });
                    }
                  }}
                  required
                  disabled={!!editingMeasurementId}
                >
                  <option value="">Selecione uma ordem de serviço...</option>
                  {orders.filter(o => o.phase === 'Medição' || o.id === newMeasurement.orderId).map(o => (
                    <option key={o.id} value={o.id}>{o.osNumber} - {o.clientName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Endereço de Medição</label>
                <input 
                  type="text" 
                  placeholder="Rua, número, bairro..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[#ec5b13]/20 transition-all outline-none"
                  value={newMeasurement.address}
                  onChange={e => setNewMeasurement({...newMeasurement, address: e.target.value})}
                  required
                />
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Identificação da Rota</label>
                  <input 
                    type="text"
                    placeholder="Ex: Rota 1, Manhã, Expressa..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[#ec5b13]/20 transition-all outline-none"
                    value={newMeasurement.routeGroup}
                    onChange={e => setNewMeasurement({...newMeasurement, routeGroup: e.target.value})}
                    required
                  />
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[#ec5b13]/20 transition-all outline-none"
                    value={newMeasurement.date}
                    onChange={e => setNewMeasurement({...newMeasurement, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Horário Estimado</label>
                  <input 
                    type="time" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[#ec5b13]/20 transition-all outline-none"
                    value={newMeasurement.time}
                    onChange={e => setNewMeasurement({...newMeasurement, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#ec5b13] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d84a0d] transition-all transform hover:scale-[1.02] active:scale-95 mt-4"
              >
                {editingMeasurementId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
