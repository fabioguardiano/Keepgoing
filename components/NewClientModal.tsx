import React, { useState, useEffect } from 'react';
import { X, User, Building2, MapPin, Phone, Mail, Globe, CreditCard, Calendar, UserCheck, ShieldCheck, Info, FileText } from 'lucide-react';
import { Client } from '../types';
import { formatCPF, formatCNPJ, validateDocument } from '../utils/documentValidation';
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

// Component to handle map view reset
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  editingClient?: Client | null;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose, onSave, editingClient }) => {
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt'>>({
    name: '',
    type: 'Pessoa Física',
    document: '',
    rgInsc: '',
    email: '',
    phone: '',
    cellphone: '',
    useSpecialTable: false,
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'endereco' | 'entrega'>('geral');
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDocumentInvalid, setIsDocumentInvalid] = useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);

  useEffect(() => {
    if (editingClient) {
      const { id, createdAt, ...rest } = editingClient;
      setFormData(rest);
    } else {
      setFormData({
        name: '',
        type: 'Pessoa Física',
        document: '',
        rgInsc: '',
        email: '',
        phone: '',
        cellphone: '',
        useSpecialTable: false,
        address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' }
      });
    }
  }, [editingClient, isOpen]);

  // Automatic geocoding for existing addresses without coordinates
  useEffect(() => {
    if (isOpen && activeTab === 'endereco' && formData.address.street && (!formData.address.lat || !formData.address.lng)) {
      geocodeAddress(formData.address.street, formData.address.number, formData.address.city, formData.address.state, formData.address.zipCode, 'address');
    }
    if (isOpen && activeTab === 'entrega' && formData.deliveryAddress?.street && (!formData.deliveryAddress.lat || !formData.deliveryAddress.lng)) {
      geocodeAddress(formData.deliveryAddress.street, formData.deliveryAddress.number, formData.deliveryAddress.city, formData.deliveryAddress.state, formData.deliveryAddress.zipCode, 'deliveryAddress');
    }
  }, [activeTab, isOpen, formData.address.street, formData.deliveryAddress?.street, formData.address.zipCode, formData.deliveryAddress?.zipCode]);

  const geocodeAddress = async (street: string, number: string, city: string, state: string, zipCode: string, fieldType: 'address' | 'deliveryAddress') => {
    if (!city && !zipCode) return;
    
    setIsGeocoding(true);
    const cleanZip = zipCode.replace(/\D/g, '');
    console.log(`Buscando coordenadas para: ${street}, ${number}, ${city}, ${cleanZip}`);
    
    try {
      const fetchWithHeaders = (query: string) => fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9', 'User-Agent': 'KeepGoing-ERP/1.0' }
      });

      let finalData = null;

      // STEP 1: Full Address Search
      if (street && city) {
        const query = `${street}${number ? `, ${number}` : ''}, ${city}, ${state}, Brasil`;
        const res = await fetchWithHeaders(query);
        const data = await res.json();
        if (data && data[0]) finalData = data[0];
      }

      // STEP 2: Fallback to ZIP Code (Highly reliable for neighborhood level)
      if (!finalData && cleanZip.length === 8) {
        console.log('Tentando fallback por CEP...');
        const res = await fetchWithHeaders(`${cleanZip}, Brasil`);
        const data = await res.json();
        if (data && data[0]) finalData = data[0];
      }

      // STEP 3: Fallback without number
      if (!finalData && street && city) {
        console.log('Tentando fallback sem número...');
        const res = await fetchWithHeaders(`${street}, ${city}, ${state}, Brasil`);
        const data = await res.json();
        if (data && data[0]) finalData = data[0];
      }

      // STEP 4: Aggressive Cleaning (R., Rua, Av. etc)
      if (!finalData && street && city) {
        const cleanStreet = street
          .replace(/^(R\.|RUA|AV\.|AVENIDA|PRACA|PRAÇA|TRAVESSA|TRAV\.|RODOVIA|ROD\.)\s+/i, '')
          .trim();
        
        if (cleanStreet !== street) {
          console.log(`Tentando fallback com rua limpa: ${cleanStreet}`);
          const res = await fetchWithHeaders(`${cleanStreet}, ${city}, ${state}, Brasil`);
          const data = await res.json();
          if (data && data[0]) finalData = data[0];
        }
      }

      // STEP 5: Partial Street Search
      if (!finalData && street && city && street.length > 8) {
        const parts = street.split(' ');
        if (parts.length > 2) {
          const partial = parts.slice(0, -1).join(' ');
          console.log(`Tentando fallback parcial: ${partial}`);
          const res = await fetchWithHeaders(`${partial}, ${city}, ${state}, Brasil`);
          const data = await res.json();
          if (data && data[0]) finalData = data[0];
        }
      }

      if (finalData) {
        const lat = parseFloat(finalData.lat);
        const lng = parseFloat(finalData.lon);
        console.log('Localização encontrada:', lat, lng);
        
        setFormData(prev => ({
          ...prev,
          [fieldType === 'address' ? 'address' : 'deliveryAddress']: {
            ...(fieldType === 'address' ? prev.address : (prev.deliveryAddress || {})),
            lat,
            lng
          }
        }));
      } else {
        console.warn('Nenhuma localização encontrada.');
      }
    } catch (error) {
      console.error('Erro na geocodificação:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const fetchCNPJData = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return;

    setIsFetchingCNPJ(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      
      const data = await response.json();
      
      setFormData(prev => {
        const updatedData = {
          ...prev,
          name: data.razao_social || data.nome_fantasia || prev.name,
          email: data.email || prev.email,
          birthDate: data.data_inicio_atividade || prev.birthDate,
          phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0,2)}) ${data.ddd_telefone_1.substring(2)}` : prev.phone,
          address: {
            ...prev.address,
            street: data.logradouro || prev.address.street,
            number: data.numero || prev.address.number,
            complement: data.complemento || prev.address.complement,
            neighborhood: data.bairro || prev.address.neighborhood,
            city: data.municipio || prev.address.city,
            state: data.uf || prev.address.state,
            zipCode: data.cep ? `${data.cep.substring(0,5)}-${data.cep.substring(5,8)}` : prev.address.zipCode
          }
        };

        // Proactively geocode the new address to update the map
        if (updatedData.address.street && updatedData.address.city) {
          geocodeAddress(
            updatedData.address.street, 
            updatedData.address.number, 
            updatedData.address.city, 
            updatedData.address.state, 
            updatedData.address.zipCode, 
            'address'
          );
        }

        return updatedData;
      });
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
    } finally {
      setIsFetchingCNPJ(false);
    }
  };

  const fetchAddressByCEP = async (cep: string, fieldType: 'address' | 'deliveryAddress') => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    setIsLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (data.erro) throw new Error('CEP não encontrado');

      setFormData(prev => {
        const newAddressData = {
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
          zipCode: cleanCEP,
          number: (fieldType === 'address' ? prev.address.number : (prev.deliveryAddress?.number || '')),
          complement: (fieldType === 'address' ? prev.address.complement : (prev.deliveryAddress?.complement || '')),
          lat: (fieldType === 'address' ? prev.address.lat : (prev.deliveryAddress?.lat || undefined)),
          lng: (fieldType === 'address' ? prev.address.lng : (prev.deliveryAddress?.lng || undefined)),
        };

        // Proactive geocoding immediately after CEP lookup
        geocodeAddress(newAddressData.street, newAddressData.number, newAddressData.city, newAddressData.state, cleanCEP, fieldType);
        
        if (fieldType === 'address') {
          return { ...prev, address: { ...prev.address, ...newAddressData } };
        } else {
          return { ...prev, deliveryAddress: { ...(prev.deliveryAddress || {}), ...newAddressData } as any };
        }
      });
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLoadingCEP(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.document && !validateDocument(formData.document, formData.type)) {
      setIsDocumentInvalid(true);
      alert(`O ${formData.type === 'Pessoa Física' ? 'CPF' : 'CNPJ'} informado é inválido. Por favor, verifique os números.`);
      return;
    }

    onSave({
      ...formData,
      id: editingClient?.id || String(Date.now()),
      createdAt: editingClient?.createdAt || new Date().toISOString().split('T')[0]
    } as Client);
    onClose();
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/20 transition-all disabled:opacity-50";
  const labelClass = "text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-2";

  const mapCenter: [number, number] = (formData.address.lat && formData.address.lng) 
    ? [formData.address.lat, formData.address.lng] 
    : [-23.5505, -46.6333]; // Default to SP if not found

  const deliveryMapCenter: [number, number] = (formData.deliveryAddress?.lat && formData.deliveryAddress?.lng)
    ? [formData.deliveryAddress.lat, formData.deliveryAddress.lng]
    : [-23.5505, -46.6333]; // Default to SP if not found

  const activeMapCenter = activeTab === 'endereco' ? mapCenter : deliveryMapCenter;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-2xl text-[#ec5b13] shadow-sm border border-slate-100">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                {editingClient ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
                {editingClient?.code && (
                  <span className="text-[#ec5b13] bg-orange-50 px-2 py-0.5 rounded-lg text-sm">
                    #{editingClient.code}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Módulo CRM Premium</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-full border border-slate-100 shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-slate-100 gap-6">
          {[
            { id: 'geral', label: 'Dados Gerais', icon: UserCheck },
            { id: 'endereco', label: 'Endereço Principal', icon: MapPin },
            { id: 'entrega', label: 'Dados Entrega', icon: CreditCard }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id ? 'border-[#ec5b13] text-[#ec5b13]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'geral' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}><ShieldCheck size={14} /> Tipo de Pessoa</label>
                  <select 
                    className={inputClass}
                    value={formData.type}
                    onChange={e => {
                      const newType = e.target.value as any;
                      setFormData({
                        ...formData, 
                        type: newType,
                        document: '' // Limpar documento ao trocar tipo para evitar máscaras misturadas
                      });
                      setIsDocumentInvalid(false);
                    }}
                  >
                    <option value="Pessoa Física">Pessoa Física</option>
                    <option value="Pessoa Jurídica">Pessoa Jurídica</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className={labelClass}><User size={14} /> Nome Completo / Razão Social</label>
                  <input 
                    required
                    className={inputClass}
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="João da Silva ou Marmoraria XYZ LTDA"
                  />
                </div>
                <div>
                  <label className={labelClass}><CreditCard size={14} /> CPF / CNPJ {isFetchingCNPJ && <span className="text-[#ec5b13] animate-pulse font-normal lowercase">(Consultando...)</span>}</label>
                  <input 
                    required
                    className={`${inputClass} ${isDocumentInvalid ? 'border-red-500 bg-red-50 focus:ring-red-200' : ''} ${isFetchingCNPJ ? 'animate-pulse' : ''}`}
                    value={formData.document}
                    onChange={e => {
                      const val = e.target.value;
                      const formatted = formData.type === 'Pessoa Física' ? formatCPF(val) : formatCNPJ(val);
                      setFormData({...formData, document: formatted});
                      if (isDocumentInvalid) setIsDocumentInvalid(false);
                      
                      // Trigger CNPJ lookup automatically when fully entered and valid
                      if (formData.type === 'Pessoa Jurídica') {
                        const clean = val.replace(/\D/g, '');
                        if (clean.length === 14) {
                          fetchCNPJData(clean);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (formData.document) {
                        setIsDocumentInvalid(!validateDocument(formData.document, formData.type));
                      }
                    }}
                    placeholder={formData.type === 'Pessoa Física' ? "000.000.000-00" : "00.000.000/0000-00"}
                  />
                  {isDocumentInvalid && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">Documento Inválido</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}><FileText size={14} /> RG / Inscrição Estadual</label>
                  <input 
                    className={inputClass}
                    value={formData.rgInsc}
                    onChange={e => setFormData({...formData, rgInsc: e.target.value})}
                  />
                </div>
                <div>
                  <label className={labelClass}><Calendar size={14} /> Data Nasc. / Fundação</label>
                  <input 
                    type="date"
                    className={inputClass}
                    value={formData.birthDate || ''}
                    onChange={e => setFormData({...formData, birthDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="h-[1px] bg-slate-100 my-2" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}><Mail size={14} /> E-mail Principal</label>
                  <input 
                    type="email"
                    className={inputClass}
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="exemplo@email.com"
                  />
                </div>
                <div>
                  <label className={labelClass}><Phone size={14} /> Telefone Fixo</label>
                  <input 
                    className={inputClass}
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className={labelClass}><Phone size={14} /> Celular / WhatsApp</label>
                  <input 
                    className={inputClass}
                    value={formData.cellphone}
                    onChange={e => setFormData({...formData, cellphone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className={labelClass}><User size={14} /> Vendedor Responsável</label>
                  <input 
                    className={inputClass}
                    value={formData.sellerName || ''}
                    onChange={e => setFormData({...formData, sellerName: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl text-[#ec5b13] shadow-sm">
                    <Info size={18} />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Tabela de Preços Especial</p>
                    <p className="text-slate-500 font-medium">Aplicar condições de desconto diferenciadas para este cliente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, useSpecialTable: !formData.useSpecialTable})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${formData.useSpecialTable ? 'bg-[#ec5b13]' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.useSpecialTable ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-6 gap-4">
                    {/* Linha 1 - CEP */}
                    <div className="col-span-6">
                      <label className={labelClass}>CEP {isLoadingCEP && <span className="text-[#ec5b13] animate-pulse font-normal lowercase">(Busca...)</span>}</label>
                      <input 
                        className="w-full md:w-1/3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/20 transition-all disabled:opacity-50"
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
                            fetchAddressByCEP(val, 'address');
                          }
                        }}
                      />
                    </div>

                    {/* Linha 2 - Endereço - Número */}
                    <div className="col-span-4">
                      <label className={labelClass}>Logradouro</label>
                      <input 
                        className={inputClass}
                        value={formData.address.street}
                        onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                        onBlur={() => geocodeAddress(formData.address.street, formData.address.number, formData.address.city, formData.address.state, formData.address.zipCode, 'address')}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Número</label>
                      <input 
                        className={inputClass}
                        value={formData.address.number}
                        onChange={e => setFormData({...formData, address: {...formData.address, number: e.target.value}})}
                        onBlur={() => geocodeAddress(formData.address.street, formData.address.number, formData.address.city, formData.address.state, formData.address.zipCode, 'address')}
                      />
                    </div>

                    {/* Linha 3 - Complemento */}
                    <div className="col-span-6">
                      <label className={labelClass}>Complemento</label>
                      <input 
                        className={inputClass}
                        placeholder="Ex: Apto 12..."
                        value={formData.address.complement || ''}
                        onChange={e => setFormData({...formData, address: {...formData.address, complement: e.target.value}})}
                      />
                    </div>

                    {/* Linha 4 - Bairro */}
                    <div className="col-span-6">
                      <label className={labelClass}>Bairro</label>
                      <input 
                        className={inputClass}
                        value={formData.address.neighborhood}
                        onChange={e => setFormData({...formData, address: {...formData.address, neighborhood: e.target.value}})}
                      />
                    </div>

                    {/* Linha 5 - Cidade - UF */}
                    <div className="col-span-4">
                      <label className={labelClass}>Cidade</label>
                      <input 
                        className={inputClass}
                        value={formData.address.city}
                        onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>UF</label>
                      <input 
                        maxLength={2}
                        className={inputClass}
                        value={formData.address.state}
                        onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value.toUpperCase()}})}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[11px] text-slate-500 w-full">
                    <MapPin size={16} className="text-[#ec5b13] shrink-0" />
                    <p>O mapa ao lado sincroniza automaticamente com o endereço digitado.</p>
                  </div>
                </div>

                <div className="h-[400px] rounded-[24px] overflow-hidden border border-slate-200 shadow-inner relative group bg-slate-100">
                  {isGeocoding && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center">
                      <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
                        <div className="w-5 h-5 border-2 border-[#ec5b13] border-t-transparent animate-spin rounded-full" />
                        <span className="text-xs font-bold text-slate-600 tracking-tight uppercase">Localizando no Mapa...</span>
                      </div>
                    </div>
                  )}
                  <MapContainer center={activeMapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapController center={mapCenter} />
                    {formData.address.lat && formData.address.lng && (
                      <Marker position={[formData.address.lat, formData.address.lng]}>
                        <Popup>
                          <div className="text-xs font-bold leading-tight">
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Localização do Cliente</p>
                            <p>{formData.address.street}, {formData.address.number}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'entrega' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600">O endereço de entrega é o mesmo do principal?</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.deliveryAddress) {
                      setFormData({
                        ...formData,
                        deliveryAddress: {
                          street: formData.address.street,
                          number: formData.address.number,
                          complement: formData.address.complement,
                          neighborhood: formData.address.neighborhood,
                          city: formData.address.city,
                          state: formData.address.state,
                          zipCode: formData.address.zipCode,
                          lat: formData.address.lat,
                          lng: formData.address.lng
                        }
                      });
                    } else {
                      setFormData({...formData, deliveryAddress: undefined});
                    }
                  }}
                  className="text-[#ec5b13] text-sm font-black hover:underline"
                >
                  {formData.deliveryAddress ? 'Remover Endereço de Entrega' : 'Copiar Endereço Principal'}
                </button>
              </div>

              <div className="grid grid-cols-6 gap-6 opacity-80">
                {/* Linha 1 - CEP */}
                <div className="col-span-6">
                  <label className={labelClass}>CEP Entrega</label>
                  <input 
                    className="w-full md:w-1/3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/20 transition-all disabled:opacity-50"
                    value={formData.deliveryAddress?.zipCode || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), zipCode: val} as any});
                      if (val.replace(/\D/g, '').length === 8) {
                        fetchAddressByCEP(val, 'deliveryAddress');
                      }
                    }}
                    disabled={!formData.deliveryAddress}
                  />
                </div>

                {/* Linha 2 - Endereço - Número */}
                <div className="col-span-4">
                  <label className={labelClass}>Rua / Av. Entrega</label>
                  <input 
                    className={inputClass}
                    value={formData.deliveryAddress?.street || ''}
                    onChange={e => setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), street: e.target.value} as any})}
                    onBlur={() => {
                      if (formData.deliveryAddress) {
                        geocodeAddress(formData.deliveryAddress.street, formData.deliveryAddress.number, formData.deliveryAddress.city, formData.deliveryAddress.state, formData.deliveryAddress.zipCode, 'deliveryAddress');
                      }
                    }}
                    disabled={!formData.deliveryAddress}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Número</label>
                  <input 
                    className={inputClass}
                    value={formData.deliveryAddress?.number || ''}
                    onChange={e => setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), number: e.target.value} as any})}
                    onBlur={() => {
                      if (formData.deliveryAddress) {
                        geocodeAddress(formData.deliveryAddress.street, formData.deliveryAddress.number, formData.deliveryAddress.city, formData.deliveryAddress.state, formData.deliveryAddress.zipCode, 'deliveryAddress');
                      }
                    }}
                    disabled={!formData.deliveryAddress}
                  />
                </div>

                {/* Linha 3 - Complemento */}
                <div className="col-span-6">
                  <label className={labelClass}>Complemento Entrega</label>
                  <input 
                    className={inputClass}
                    value={formData.deliveryAddress?.complement || ''}
                    onChange={e => setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), complement: e.target.value} as any})}
                    disabled={!formData.deliveryAddress}
                  />
                </div>

                {/* Linha 4 - Bairro */}
                <div className="col-span-6">
                  <label className={labelClass}>Bairro</label>
                  <input 
                    className={inputClass}
                    value={formData.deliveryAddress?.neighborhood || ''}
                    onChange={e => setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), neighborhood: e.target.value} as any})}
                    disabled={!formData.deliveryAddress}
                  />
                </div>

                {/* Linha 5 - Cidade - UF */}
                <div className="col-span-4">
                  <label className={labelClass}>Cidade</label>
                  <input 
                    className={inputClass}
                    value={formData.deliveryAddress?.city || ''}
                    onChange={e => setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), city: e.target.value} as any})}
                    disabled={!formData.deliveryAddress}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>UF</label>
                  <input 
                    maxLength={2}
                    className={inputClass}
                    value={formData.deliveryAddress?.state || ''}
                    onChange={e => setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), state: e.target.value.toUpperCase()} as any})}
                    disabled={!formData.deliveryAddress}
                  />
                </div>

                {/* Linha 6 - Ponto de Referência */}
                <div className="col-span-6">
                  <label className={labelClass}>Ponto de Referência</label>
                  <textarea 
                    rows={3}
                    className={`${inputClass} resize-none mb-4`}
                    value={formData.deliveryAddress?.referencePoint || ''}
                    onChange={e => setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), referencePoint: e.target.value} as any})}
                    disabled={!formData.deliveryAddress}
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all">
            Cancelar
          </button>
          <button type="submit" onClick={handleSubmit} className="px-8 py-3 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d84a0d] transition-all transform hover:scale-[1.02] active:scale-95">
            Salvar Cliente
          </button>
        </div>
      </div>
    </div>
  );
};
