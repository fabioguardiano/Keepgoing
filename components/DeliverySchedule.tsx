import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, Calendar, Plus, Search, Truck, ChevronRight, X, Navigation, Phone, Map as MapIcon, Building2, Info, History, Edit2, Trash2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Delivery, OrderService, DriverStatus } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';

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

interface DeliveryScheduleProps {
  orders: OrderService[];
  deliveries: Delivery[];
  onAddDelivery: (delivery: Omit<Delivery, 'id'>) => void;
  onUpdateDeliveryStatus: (id: string, status: Delivery['status']) => void;
  onUpdateDelivery: (id: string, updates: Partial<Delivery>) => void;
  onDeleteDelivery: (id: string) => void;
  onReorderDeliveries?: (deliveries: Delivery[]) => void;
  companyAddress: string;
  companyName: string;
  companyLogoUrl?: string;
  driverTrackingLocations?: Record<string, DriverStatus>;
}

export const DeliverySchedule: React.FC<DeliveryScheduleProps> = ({ 
  orders, 
  deliveries, 
  onAddDelivery, 
  onUpdateDeliveryStatus,
  onUpdateDelivery,
  onDeleteDelivery,
  onReorderDeliveries,
  companyAddress,
  companyName,
  companyLogoUrl,
  driverTrackingLocations = {}
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(deliveries.length > 0 ? deliveries[0].id : null);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const [roadPaths, setRoadPaths] = useState<Record<string, [number, number][]>>({});
  const [newDelivery, setNewDelivery] = useState({
    orderId: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    routeGroup: ''
  });
  const [driverLocation, setDriverLocation] = useState<DriverStatus | null>(null);
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
            ? `<img src="${companyLogoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`
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

  const createDriverIcon = () => {
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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-2.48-3.1a1 1 0 0 0-.78-.326H15"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
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
      if (coords[address]) return;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        if (data && data[0]) {
          setCoords(prev => ({ ...prev, [address]: [parseFloat(data[0].lat), parseFloat(data[0].lon)] }));
        }
      } catch (e) {
        console.error("Geocoding failed for", address, e);
      }
    };

    geocode(companyAddress);
    deliveries.forEach(d => geocode(d.address));
  }, [companyAddress, deliveries, coords]);

  // Routing effect (OSRM - Road paths) grouped by routeGroup
  useEffect(() => {
    const fetchRoutes = async () => {
      const groups = Array.from(new Set(deliveries.map(d => d.routeGroup || 'Manhã')));
      const newPaths: Record<string, [number, number][]> = {};

      for (const group of groups) {
        const groupDeliveries = deliveries.filter(d => (d.routeGroup || 'Manhã') === group);
        const positions: [number, number][] = [];
        
        if (coords[companyAddress]) positions.push(coords[companyAddress]);
        groupDeliveries.forEach(d => {
          if (coords[d.address]) positions.push(coords[d.address]);
        });
        
        // Add back to company (Round Trip)
        if (coords[companyAddress] && positions.length > 1) {
          positions.push(coords[companyAddress]);
        }

        if (positions.length < 2) {
          newPaths[group] = positions;
          continue;
        }

        try {
          const query = positions.map(pos => `${pos[1]},${pos[0]}`).join(';');
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson&steps=false`);
          const data = await response.json();
          
          if (data.routes && data.routes[0]) {
            newPaths[group] = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          } else {
            newPaths[group] = positions;
          }
        } catch (e) {
          console.error(`Routing failed for group ${group}`, e);
          newPaths[group] = positions;
        }
      }
      setRoadPaths(newPaths);
    };

    fetchRoutes();
  }, [coords, companyAddress, deliveries]);


  const filteredDeliveries = deliveries.filter(d => 
    d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.osNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDeliveryId) {
      onUpdateDelivery(editingDeliveryId, {
        orderId: newDelivery.orderId,
        address: newDelivery.address,
        date: newDelivery.date,
        time: newDelivery.time,
        routeGroup: newDelivery.routeGroup
      });
      setEditingDeliveryId(null);
    } else {
      const order = orders.find(o => o.id === newDelivery.orderId);
      if (!order) return;

      onAddDelivery({
        orderId: order.id,
        osNumber: order.osNumber,
        clientName: order.clientName,
        address: newDelivery.address,
        date: newDelivery.date,
        time: newDelivery.time,
        status: 'pendente',
        routeGroup: newDelivery.routeGroup
      });
    }
    
    setIsModalOpen(false);
    setNewDelivery({ orderId: '', address: '', date: new Date().toISOString().split('T')[0], time: '08:00', routeGroup: '' });
  };

  const handleEditClick = (delivery: Delivery) => {
    setEditingDeliveryId(delivery.id);
    setNewDelivery({
      orderId: delivery.orderId,
      address: delivery.address,
      date: delivery.date,
      time: delivery.time,
      routeGroup: delivery.routeGroup || ''
    });
    setIsModalOpen(true);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(236, 91, 19); // #ec5b13
    doc.text('KeepGoing CRM - Roteiro de Entregas', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data da Rota: ${today}`, 14, 30);
    doc.text(`Empresa: ${companyName}`, 14, 35);
    doc.text(`Ponto de Saída: ${companyAddress}`, 14, 40);

    const tableData = deliveries.map((d, i) => [
      i + 1,
      d.clientName,
      d.osNumber,
      d.address,
      d.time
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['#', 'Cliente', 'O.S.', 'Endereço de Entrega', 'Horário']],
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

    doc.save(`roteiro-entregas-${today.replace(/\//g, '-')}.pdf`);
  };

  const mapCenter = useMemo(() => {
    const target = selectedDeliveryId ? deliveries.find(d => d.id === selectedDeliveryId)?.address : companyAddress;
    return (coords[target || ''] || [-21.1767, -47.8208]) as [number, number];
  }, [selectedDeliveryId, companyAddress, coords, deliveries]);

  const routePositions = useMemo(() => {
    return Object.values(roadPaths).flat();
  }, [roadPaths]);

  // Driver Simulation Effect
  useEffect(() => {
    if (!isSimulating || routePositions.length === 0) {
      if (!isSimulating) setDriverLocation(null);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      const pos = routePositions[currentIndex];
      if (pos) {
        setDriverLocation({
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

  const moveDelivery = (id: string, direction: 'up' | 'down') => {
    if (!onReorderDeliveries) return;
    const index = deliveries.findIndex(d => d.id === id);
    if (index === -1) return;
    
    // Only reorder within the same route group for safety and simplicity
    const currentGroup = deliveries[index].routeGroup || 'Manhã';
    const groupDeliveries = deliveries.filter(d => (d.routeGroup || 'Manhã') === currentGroup);
    const indexInGroup = groupDeliveries.findIndex(d => d.id === id);
    
    if (direction === 'up' && indexInGroup > 0) {
      const targetId = groupDeliveries[indexInGroup - 1].id;
      const newDeliveries = [...deliveries];
      const targetIndex = newDeliveries.findIndex(d => d.id === targetId);
      const temp = newDeliveries[index];
      newDeliveries[index] = newDeliveries[targetIndex];
      newDeliveries[targetIndex] = temp;
      onReorderDeliveries(newDeliveries);
    } else if (direction === 'down' && indexInGroup < groupDeliveries.length - 1) {
      const targetId = groupDeliveries[indexInGroup + 1].id;
      const newDeliveries = [...deliveries];
      const targetIndex = newDeliveries.findIndex(d => d.id === targetId);
      const temp = newDeliveries[index];
      newDeliveries[index] = newDeliveries[targetIndex];
      newDeliveries[targetIndex] = temp;
      onReorderDeliveries(newDeliveries);
    }
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar - Delivery List */}
      <div className="w-96 border-r bg-white flex flex-col shrink-0">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Agenda de Entregas</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-[var(--secondary-color)] transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por O.S. ou Cliente..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Entregas do Dia</span>
            <span className="text-xs font-bold text-[var(--primary-color)] bg-orange-50 px-2 py-1 rounded-full">
              {deliveries.length} total
            </span>
          </div>
          
          {Array.from(new Set(filteredDeliveries.map(d => d.routeGroup || 'Sem Nome'))).map(group => (
            <div key={group || 'Sem Nome'} className="space-y-3">
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-lg">
                <Navigation size={14} className="text-gray-500" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">Rota: {group || 'Sem Nome'}</span>
              </div>
              {filteredDeliveries.filter(d => (d.routeGroup || 'Sem Nome') === group).map(delivery => (
                <div 
                  key={delivery.id} 
                  onClick={() => setSelectedDeliveryId(delivery.id)}
                  className={`p-4 rounded-2xl border transition-all group cursor-pointer shadow-sm ${selectedDeliveryId === delivery.id ? 'border-[var(--primary-color)] bg-orange-50/50' : 'border-gray-100 bg-white hover:border-[var(--primary-color)]/30 hover:bg-orange-50/20'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-[var(--primary-color)] transition-colors">{delivery.clientName}</h3>
                      <span className="text-xs font-bold text-gray-400">O.S. {delivery.osNumber}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditClick(delivery); }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar entrega"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('Excluir este agendamento?')) onDeleteDelivery(delivery.id); }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir entrega"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveDelivery(delivery.id, 'up'); }}
                        className="p-1 text-gray-400 hover:text-[var(--primary-color)] hover:bg-orange-50 rounded transition-colors"
                        title="Subir posição na rota"
                      >
                        <ChevronRight className="-rotate-90 w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveDelivery(delivery.id, 'down'); }}
                        className="p-1 text-gray-400 hover:text-[var(--primary-color)] hover:bg-orange-50 rounded transition-colors"
                        title="Descer posição na rota"
                      >
                        <ChevronRight className="rotate-90 w-4 h-4" />
                      </button>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                        delivery.status === 'entregue' ? 'bg-green-100 text-green-600' :
                        delivery.status === 'em_rota' ? 'bg-blue-100 text-blue-600' :
                        'bg-orange-100 text-[var(--primary-color)]'
                      }`}>
                        {delivery.status === 'pendente' ? 'Pendente' : delivery.status === 'em_rota' ? 'Em Rota' : 'Entregue'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="truncate">{delivery.address}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{new Date(delivery.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <span>{delivery.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {filteredDeliveries.length === 0 && (
            <div className="text-center py-10">
              <Truck className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-500 font-medium">Nenhuma entrega agendada</p>
              <p className="text-xs text-gray-400 mt-1">Clique no + para agendar uma nova entrega</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Map View */}
      <div className="flex-1 relative bg-gray-200">
        <div className="absolute inset-0 bg-[#f8f9fa] flex flex-col">
          <div className="p-4 bg-white/80 backdrop-blur-md border-b flex items-center justify-between z-[1000] absolute top-0 left-0 right-0">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border shadow-sm text-sm font-bold text-gray-700">
                 <Truck size={16} className="text-[var(--primary-color)]" /> Rota de hoje: {deliveries.length} paradas
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border shadow-sm text-sm font-bold text-gray-700">
                 <Navigation size={16} className="text-blue-500" /> Estimativa: 4h 20min
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100 shadow-sm text-[11px] font-black uppercase text-green-700">
                 <div className={`w-2 h-2 rounded-full ${Object.keys(driverTrackingLocations).length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                 {Object.keys(driverTrackingLocations).length} Motoristas Online (GPS)
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
                {isSimulating ? 'Para Rastreamento' : 'Rastrear Motorista (Simular)'}
              </button>
              <button 
                onClick={() => {
                  const destination = filteredDeliveries.length > 0 ? filteredDeliveries[filteredDeliveries.length - 1].address : '';
                  const waypoints = filteredDeliveries.slice(0, -1).map(d => d.address).join('/');
                  window.open(`https://www.google.com/maps/dir/${encodeURIComponent(companyAddress)}/${waypoints ? encodeURIComponent(waypoints) + '/' : ''}${encodeURIComponent(destination)}`, '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                <Navigation size={18} /> Ver Rota no Google Maps
              </button>
            </div>
          </div>
          
          {/* Leaflet Map Integration */}
          <div className="flex-1 relative z-0">


            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} />
              
              {/* Company Home Marker */}
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

              {/* Delivery Markers */}
              {deliveries.map((d, i) => (
                coords[d.address] && (
                  <Marker 
                    key={d.id} 
                    position={coords[d.address] as L.LatLngTuple} 
                    icon={createNumberedIcon(i + 1, d.id === selectedDeliveryId ? '#2563eb' : 'var(--primary-color)')}
                    eventHandlers={{ click: () => setSelectedDeliveryId(d.id) }}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-black text-[10px] uppercase text-gray-400 mb-1">Entrega {i + 1}</p>
                        <p className="font-bold text-sm text-gray-900">{d.clientName}</p>
                        <p className="text-[11px] font-bold text-[var(--primary-color)] mb-1">O.S. {d.osNumber}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{d.address}</p>
                        <div className="mt-2 text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                          <Clock size={10} /> {d.time}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* Route Lines by Group */}
              {Array.from(new Set(deliveries.map(d => d.routeGroup || 'Manhã'))).map((group, idx) => {
                const colors = ['var(--primary-color)', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
                const groupColor = colors[idx % colors.length];
                const groupDeliveries = deliveries.filter(d => (d.routeGroup || 'Manhã') === group);
                const positions: [number, number][] = [];
                
                if (coords[companyAddress]) positions.push(coords[companyAddress] as [number, number]);
                groupDeliveries.forEach(d => {
                  if (coords[d.address]) positions.push(coords[d.address] as [number, number]);
                });

                if (positions.length < 2) return null;

                return (
                  <Polyline 
                    key={group}
                    positions={roadPaths[group] as L.LatLngExpression[]} 
                    color={groupColor} 
                    weight={5} 
                    opacity={0.6}
                  />
                );
              })}

              {/* Driver Marker (Real-time tracking) */}
              {Object.entries(driverTrackingLocations).map(([name, location]) => (
                <Marker 
                  key={name}
                  position={[location.lat, location.lng]} 
                  icon={createDriverIcon()}
                >
                  <Popup>
                    <div className="p-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="font-black text-xs uppercase text-green-600">Motorista Online</p>
                      </div>
                      <p className="font-bold text-sm">{name}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Última atualização: {location.lastUpdate}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Driver Marker (Simulation) */}
              {driverLocation && !driverTrackingLocations[companyName] && (
                <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createDriverIcon()}>
                  <Popup>
                    <div className="p-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="font-black text-xs uppercase text-green-600">Simulação Ativa</p>
                      </div>
                      <p className="font-bold text-sm">Caminhão de Entrega</p>
                      <p className="text-[10px] text-gray-500 font-medium">Status: Simulado</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Legend / Overlay */}
            <div className="absolute bottom-6 left-6 space-y-2 z-[1000]">
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white flex flex-col gap-3 min-w-[280px] max-h-[400px] overflow-y-auto">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Legenda das Rotas</h4>
                  
                  {Array.from(new Set(deliveries.map(d => d.routeGroup || 'Manhã'))).map((group, groupIdx) => {
                    const colors = ['var(--primary-color)', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
                    const groupColor = colors[groupIdx % colors.length];
                    
                    return (
                      <div key={group} className="space-y-2 pb-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: groupColor }} />
                          <span className="text-[10px] font-black text-gray-500 uppercase">{group}</span>
                        </div>
                        
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 rounded-lg transition-all"
                          onClick={() => setSelectedDeliveryId(null)}
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

                        {deliveries.filter(d => (d.routeGroup || 'Manhã') === group).map((d, i) => (
                          <div 
                            key={d.id} 
                            className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 rounded-lg transition-all"
                            onClick={() => setSelectedDeliveryId(d.id)}
                          >
                            <div className={`w-8 h-8 ${d.id === selectedDeliveryId ? 'bg-blue-600' : ''} text-white rounded-lg flex items-center justify-center font-black text-xs shadow-lg`} style={{ backgroundColor: d.id === selectedDeliveryId ? '#2563eb' : groupColor }}>
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Entrega {i + 1}</p>
                              <p className="text-xs font-bold text-gray-800 line-clamp-1">{d.clientName}</p>
                              <p className="text-[10px] text-gray-500 font-medium line-clamp-1">{d.address}</p>
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

      {/* Add Delivery Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editingDeliveryId ? 'Editar Entrega' : 'Agendar Entrega'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingDeliveryId(null); setNewDelivery({ orderId: '', address: '', date: new Date().toISOString().split('T')[0], time: '08:00', routeGroup: '' }); }} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddDelivery} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Selecionar O.S.</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all outline-none"
                  value={newDelivery.orderId}
                  onChange={e => {
                    const order = orders.find(o => o.id === e.target.value);
                    setNewDelivery({
                      ...newDelivery, 
                      orderId: e.target.value,
                      // Pre-fill address if order found (optional, user preference)
                    });
                  }}
                  required
                  disabled={!!editingDeliveryId}
                >
                  <option value="">Selecione uma ordem de serviço...</option>
                  {/* If editing, allow the current order to be shown even if not in "A Entregar" anymore */}
                  {orders.filter(o => o.phase === 'A Entregar' || o.id === newDelivery.orderId).map(o => (
                    <option key={o.id} value={o.id}>{o.osNumber} - {o.clientName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Endereço de Entrega</label>
                <input 
                  type="text" 
                  placeholder="Rua, número, bairro..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all outline-none"
                  value={newDelivery.address}
                  onChange={e => setNewDelivery({...newDelivery, address: e.target.value})}
                  required
                />
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Identificação da Rota</label>
                  <input 
                    type="text"
                    placeholder="Ex: Rota 1, Manhã, Expressa..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all outline-none"
                    value={newDelivery.routeGroup}
                    onChange={e => setNewDelivery({...newDelivery, routeGroup: e.target.value})}
                    required
                  />
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all outline-none"
                    value={newDelivery.date}
                    onChange={e => setNewDelivery({...newDelivery, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Horário Estimado</label>
                  <input 
                    type="time" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all outline-none"
                    value={newDelivery.time}
                    onChange={e => setNewDelivery({...newDelivery, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[var(--primary-color)] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[var(--primary-color)]/20 hover:bg-[var(--secondary-color)] transition-all transform hover:scale-[1.02] active:scale-95 mt-4"
              >
                {editingDeliveryId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
