import React, { useState, useEffect } from 'react';
import { X, UserCheck, MapPin, Phone, Mail, Globe, ShieldCheck, Briefcase, MessageSquare, Plus } from 'lucide-react';
import { Architect } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

interface NewArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (architect: Architect) => void;
  editingArchitect: Architect | null;
  architects?: Architect[];
}

export const NewArchitectModal: React.FC<NewArchitectModalProps> = ({ isOpen, onClose, onSave, editingArchitect, architects = [] }) => {
  const [formData, setFormData] = useState<Omit<Architect, 'id' | 'createdAt'>>({
    type: 'Pessoa Jurídica',
    document: '',
    legalName: '',
    tradingName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    },
    observations: ''
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'endereco' | 'extras'>('geral');
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (editingArchitect) {
      const { id, createdAt, ...rest } = editingArchitect;
      setFormData(rest);
    } else {
      const codes = architects
        .map(arch => typeof arch.code === 'number' ? arch.code : parseInt(String(arch.code).replace(/\D/g, '')))
        .filter(n => !isNaN(n));
      const nextCode = codes.length > 0 ? Math.max(...codes) + 1 : 1;

      setFormData({
        type: 'Pessoa Jurídica',
        document: '',
        legalName: '',
        tradingName: '',
        email: '',
        phone: '',
        address: {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: ''
        },
        observations: '',
        code: nextCode
      });
    }
  }, [editingArchitect, isOpen, architects]);

  const geocodeAddress = async (street: string, number: string, city: string, state: string) => {
    if (!city || !street) return;
    setIsGeocoding(true);
    try {
      const query = `${street}, ${number}, ${city}, ${state}, Brasil`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data[0]) {
        setFormData(prev => ({
          ...prev,
          address: { ...prev.address, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const fetchAddressByCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
          zipCode: cleanCEP
        }
      }));
      
      // Proactive geocoding immediately after CEP lookup
      geocodeAddress(data.logradouro, '', data.localidade, data.uf);
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLoadingCEP(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: editingArchitect?.id || crypto.randomUUID(),
      createdAt: editingArchitect?.createdAt || new Date().toISOString()
    });
    onClose();
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 font-medium text-slate-700 transition-all disabled:opacity-50";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-2";

  const mapCenter: [number, number] = (formData.address.lat && formData.address.lng) 
    ? [formData.address.lat, formData.address.lng] 
    : [-23.5505, -46.6333];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="bg-[var(--primary-color)] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">{editingArchitect ? 'Editar Arquiteto' : 'Novo Arquiteto'}</h2>
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Gestão de Parceiros Técnicos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="px-8 flex gap-8 border-b border-slate-100 overflow-x-auto scrollbar-hide">
          {[
            { id: 'geral', label: 'Cadastro', icon: UserCheck },
            { id: 'endereco', label: 'Localização', icon: MapPin },
            { id: 'extras', label: 'Contatos / Obs', icon: MessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'geral' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 max-w-sm">
                {(['Pessoa Jurídica', 'Pessoa Física'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, type})}
                    className={`py-2 px-4 rounded-xl text-sm font-black transition-all ${
                      formData.type === type ? 'bg-white text-[var(--primary-color)] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}><ShieldCheck size={14} /> Código</label>
                  <input 
                    readOnly
                    className={`${inputClass} bg-slate-100 text-slate-400 cursor-not-allowed`}
                    value={formData.code || ''}
                    placeholder="Auto-gerado"
                  />
                </div>
                <div>
                  <label className={labelClass}>{formData.type === 'Pessoa Jurídica' ? 'CNPJ' : 'CPF'}</label>
                  <input 
                    required
                    className={inputClass}
                    placeholder={formData.type === 'Pessoa Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'}
                    value={formData.document}
                    onChange={e => setFormData({...formData, document: e.target.value})}
                  />
                </div>
                <div>
                  <label className={labelClass}>{formData.type === 'Pessoa Jurídica' ? 'IE / CCM' : 'RG'}</label>
                  <input 
                    className={inputClass}
                    value={formData.rgInsc || ''}
                    onChange={e => setFormData({...formData, rgInsc: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Escritório / Fantasia</label>
                  <input 
                    required
                    className={inputClass}
                    value={formData.tradingName}
                    onChange={e => setFormData({...formData, tradingName: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Profissional / Razão Social</label>
                  <input 
                    required
                    className={inputClass}
                    value={formData.legalName}
                    onChange={e => setFormData({...formData, legalName: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 min-w-[140px]">
                    <label className={labelClass}>CEP {isLoadingCEP && <span className="text-[var(--primary-color)] animate-pulse lowercase font-normal">(Busca...)</span>}</label>
                    <input 
                      required
                      className={inputClass}
                      placeholder="00000-000"
                      maxLength={9}
                      value={formData.address.zipCode}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 5) {
                          val = `${val.slice(0, 5)}-${val.slice(5, 8)}`;
                        }
                        setFormData({...formData, address: {...formData.address, zipCode: val}});
                        if (val.replace(/\D/g, '').length === 8) {
                          fetchAddressByCEP(val);
                        }
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Endereço Comercial</label>
                    <input 
                      required
                      className={inputClass}
                      value={formData.address.street}
                      onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                      onBlur={() => geocodeAddress(formData.address.street, formData.address.number || '', formData.address.city, formData.address.state)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Número</label>
                    <input 
                      className={inputClass}
                      value={formData.address.number || ''}
                      onChange={e => setFormData({...formData, address: {...formData.address, number: e.target.value}})}
                      onBlur={() => geocodeAddress(formData.address.street, formData.address.number || '', formData.address.city, formData.address.state)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Complemento</label>
                    <input 
                      className={inputClass}
                      placeholder="Ex: Sala 10..."
                      value={formData.address.complement || ''}
                      onChange={e => setFormData({...formData, address: {...formData.address, complement: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Bairro</label>
                    <input 
                      required
                      className={inputClass}
                      value={formData.address.neighborhood}
                      onChange={e => setFormData({...formData, address: {...formData.address, neighborhood: e.target.value}})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Cidade</label>
                    <input 
                      required
                      className={inputClass}
                      value={formData.address.city}
                      onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>UF</label>
                    <input 
                      required
                      maxLength={2}
                      className={inputClass}
                      value={formData.address.state}
                      onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value.toUpperCase()}})}
                    />
                  </div>
                </div>

                <div className="h-[350px] rounded-[24px] overflow-hidden border border-slate-200 shadow-inner relative bg-slate-100">
                  {isGeocoding && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center">
                      <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
                        <div className="w-5 h-5 border-2 border-[var(--primary-color)] border-t-transparent animate-spin rounded-full" />
                        <span className="text-xs font-bold text-slate-600 tracking-tight uppercase">Mapeando...</span>
                      </div>
                    </div>
                  )}
                  <MapContainer center={mapCenter} zoom={18} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapController center={mapCenter} />
                    {formData.address.lat && formData.address.lng && (
                      <Marker position={[formData.address.lat, formData.address.lng]}>
                        <Popup>
                          <div className="text-xs font-bold">
                            <p className="text-slate-400 font-black uppercase text-[9px] mb-1">Escritório do Parceiro</p>
                            <p>{formData.tradingName}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'extras' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Telefone Fixo</label>
                  <input 
                    className={inputClass}
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp Pessoal</label>
                  <input 
                    className={inputClass}
                    value={formData.cellphone || ''}
                    onChange={e => setFormData({...formData, cellphone: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>E-Mail Profissional</label>
                  <input 
                    type="email"
                    className={inputClass}
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Notas de Parceria</label>
                  <textarea 
                    rows={4}
                    className={`${inputClass} resize-none`}
                    value={formData.observations || ''}
                    onChange={e => setFormData({...formData, observations: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="p-8 bg-slate-50 flex justify-end gap-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="px-8 py-3 bg-[var(--primary-color)] text-white rounded-2xl font-black shadow-lg shadow-[var(--primary-color)]/20 hover:bg-[var(--secondary-color)] transition-all transform hover:scale-[1.02] active:scale-95">
            Salvar Profissional
          </button>
        </div>
      </div>
    </div>
  );
};
