import React, { useState, useEffect } from 'react';
import { 
  X, User, MapPin, Phone, Mail, FileText, Building2, 
  UserCheck, ShieldCheck, CreditCard, Info, Calendar, Search
} from 'lucide-react';
import { Client } from '../types';
import { formatCPF, formatCNPJ, formatPhone, validateDocument } from '../utils/documentValidation';
import { MapComponent } from './MapComponent';
import { geocodeAddress as mapboxGeocode } from '../lib/mapsService';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  editingClient?: Client | null;
  clients?: Client[];
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose, onSave, editingClient, clients = [] }) => {
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt'>>({
    legalName: '',
    tradingName: '',
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
    },
    code: undefined
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
      const codes = clients
        .map(cl => typeof cl.code === 'number' ? cl.code : parseInt(String(cl.code).replace(/\D/g, '')))
        .filter(n => !isNaN(n));
      const nextCode = codes.length > 0 ? Math.max(...codes) + 1 : 1;

      setFormData({
        legalName: '',
        tradingName: '',
        type: 'Pessoa Física',
        document: '',
        rgInsc: '',
        email: '',
        phone: '',
        cellphone: '',
        useSpecialTable: false,
        address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' },
        code: nextCode
      });
    }
  }, [editingClient, isOpen, clients]);

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
    if (!street && !zipCode) return;
    
    setIsGeocoding(true);
    try {
      const result = await mapboxGeocode(street, number, city, state, zipCode);
      
      if (result) {
        setFormData(prev => ({
          ...prev,
          [fieldType === 'address' ? 'address' : 'deliveryAddress']: {
            ...(fieldType === 'address' ? prev.address : (prev.deliveryAddress || {})),
            lat: result.lat,
            lng: result.lng
          }
        }));
      }
    } catch (error) {
      console.error('Erro na geocodificação Mapbox:', error);
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
          legalName: data.razao_social || data.nome_fantasia || prev.legalName,
          tradingName: data.nome_fantasia || data.razao_social || prev.tradingName,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.document) {
      if (!validateDocument(formData.document, formData.type)) {
        setIsDocumentInvalid(true);
        alert(`O ${formData.type === 'Pessoa Física' ? 'CPF' : 'CNPJ'} informado é inválido. Por favor, verifique os números.`);
        return;
      }

      // Verificação extra de duplicidade antes de fechar o modal
      const cleanDoc = formData.document.replace(/\D/g, '');
      const isDuplicate = clients.some(c => 
        c.id !== editingClient?.id && 
        (c.document || '').replace(/\D/g, '') === cleanDoc
      );

      if (isDuplicate) {
        const existing = clients.find(c => (c.document || '').replace(/\D/g, '') === cleanDoc);
        const docName = formData.type === 'Pessoa Física' ? 'CPF' : 'CNPJ';
        alert(`Não é possível cadastrar: O ${docName} ${formData.document} já pertence ao cliente "${existing?.tradingName || existing?.legalName}" (Cód: ${existing?.code || 'S/N'}).`);
        return;
      }
    }

    try {
      await onSave({
        ...formData,
        id: editingClient?.id || String(Date.now()),
        createdAt: editingClient?.createdAt || new Date().toISOString().split('T')[0]
      } as Client);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar cliente no Modal:', err);
      // O erro já deve ter sido mostrado pelo hook via alert
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50";
  const labelClass = "text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-2";

  const mapCenter = {
    lat: formData.address.lat || -23.5505,
    lng: formData.address.lng || -46.6333
  };

  const deliveryMapCenter = {
    lat: formData.deliveryAddress?.lat || -23.5505,
    lng: formData.deliveryAddress?.lng || -46.6333
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-2xl text-primary shadow-sm border border-slate-100">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                {editingClient ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
                {editingClient?.code && (
                  <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-lg text-sm">
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
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
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
                  <label className={labelClass}><FileText size={14} /> Código do Cliente</label>
                  <input 
                    type="number"
                    readOnly
                    className={`${inputClass} bg-slate-100 text-slate-400 cursor-not-allowed`}
                    value={formData.code || ''}
                    placeholder="Auto-gerado"
                  />
                </div>
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
                <div className="lg:col-span-1">
                  <label className={labelClass}><User size={14} /> Nome Completo / Razão Social</label>
                  <input 
                    required
                    className={inputClass}
                    value={formData.legalName}
                    onChange={e => setFormData({...formData, legalName: e.target.value})}
                    placeholder="João da Silva ou Marmoraria XYZ LTDA"
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className={labelClass}><Building2 size={14} /> Nome Fantasia</label>
                  <input 
                    className={inputClass}
                    value={formData.tradingName}
                    onChange={e => setFormData({...formData, tradingName: e.target.value})}
                    placeholder="Opcional para PF, comum para PJ"
                  />
                </div>
                <div>
                  <label className={labelClass}><CreditCard size={14} /> CPF / CNPJ {isFetchingCNPJ && <span className="text-primary animate-pulse font-normal lowercase">(Consultando...)</span>}</label>
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
                        const isValid = validateDocument(formData.document, formData.type);
                        setIsDocumentInvalid(!isValid);

                        // Check duplicate on blur as well
                        if (isValid) {
                          const cleanDoc = formData.document.replace(/\D/g, '');
                          const isDuplicate = clients.some(c => 
                            c.id !== editingClient?.id && 
                            (c.document || '').replace(/\D/g, '') === cleanDoc
                          );
                          if (isDuplicate) {
                             const existing = clients.find(c => (c.document || '').replace(/\D/g, '') === cleanDoc);
                             alert(`Atenção: Já existe um cliente (${existing?.tradingName || existing?.legalName}) com este documento.`);
                          }
                        }
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
                    onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})}
                    placeholder="(00) 0000-0000 ou +00..."
                  />
                </div>
                <div>
                  <label className={labelClass}><Phone size={14} /> Celular / WhatsApp</label>
                  <input 
                    className={inputClass}
                    value={formData.cellphone}
                    onChange={e => setFormData({...formData, cellphone: formatPhone(e.target.value)})}
                    placeholder="(00) 00000-0000 ou +00..."
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
                  <div className="p-2 bg-white rounded-xl text-primary shadow-sm">
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
                  className={`relative w-12 h-6 rounded-full transition-colors ${formData.useSpecialTable ? 'bg-primary' : 'bg-slate-200'}`}
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
                      <label className={labelClass}>CEP {isLoadingCEP && <span className="text-[var(--primary-color)] animate-pulse font-normal lowercase">(Busca...)</span>}</label>
                      <input 
                        className="w-full md:w-1/3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all disabled:opacity-50"
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

                    {/* Linha 2 - Logradouro */}
                    <div className="col-span-6">
                      <label className={labelClass}>Logradouro</label>
                      <input 
                        className={inputClass}
                        value={formData.address.street}
                        onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                        onBlur={() => geocodeAddress(formData.address.street, formData.address.number, formData.address.city, formData.address.state, formData.address.zipCode, 'address')}
                      />
                    </div>

                    {/* Linha 3 - Número e Complemento */}
                    <div className="col-span-2">
                      <label className={labelClass}>Número</label>
                      <input 
                        className={inputClass}
                        value={formData.address.number}
                        onChange={e => setFormData({...formData, address: {...formData.address, number: e.target.value}})}
                        onBlur={() => geocodeAddress(formData.address.street, formData.address.number, formData.address.city, formData.address.state, formData.address.zipCode, 'address')}
                      />
                    </div>
                    <div className="col-span-4">
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
                    <MapPin size={16} className="text-primary shrink-0" />
                    <p>O mapa ao lado sincroniza automaticamente com o endereço digitado.</p>
                  </div>
                </div>

                <div className="h-[400px] rounded-[24px] overflow-hidden border border-slate-200 shadow-inner relative group bg-slate-100">
                  {isGeocoding && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center">
                      <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                        <span className="text-xs font-bold text-slate-600 tracking-tight uppercase">Localizando no Mapa...</span>
                      </div>
                    </div>
                  )}
                  <MapComponent 
                    center={mapCenter} 
                    markerTitle={formData.tradingName || formData.legalName}
                    popupContent={
                      <div className="text-xs font-bold leading-tight min-w-[120px]">
                        <p className="text-primary font-black uppercase tracking-widest text-[9px] mb-1">Localização do Cliente</p>
                        <p className="text-slate-700">{formData.address.street}, {formData.address.number}</p>
                        <p className="text-slate-400 text-[10px] mt-1 italic">{formData.address.city} - {formData.address.state}</p>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'entrega' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-slate-600">Endereço de Entrega Diferente?</p>
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
                      className="text-[var(--primary-color)] text-sm font-black hover:underline"
                    >
                      {formData.deliveryAddress ? 'Limpar/Remover' : 'Copiar Principal'}
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-4">
                    {/* Linha 1 - CEP */}
                    <div className="col-span-6">
                      <label className={labelClass}>CEP Entrega</label>
                      <input 
                        className="w-full md:w-1/3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all disabled:opacity-50"
                        placeholder="00000-000"
                        maxLength={9}
                        value={formData.deliveryAddress?.zipCode || ''}
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 5) {
                            val = `${val.slice(0, 5)}-${val.slice(5, 8)}`;
                          }
                          setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), zipCode: val} as any});
                          if (val.replace(/\D/g, '').length === 8) {
                            fetchAddressByCEP(val, 'deliveryAddress');
                          }
                        }}
                        disabled={!formData.deliveryAddress}
                      />
                    </div>

                    {/* Linha 2 - Logradouro */}
                    <div className="col-span-6">
                      <label className={labelClass}>Logradouro</label>
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

                    {/* Linha 3 - Número e Complemento */}
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
                    <div className="col-span-4">
                      <label className={labelClass}>Complemento</label>
                      <input 
                        className={inputClass}
                        placeholder="Ex: Apto 12..."
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
                        rows={2}
                        className={`${inputClass} resize-none`}
                        value={formData.deliveryAddress?.referencePoint || ''}
                        onChange={e => setFormData({...formData, deliveryAddress: {...(formData.deliveryAddress || {}), referencePoint: e.target.value} as any})}
                        disabled={!formData.deliveryAddress}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-[430px] mt-8 rounded-[24px] overflow-hidden border border-slate-200 shadow-inner relative group bg-slate-100">
                  {isGeocoding && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center">
                      <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                        <span className="text-xs font-bold text-slate-600 tracking-tight uppercase">Localizando...</span>
                      </div>
                    </div>
                  )}
                  <MapComponent 
                    center={deliveryMapCenter} 
                    markerTitle="Local de Entrega"
                    popupContent={
                      <div className="text-xs font-bold leading-tight min-w-[120px]">
                        <p className="text-primary font-black uppercase tracking-widest text-[9px] mb-1">Local da Entrega</p>
                        <p className="text-slate-700">{formData.deliveryAddress?.street}, {formData.deliveryAddress?.number}</p>
                        <p className="text-slate-400 text-[10px] mt-1 italic">{formData.deliveryAddress?.city} - {formData.deliveryAddress?.state}</p>
                      </div>
                    }
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
          <button type="submit" onClick={handleSubmit} className="px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:bg-secondary transition-all transform hover:scale-[1.02] active:scale-95">
            Salvar Cliente
          </button>
        </div>
      </div>
    </div>
  );
};
