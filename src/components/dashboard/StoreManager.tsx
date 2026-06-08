import * as React from 'react';
import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Store, StoreSettings, Currency, Order, CommissionPayment } from '../../types';
import { cn, formatLocation, getProxyImageUrl } from '../../lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  MapPin, 
  Percent, 
  User, 
  Building, 
  CheckCircle2, 
  LayoutDashboard, 
  Database, 
  Store as StoreReactIcon,
  Power,
  Coins,
  History,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import StoreBackupRestore from './StoreBackupRestore';
import { ImageFileUploader } from '../ImageFileUploader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


const CUBAN_PROVINCES_MUNICIPALITIES: Record<string, string[]> = {
  'La Habana': [
    'Plaza de la Revolución', 'Playa', 'Centro Habana', 'Habana Vieja', 'Regla',
    'Guanabacoa', 'San Miguel del Padrón', 'Diez de Octubre', 'Cerro', 'Marianao',
    'La Lisa', 'Boyeros', 'Arroyo Naranjo', 'Cotorro', 'Habana del Este'
  ],
  'Pinar del Río': [
    'Pinar del Río', 'Consolación del Sur', 'Viñales', 'Minas de Matahambre', 
    'San Juan y Martínez', 'San Luis', 'Guane', 'Mantua', 'Sandino', 'Los Palacios', 'La Palma'
  ],
  'Artemisa': [
    'Artemisa', 'Bauta', 'Caimito', 'Guanajay', 'Mariel', 'San Antonio de los Baños', 
    'Bahía Honda', 'San Cristóbal', 'Candelaria', 'Alquízar', 'Güira de Melena'
  ],
  'Mayabeque': [
    'San José de las Lajas', 'Bejucal', 'Jaruco', 'Santa Cruz del Norte', 'Madruga', 
    'Nueva Paz', 'San Nicolás', 'Melena del Sur', 'Batabanó', 'Quivicán', 'Güines'
  ],
  'Matanzas': [
    'Matanzas', 'Cárdenas', 'Varadero', 'Jovellanos', 'Limonar', 'Colón', 'Jagüey Grande', 
    'Calimete', 'Martí', 'Pedro Betancourt', 'Unión de Reyes', 'Los Arabos', 'Ciénaga de Zapata'
  ],
  'Cienfuegos': [
    'Cienfuegos', 'Abreus', 'Aguada de Pasajeros', 'Cruces', 'Lajas', 'Palmira', 'Rodas', 'Cumanayagua'
  ],
  'Villa Clara': [
    'Santa Clara', 'Sagua la Grande', 'Caibarién', 'Remedios', 'Camajuaní', 'Placetas', 
    'Ranchuelo', 'Santo Domingo', 'Manicaragua', 'Cifuentes', 'Encrucijada', 'Quemado de Güines', 'Corralillo'
  ],
  'Sancti Spíritus': [
    'Sancti Spíritus', 'Trinidad', 'Cabaiguán', 'Fomento', 'Jatibonico', 'Taguasco', 'Yaguajay', 'La Sierpe'
  ],
  'Ciego de Ávila': [
    'Ciego de Ávila', 'Morón', 'Chambas', 'Florencia', 'Venezuela', 'Baraguá', 'Primero de Enero', 
    'Ciro Redondo', 'Majagua', 'Bolivia'
  ],
  'Camagüey': [
    'Camagüey', 'Nuevitas', 'Florida', 'Vertientes', 'Guáimaro', 'Sibanicú', 'Jimaguayú', 
    'Santa Cruz del Sur', 'Najasa', 'Esmeralda', 'Sierra de Cubitas', 'Minas', 'Céspedes'
  ],
  'Las Tunas': [
    'Las Tunas', 'Puerto Padre', 'Amancio', 'Colombia', 'Jesús Menéndez', 'Majibacoa', 'Manatí', 'Jobabo'
  ],
  'Holguín': [
    'Holguín', 'Banes', 'Gibara', 'Mayarí', 'Moa', 'Sagua de Tánamo', 'Rafael Freyre', 'Calixto García', 
    'Cacocum', 'Baguanos', 'Urbano Noris', 'Cueto', 'Frank País', 'Antilla'
  ],
  'Granma': [
    'Bayamo', 'Manzanillo', 'Jiguaní', 'Cauto Cristo', 'Río Cauto', 'Yara', 'Campechuela', 
    'Media Luna', 'Niquero', 'Pilón', 'Bartolomé Masó', 'Buey Arriba', 'Guisa'
  ],
  'Santiago de Cuba': [
    'Santiago de Cuba', 'Palma Soriano', 'Contramaestre', 'San Luis', 'Songo - La Maya', 
    'Mella', 'Segundo Frente', 'Tercer Frente', 'Guamá'
  ],
  'Guantánamo': [
    'Guantánamo', 'Baracoa', 'Maisí', 'Yateras', 'Imías', 'San Antonio del Sur', 
    'Manuel Tames', 'Caimanera', 'El Salvador', 'Niceto Pérez'
  ],
  'Isla de la Juventud': [
    'Nueva Gerona'
  ]
};

export default function StoreManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'stores' | 'commissions'>('stores');

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsDialogOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('create');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [backupStore, setBackupStore] = useState<Store | null>(null);

  // Reconcilation form and dialogs
  const [isReconcileDialogOpen, setIsReconcileDialogOpen] = useState(false);
  const [reconcilingStore, setReconcilingStore] = useState<Store | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyStore, setHistoryStore] = useState<Store | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountCUP: 0,
    amountMLC: 0,
    notes: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerId: '',
    province: 'La Habana',
    municipality: '',
    locality: '',
    commissionRate: 5,
    enabledCurrencies: ['CUP', 'MLC'] as Currency[],
    activePaymentMethods: ['transfer', 'cash'] as ('transfer' | 'cash' | 'zelle')[],
    affiliateSystemEnabled: false,
    affiliateMode: 'recommendation' as 'recommendation' | 'direct_sale',
    logo: '',
    banner: '',
    storeImage: '',
  });

  // Auto-generate slug from name
  useEffect(() => {
    if (!editingStore && formData.name) {
      const generatedSlug = formData.name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/-+/g, '-'); // Remove duplicate -
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, editingStore]);

  // Sync municipality options when province changes in admin form
  useEffect(() => {
    const availableMunis = CUBAN_PROVINCES_MUNICIPALITIES[formData.province] || [];
    if (availableMunis.length > 0) {
      if (!availableMunis.includes(formData.municipality)) {
        setFormData(prev => ({ ...prev, municipality: availableMunis[0] }));
      }
    } else {
      setFormData(prev => ({ ...prev, municipality: '' }));
    }
  }, [formData.province]);

  useEffect(() => {
    const q = query(collection(db, 'stores'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store)));
    });
    return unsubscribe;
  }, []);

  // Subscribe to all orders
  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    return unsubscribe;
  }, []);

  // Subscribe to all payments
  useEffect(() => {
    const q = query(collection(db, 'commission_payments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionPayment)));
    });
    return unsubscribe;
  }, []);

  const handleToggleActive = async (store: Store) => {
    try {
      const nextActive = !store.active;
      await updateDoc(doc(db, 'stores', store.id), {
        active: nextActive
      });
      if (nextActive) {
        toast.success(`¡Oye, asere! La tienda "${store.name}" fue activada con éxito y puede operar.`);
      } else {
        toast.error(`La tienda "${store.name}" ha sido suspendida temporalmente.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Ocurrió un error al cambiar el estado de la tienda.');
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalSlug = formData.slug.toLowerCase().replace(/\s+/g, '-') || 
                       formData.name.toLowerCase().trim().replace(/\s+/g, '-');
      const finalOwnerId = formData.ownerId || `user_${Math.random().toString(36).substr(2, 9)}`;

      const existingSettings = editingStore ? (editingStore.settings || {}) : {};
      const storeData: any = {
        name: formData.name,
        slug: finalSlug,
        description: formData.description,
        ownerId: finalOwnerId,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        location: {
          province: formData.province.trim(),
          municipality: formData.municipality.trim(),
          locality: formData.locality.trim(),
        },
        commissionRate: formData.commissionRate,
        active: editingStore ? (editingStore.active !== false) : true,
        featured: editingStore ? (editingStore.featured === true) : false,
        createdAt: editingStore ? (editingStore.createdAt || Date.now()) : Date.now(),
        logo: formData.logo || null,
        banner: formData.banner || null,
        storeImage: formData.storeImage || null,
        settings: {
          ...existingSettings,
          name: formData.name,
          description: formData.description,
          phone: formData.ownerPhone,
          whatsappNumber: formData.ownerPhone.replace(/\D/g, ''),
          address: `${formData.locality ? `${formData.locality}, ` : ''}${formData.municipality}, ${formData.province}, Cuba`,
          email: formData.ownerEmail,
          enabledCurrencies: formData.enabledCurrencies,
          activePaymentMethods: formData.activePaymentMethods,
          affiliateSystemEnabled: formData.affiliateSystemEnabled,
          affiliateMode: formData.affiliateMode,
          logo: formData.logo || null,
          banner: formData.banner || null,
          storeImage: formData.storeImage || null,
        }
      };

      if (editingStore) {
        await updateDoc(doc(db, 'stores', editingStore.id), storeData);
        toast.success('¡Oye asere, tienda actualizada como un cañón!');
      } else {
        await addDoc(collection(db, 'stores'), storeData);
        toast.success('¡Tienda nuevecita de paquete generada!');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Tremendo fly asere, no se pudo guardar la tienda');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      ownerId: '',
      province: 'La Habana',
      municipality: '',
      locality: '',
      commissionRate: 5,
      enabledCurrencies: ['CUP', 'MLC'],
      activePaymentMethods: ['transfer', 'cash'],
      affiliateSystemEnabled: false,
      affiliateMode: 'recommendation',
      logo: '',
      banner: '',
      storeImage: '',
    });
    setEditingStore(null);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      slug: store.slug,
      description: store.description,
      ownerId: store.ownerId,
      ownerName: store.ownerName,
      ownerEmail: store.settings?.email || '',
      ownerPhone: store.ownerPhone,
      province: store.location.province,
      municipality: store.location.municipality,
      locality: store.location.locality,
      commissionRate: store.commissionRate || 5,
      enabledCurrencies: store.settings?.enabledCurrencies || ['CUP', 'MLC'],
      activePaymentMethods: store.settings?.activePaymentMethods || ['transfer', 'cash'],
      affiliateSystemEnabled: store.settings?.affiliateSystemEnabled || false,
      affiliateMode: store.settings?.affiliateMode || 'recommendation',
      logo: store.logo || store.settings?.logo || '',
      banner: store.banner || store.settings?.banner || '',
      storeImage: store.storeImage || store.settings?.storeImage || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro asere? Borrar una tienda es cosa seria.')) {
      try {
        await deleteDoc(doc(db, 'stores', id));
        toast.success('Tienda eliminada');
      } catch (error) {
        toast.error('No se pudo borrar la tienda');
      }
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingStore) return;
    setSubmittingPayment(true);
    try {
      await addDoc(collection(db, 'commission_payments'), {
        storeId: reconcilingStore.id,
        amountCUP: Number(paymentForm.amountCUP) || 0,
        amountMLC: Number(paymentForm.amountMLC) || 0,
        recordedAt: serverTimestamp(),
        recordedBy: "jopocmg9399@gmail.com", // Direct control
        notes: paymentForm.notes.trim() || 'Conciliación periódica regular'
      });
      toast.success(`¡Súper asere! Conciliación guardada y deducida del balance de "${reconcilingStore.name}".`);
      setIsReconcileDialogOpen(false);
      setPaymentForm({ amountCUP: 0, amountMLC: 0, notes: '' });
      setReconcilingStore(null);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo registrar la liquidación de comisión.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getStoreCommissionStats = (store: Store) => {
    const storeOrders = orders.filter(o => o.storeId === store.id && o.status === 'delivered');
    const salesCUP = storeOrders.reduce((sum, o) => sum + (o.totalCUP || 0), 0);
    const salesMLC = storeOrders.reduce((sum, o) => sum + (o.totalMLC || 0), 0);

    const rate = store.commissionRate || 5;
    const commGeneratedCUP = (salesCUP * rate) / 100;
    const commGeneratedMLC = (salesMLC * rate) / 100;

    const storePayments = payments.filter(p => p.storeId === store.id);
    const commPaidCUP = storePayments.reduce((sum, p) => sum + (p.amountCUP || 0), 0);
    const commPaidMLC = storePayments.reduce((sum, p) => sum + (p.amountMLC || 0), 0);

    const balanceCUP = commGeneratedCUP - commPaidCUP;
    const balanceMLC = commGeneratedMLC - commPaidMLC;

    return {
      ordersCount: storeOrders.length,
      salesCUP,
      salesMLC,
      commGeneratedCUP,
      commGeneratedMLC,
      commPaidCUP,
      commPaidMLC,
      balanceCUP,
      balanceMLC
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Gestión de Stores</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic">Control total de la Plaza Digital y sus afiliados.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={
            <Button className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-8 h-12 shadow-xl shadow-primary/20" nativeButton={true} />
          }>
            <Plus className="mr-2 h-4 w-4" /> Generar Tienda
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0">
            <div className="p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                  {editingStore ? 'Actualizar Negocio' : 'Alta de Nuevo Negocio'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Nombre Comercial</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: El Rey de la Pizza"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Slug (URL)</Label>
                  <Input 
                    value={formData.slug} 
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    placeholder="ej-rey-pizza"
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Descripción del Negocio</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Tienda de alimentos gourmet..."
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border dark:border-slate-800">
                <div className="col-span-full text-[10px] font-black text-indigo-600 uppercase tracking-[2px] mb-2 px-1">Diseño y Presencia (Opcional)</div>
                <div className="space-y-2 col-span-full md:col-span-1">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Logo de la Tienda (Físico o URL)</Label>
                  <ImageFileUploader 
                    value={formData.logo || ""} 
                    onChange={(url) => setFormData({...formData, logo: url})} 
                    placeholder="Sube el logo de la tienda"
                  />
                  <Input 
                    value={formData.logo} 
                    onChange={e => setFormData({...formData, logo: e.target.value})}
                    placeholder="O pega una URL"
                    className="rounded-xl mt-1 text-xs h-9"
                  />
                </div>
                <div className="space-y-2 col-span-full md:col-span-1">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Imagen de Tienda Adicional (Física o URL)</Label>
                  <ImageFileUploader 
                    value={formData.storeImage || ""} 
                    onChange={(url) => setFormData({...formData, storeImage: url})} 
                    placeholder="Sube foto adicional física"
                  />
                  <Input 
                    value={formData.storeImage} 
                    onChange={e => setFormData({...formData, storeImage: e.target.value})}
                    placeholder="O pega una URL"
                    className="rounded-xl mt-1 text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border dark:border-slate-800">
                <div className="col-span-full text-[10px] font-black text-primary uppercase tracking-[2px] mb-2 px-1">Datos del Administrador</div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Nombre Propietario</Label>
                  <Input 
                    value={formData.ownerName} 
                    onChange={e => setFormData({...formData, ownerName: e.target.value})}
                    placeholder="Nombre Completo"
                    className="rounded-xl border-dashed"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Email / Usuario</Label>
                  <Input 
                    value={formData.ownerEmail} 
                    onChange={e => setFormData({...formData, ownerEmail: e.target.value})}
                    placeholder="email@ejemplo.com"
                    className="rounded-xl border-dashed"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">ID Único (Opcional - Se genera solo)</Label>
                  <Input 
                    value={formData.ownerId} 
                    onChange={e => setFormData({...formData, ownerId: e.target.value})}
                    placeholder="Dejar vacío para auto-generar"
                    className="rounded-xl border-dashed h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Provincia</Label>
                  <select
                    className="flex w-full h-[40px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white text-xs px-3 focus:outline-none focus:ring-0"
                    value={formData.province}
                    onChange={e => setFormData({...formData, province: e.target.value})}
                  >
                    {[
                      'La Habana', 'Pinar del Río', 'Artemisa', 'Mayabeque', 'Matanzas', 
                      'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila', 
                      'Camagüey', 'Las Tunas', 'Holguín', 'Granma', 'Santiago de Cuba', 
                      'Guantánamo', 'Isla de la Juventud'
                    ].map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Municipio</Label>
                  <select
                    className="flex w-full h-[40px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white text-xs px-3 focus:outline-none focus:ring-0"
                    value={formData.municipality}
                    onChange={e => setFormData({...formData, municipality: e.target.value})}
                  >
                    {(CUBAN_PROVINCES_MUNICIPALITIES[formData.province] || ['Plaza de la Revolución']).map(muni => (
                      <option key={muni} value={muni}>{muni}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Localidad</Label>
                  <Input 
                    autoComplete="new-locality-admin"
                    name="admin_store_locality"
                    value={formData.locality} 
                    onChange={e => setFormData({...formData, locality: e.target.value})} 
                    className="rounded-xl h-[40px]" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                <div className="col-span-2 text-[10px] font-black text-indigo-600 uppercase tracking-[2px]">Políticas Financieras</div>
                
                <div className="space-y-3">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Monedas Permitidas</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['CUP', 'MLC', 'USD', 'EUR', 'ZELLE'] as Currency[]).map(cur => (
                      <Badge 
                        key={cur}
                        variant={formData.enabledCurrencies.includes(cur) ? 'default' : 'outline'}
                        className="cursor-pointer rounded-lg px-3 py-1 text-[10px] font-black"
                        onClick={() => {
                          const newCurrs = formData.enabledCurrencies.includes(cur)
                            ? formData.enabledCurrencies.filter(c => c !== cur)
                            : [...formData.enabledCurrencies, cur];
                          if (newCurrs.length > 0) setFormData({...formData, enabledCurrencies: newCurrs});
                        }}
                      >
                        {cur}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1">Métodos de Pago</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'cash' as const, label: 'EFECTIVO' },
                      { id: 'transfer' as const, label: 'TRANSFER' },
                      { id: 'zelle' as const, label: 'ZELLE' }
                    ].map(method => (
                      <Badge 
                        key={method.id}
                        variant={formData.activePaymentMethods.includes(method.id) ? 'default' : 'outline'}
                        className="cursor-pointer rounded-lg px-3 py-1 text-[10px] font-black"
                        onClick={() => {
                          const newMethods = formData.activePaymentMethods.includes(method.id)
                            ? formData.activePaymentMethods.filter(m => m !== method.id)
                            : [...formData.activePaymentMethods, method.id];
                          if (newMethods.length > 0) setFormData({...formData, activePaymentMethods: newMethods});
                        }}
                      >
                        {method.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 bg-amber-50/30 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                <div className="text-[10px] font-black text-amber-600 uppercase tracking-[2px]">Marketplace & Afiliados</div>
                
                <div className="flex items-center space-x-3 py-1 px-1">
                   <input 
                     type="checkbox" 
                     id="affiliateEnabled"
                     checked={formData.affiliateSystemEnabled}
                     onChange={e => setFormData({...formData, affiliateSystemEnabled: e.target.checked})}
                     className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                   />
                   <Label htmlFor="affiliateEnabled" className="text-xs font-black uppercase tracking-tight cursor-pointer">Activar Sistema de Afiliados</Label>
                </div>

                <div className={cn(
                  "space-y-3 transition-all",
                  !formData.affiliateSystemEnabled && "opacity-40 grayscale pointer-events-none"
                )}>
                  <Label className="font-bold text-[9px] uppercase tracking-[0.2em] ml-1 text-slate-500">Modo de Operación</Label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {[
                      { id: 'recommendation' as const, label: 'RECOMENDACIÓN', desc: 'Promoción via link o código de referido para clientes' },
                      { id: 'direct_sale' as const, label: 'VENTA DIRECTA', desc: 'Gestores de venta externos con acceso total al inventario' }
                    ].map(mode => (
                      <div 
                        key={mode.id}
                        className={cn(
                          "flex-1 flex flex-col p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300",
                          formData.affiliateMode === mode.id 
                            ? "bg-amber-500/5 border-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]" 
                            : "bg-black/5 border-transparent opacity-60 hover:opacity-100"
                        )}
                        onClick={() => setFormData({...formData, affiliateMode: mode.id})}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={cn(
                            "text-sm font-black uppercase tracking-widest",
                            formData.affiliateMode === mode.id ? "text-amber-600" : "text-slate-600"
                          )}>
                            {mode.label}
                          </span>
                          {formData.affiliateMode === mode.id && <CheckCircle2 className="h-6 w-6 text-amber-600 fill-amber-600/10" />}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 leading-tight">
                          {mode.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex-1 flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl w-full">
                  <Label className="font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Comisión Plt. (%)</Label>
                  <Input 
                    type="number"
                    value={formData.commissionRate} 
                    onChange={e => setFormData({...formData, commissionRate: parseInt(e.target.value)})}
                    className="h-10 w-20 rounded-xl bg-white text-center font-black"
                    required
                  />
                </div>
                <Button type="submit" className="w-full md:w-auto h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                  {editingStore ? 'Actualizar Tienda' : 'Construir Tienda'}
                </Button>
              </div>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  </div>

  {/* Tabs de Selección */}
  <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl max-w-sm shadow-inner border border-slate-200/50 dark:border-slate-800 mt-2">
        <button
          onClick={() => setActiveTab('stores')}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            activeTab === 'stores'
              ? "bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white shadow-md"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Building className="h-3.5 w-3.5 text-amber-500" />
          Tiendas y Comisiones
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            activeTab === 'commissions'
              ? "bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white shadow-md"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Coins className="h-3.5 w-3.5 text-emerald-500" />
          Historial y Conciliación
        </button>
      </div>

      {activeTab === 'stores' ? (
        <>
          {/* Panel de Comisiones Integrado de la Plaza */}
          <Card className="rounded-[2.5rem] border-0 bg-slate-900 text-white shadow-xl overflow-hidden relative">
            <CardHeader className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                   <Percent className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                   <CardTitle className="text-xl font-black uppercase tracking-tight">Comisiones Pactadas</CardTitle>
                   <p className="text-slate-450 text-[10px] font-bold uppercase tracking-widest mt-1">Tasas individuales de recaudación sobre ventas. Solo modificable por la administración.</p>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 pt-0">
              <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/40">
                <Table className="text-white min-w-full">
                  <TableHeader className="border-slate-800 bg-slate-950">
                    <TableRow className="border-slate-800 hover:bg-slate-950">
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-3">Negocio</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-3">Administrador</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest text-center py-3">Tasa Actual</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest text-right py-3 pr-6">Acción de Ajuste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map(store => (
                      <CommissionRow key={store.id} store={store} />
                    ))}
                    {stores.length === 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                          No hay negocios registrados para comisionar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map(store => {
              const logoUrl = store.logo || store.settings?.logo;
              return (
                <Card key={store.id} className="rounded-[2.5rem] overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col justify-between">
                  <div>
                    <CardHeader className="p-6 sm:p-8 pb-4">
                      <div className="flex items-center justify-between mb-4">
                         <Badge 
                           className={cn(
                             "border-none rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest cursor-pointer hover:opacity-85 transition-all active:scale-95",
                             store.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                           )}
                           onClick={() => handleToggleActive(store)}
                           title="Haz click para cambiar el estado"
                         >
                           {store.active ? '● OPERATIVO' : '● SUSPENDIDO'}
                         </Badge>
                         <div className="flex gap-2">
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-50" onClick={() => handleEdit(store)}>
                             <Edit className="h-4 w-4 text-slate-400" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-50 text-rose-500" onClick={() => handleDelete(store.id)}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                      </div>
                      
                      <div className="flex items-start gap-4 mt-2 mb-2">
                        <div className="flex gap-2 shrink-0">
                          {logoUrl ? (
                            <div className="h-14 w-14 p-1.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm shrink-0" title="Logo">
                              <img src={getProxyImageUrl(logoUrl)} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0" title="Logo vacío">
                              <StoreReactIcon className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          {(store.storeImage || store.settings?.storeImage) && (
                            <div className="h-14 w-20 p-0.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden shrink-0" title="Imagen de Tienda">
                              <img src={getProxyImageUrl(store.storeImage || store.settings?.storeImage)} alt="" className="h-full w-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight line-clamp-2">{store.name}</CardTitle>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{formatLocation(store.location)}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 sm:p-8 pt-2 pb-4">
                      <p className="text-sm text-slate-500 mb-6 font-medium line-clamp-2 italic">
                        "{store.description}"
                      </p>
                      
                      <div className="space-y-3 pt-6 border-t dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 max-w-[65%]">
                            <User className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 truncate" title={store.ownerName}>Admin: {store.ownerName}</span>
                          </div>
                          <Badge variant="outline" className="rounded-lg text-[10px] font-bold border-slate-200 shrink-0">
                            ID: {store.ownerId.substring(0, 8)}...
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">Comisión:</span>
                          </div>
                          <span className="font-black text-emerald-600">{store.commissionRate || 5}%</span>
                        </div>
                        <div className="pt-2 min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">URL de Acceso Directo:</span>
                          <code className="text-[9px] bg-slate-50 dark:bg-slate-950 p-2 rounded-lg block border border-slate-100 dark:border-slate-800 text-primary font-bold break-all whitespace-normal select-all leading-normal" title="Haz doble click para copiar el enlace">
                            {window.location.origin}/store/{store.slug}
                          </code>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  <div className="px-6 sm:px-8 pb-8">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        variant="outline" 
                        className="w-full sm:flex-1 rounded-xl h-12 border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/5" 
                        onClick={() => setBackupStore(store)}
                      >
                        <Database className="mr-2 h-4 w-4" /> Copias
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full sm:flex-1 rounded-xl h-12 border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest" 
                        render={<Link to={`/store/${store.slug}`} />}
                        nativeButton={false}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> Visitar
                      </Button>
                      <Button 
                        className="w-full sm:flex-1 rounded-xl h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20" 
                        render={<Link to={`/Dashboard?manageStoreId=${store.id}`} />}
                        nativeButton={false}
                      >
                        <LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Administrar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {stores.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                 <Building className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">No hay tiendas operando</h3>
                 <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Empieza generando la primera tienda para el Mercado.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-8">
          {/* Global Commission Reconciliation Dashboard Stats */}
          {(() => {
            const globalComms = stores.reduce((acc, st) => {
              const stats = getStoreCommissionStats(st);
              acc.salesCUP += stats.salesCUP;
              acc.salesMLC += stats.salesMLC;
              acc.commGeneratedCUP += stats.commGeneratedCUP;
              acc.commGeneratedMLC += stats.commGeneratedMLC;
              acc.commPaidCUP += stats.commPaidCUP;
              acc.commPaidMLC += stats.commPaidMLC;
              acc.balanceCUP += stats.balanceCUP;
              acc.balanceMLC += stats.balanceMLC;
              acc.ordersCount += stats.ordersCount;
              return acc;
            }, {
              salesCUP: 0,
              salesMLC: 0,
              commGeneratedCUP: 0,
              commGeneratedMLC: 0,
              commPaidCUP: 0,
              commPaidMLC: 0,
              balanceCUP: 0,
              balanceMLC: 0,
              ordersCount: 0
            });

            const statsItems = [
              {
                title: "Ventas Entregadas (CUP / MLC)",
                value: `${globalComms.salesCUP.toLocaleString()} CUP / ${globalComms.salesMLC.toLocaleString()} MLC`,
                desc: `Generadas en ${globalComms.ordersCount} entregas finalizadas`,
                color: "text-amber-500 bg-amber-500/10"
              },
              {
                title: "Comisiones Totales (CUP / MLC)",
                value: `${globalComms.commGeneratedCUP.toLocaleString()} CUP / ${globalComms.commGeneratedMLC.toLocaleString()} MLC`,
                desc: "Ingresos previstos por acuerdo de plataforma",
                color: "text-indigo-500 bg-indigo-500/10"
              },
              {
                title: "Comisión Conciliada (CUP / MLC)",
                value: `${globalComms.commPaidCUP.toLocaleString()} CUP / ${globalComms.commPaidMLC.toLocaleString()} MLC`,
                desc: "Monto total liquidado por los negocios",
                color: "text-emerald-500 bg-emerald-500/10"
              },
              {
                title: "Saldo Pendiente de Cobro",
                value: `${globalComms.balanceCUP.toLocaleString()} CUP / ${globalComms.balanceMLC.toLocaleString()} MLC`,
                desc: "Cuentas por cobrar vigentes de la Plaza",
                color: "text-rose-500 bg-rose-500/10"
              }
            ];

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsItems.map((item, idx) => (
                  <Card key={idx} className="rounded-[2rem] border-0 bg-white dark:bg-slate-900 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <span className={cn("p-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-block mb-3", item.color)}>
                        {item.title}
                      </span>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-snug">
                        {item.value}
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wide mt-4">
                      {item.desc}
                    </p>
                  </Card>
                ))}
              </div>
            );
          })()}

          {/* Table list for directory reconciliation and quick actions */}
          <Card className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Liquidación de Comisiones</CardTitle>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Dirección de saldos, cobros acumulados y conciliación con el administrador de cada negocio.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                    <TableRow className="hover:bg-transparent border-slate-110 dark:border-slate-800">
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-4 pl-8">Negocio / Contacto</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-4 text-center">Tasa</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-4 text-center">Entregas</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-4 text-right">Comisión Devengada</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-4 text-right">Monto Conciliado</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-4 text-right">Saldo Pendiente</TableHead>
                      <TableHead className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest py-4 text-right pr-8">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map(store => {
                      const stats = getStoreCommissionStats(store);
                      const isPending = stats.balanceCUP > 0 || stats.balanceMLC > 0;
                      return (
                        <TableRow key={store.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <TableCell className="py-4 pl-8">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 uppercase",
                                store.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                              )}>
                                {store.name.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[160px]">{store.name}</p>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Encargado: {store.ownerName}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-4 font-black text-slate-800 dark:text-slate-200 text-xs">
                            {store.commissionRate || 5}%
                          </TableCell>
                          <TableCell className="text-center py-4 text-xs font-bold font-mono text-slate-500">
                            {stats.ordersCount}
                          </TableCell>
                          <TableCell className="text-right py-4 font-extrabold text-xs">
                            <p className="text-slate-900 dark:text-slate-100">{stats.commGeneratedCUP.toLocaleString()} CUP</p>
                            <p className="text-slate-450 dark:text-slate-500 font-semibold font-mono text-[9px]">{stats.commGeneratedMLC.toLocaleString()} MLC</p>
                          </TableCell>
                          <TableCell className="text-right py-4 font-bold text-xs text-emerald-600">
                            <p>{stats.commPaidCUP.toLocaleString()} CUP</p>
                            <p className="font-semibold font-mono text-[9px] text-emerald-500/80">{stats.commPaidMLC.toLocaleString()} MLC</p>
                          </TableCell>
                          <TableCell className="text-right py-4 font-black text-xs">
                            <p className={isPending ? "text-rose-600" : "text-slate-500"}>
                              {stats.balanceCUP.toLocaleString()} CUP
                            </p>
                            <p className={cn("font-mono text-[9px]", isPending ? "text-rose-500" : "text-slate-500")}>
                              {stats.balanceMLC.toLocaleString()} MLC
                            </p>
                          </TableCell>
                          <TableCell className="py-4 text-right pr-8">
                            <div className="flex items-center justify-end gap-2">
                              {/* Power Toggle to activate or suspend from here */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className={cn(
                                  "h-9 w-9 rounded-xl transition-all",
                                  store.active ? "text-emerald-500 hover:bg-emerald-50" : "text-rose-500 hover:bg-rose-50"
                                )}
                                onClick={() => handleToggleActive(store)}
                                title={store.active ? "Suspender Negocio" : "Activar Negocio"}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                className="h-9 px-3 rounded-xl font-black text-[9px] uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm active:scale-95 transition-all"
                                onClick={() => {
                                  setReconcilingStore(store);
                                  setIsReconcileDialogOpen(true);
                                }}
                              >
                                Conciliar
                              </Button>
                              <Button
                                variant="outline"
                                className="h-9 px-3 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                                onClick={() => {
                                  setHistoryStore(store);
                                  setIsHistoryDialogOpen(true);
                                }}
                              >
                                <History className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {stores.length === 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                          No hay negocios para conciliar comisiones.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reconcile Payment (Conciliar) Dialog */}
      <Dialog open={isReconcileDialogOpen} onOpenChange={(open) => { setIsReconcileDialogOpen(open); if(!open) setReconcilingStore(null); }}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl border-none">
          {reconcilingStore && (
            <div className="p-8">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900 dark:text-white mb-2">
                  <Coins className="h-5 w-5 text-emerald-500" />
                  <span>Registrar Liquidación de Comisión</span>
                </DialogTitle>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest">Registra el pago de comisión recibido para {reconcilingStore.name}</p>
              </DialogHeader>
              
              <form onSubmit={handleRegisterPayment} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-450 dark:text-slate-500">Monto Recaudado CUP</Label>
                    <Input
                      type="number"
                      min="0"
                      value={paymentForm.amountCUP}
                      onChange={e => setPaymentForm({...paymentForm, amountCUP: Number(e.target.value) || 0})}
                      placeholder="0.00"
                      className="rounded-xl h-11 border-2 border-slate-100 dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-450 dark:text-slate-500">Monto Recaudado MLC</Label>
                    <Input
                      type="number"
                      min="0"
                      value={paymentForm.amountMLC}
                      onChange={e => setPaymentForm({...paymentForm, amountMLC: Number(e.target.value) || 0})}
                      placeholder="0.00"
                      className="rounded-xl h-11 border-2 border-slate-100 dark:border-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-455 dark:text-slate-500">Notas de la Conciliación</Label>
                  <Input
                    value={paymentForm.notes}
                    onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                    placeholder="Ej: Pago de comisiones semana del 10 al 17 de mayo"
                    className="rounded-xl h-11 border-2 border-slate-100 dark:border-slate-800"
                  />
                </div>

                <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-11 px-5 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                    onClick={() => {
                      setIsReconcileDialogOpen(false);
                      setReconcilingStore(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submittingPayment} 
                    className="rounded-xl font-black text-[10px] uppercase tracking-widest h-11 px-8 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-95 disabled:opacity-45 transition-all"
                  >
                    {submittingPayment ? "Procesando..." : "Sellar Liquidación"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History of Commission Payments Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={(open) => { setIsHistoryDialogOpen(open); if(!open) setHistoryStore(null); }}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl border-none">
          {historyStore && (
            <div className="p-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900 dark:text-white">
                  <History className="h-5 w-5 text-indigo-500" />
                  <span>Historial de Liquidaciones: {historyStore.name}</span>
                </DialogTitle>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mt-1">Registro cronológico de comisiones conciliadas e ingresadas por administración.</p>
              </DialogHeader>

              <div className="max-h-[50vh] overflow-y-auto rounded-3xl border border-slate-100 dark:border-slate-800">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-950/20">
                    <TableRow className="border-b border-slate-100 dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-450 font-extrabold text-[8px] uppercase tracking-wider pl-6 py-3">Fecha Registrada</TableHead>
                      <TableHead className="text-slate-450 font-extrabold text-[8px] uppercase tracking-wider py-3">Monto CUP / MLC</TableHead>
                      <TableHead className="text-slate-450 font-extrabold text-[8px] uppercase tracking-wider py-3">Concepto / Notas</TableHead>
                      <TableHead className="text-slate-450 font-extrabold text-[8px] uppercase tracking-wider py-3 text-right pr-6">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const list = payments.filter(p => p.storeId === historyStore.id);
                      // Sort descending by recordedAt
                      list.sort((a,b) => {
                        const tA = a.recordedAt?.seconds ? a.recordedAt.seconds * 1000 : (a.recordedAt || Date.now());
                        const tB = b.recordedAt?.seconds ? b.recordedAt.seconds * 1000 : (b.recordedAt || Date.now());
                        return tB - tA;
                      });

                      return list.map(pm => {
                        let dateStr = 'Fecha inválida';
                        try {
                          if (pm.recordedAt?.toDate) dateStr = format(pm.recordedAt.toDate(), 'dd MMM yyyy, hh:mm a', { locale: es });
                          else if (pm.recordedAt?.seconds) dateStr = format(new Date(pm.recordedAt.seconds * 1000), 'dd MMM yyyy, hh:mm a', { locale: es });
                          else if (pm.recordedAt) dateStr = format(new Date(pm.recordedAt), 'dd MMM yyyy, hh:mm a', { locale: es });
                        } catch (e) {}

                        return (
                          <TableRow key={pm.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/20">
                            <TableCell className="pl-6 py-3 font-semibold text-xs text-slate-700 dark:text-slate-300">
                              <p className="font-bold">{dateStr}</p>
                              <span className="text-[9px] text-slate-400">Por: {pm.recordedBy}</span>
                            </TableCell>
                            <TableCell className="py-3 font-bold text-xs text-emerald-600">
                              <p>{pm.amountCUP.toLocaleString()} CUP</p>
                              <p className="text-[9px] text-emerald-500 font-mono font-medium">{pm.amountMLC.toLocaleString()} MLC</p>
                            </TableCell>
                            <TableCell className="py-3 text-xs italic text-slate-500 font-medium max-w-[120px] truncate" title={pm.notes}>
                              {pm.notes || "Liquidación de comisión"}
                            </TableCell>
                            <TableCell className="py-3 text-right pr-6">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg hover:text-rose-600"
                                onClick={async () => {
                                  if (confirm("¿Quieres anular e invalidar este abono de comisión, asere? Se revertirá en el balance.")) {
                                    try {
                                      await deleteDoc(doc(db, "commission_payments", pm.id));
                                      toast.success("Pago de comisión anulado.");
                                    } catch (err) {
                                      toast.error("No se pudo anular la conciliación.");
                                    }
                                  }
                                }}
                                title="Anular entrada"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}

                    {payments.filter(p => p.storeId === historyStore.id).length === 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400 font-bold uppercase text-[10px] tracking-widest pl-6 pr-6">
                          No tienes abonos cargados para este negocio.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-11 px-8 bg-slate-900 hover:bg-slate-850 text-white"
                  onClick={() => {
                    setIsHistoryDialogOpen(false);
                    setHistoryStore(null);
                  }}
                >
                  Cerrar Historial
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for Backup & Restore */}
      <Dialog open={backupStore !== null} onOpenChange={(open) => { if (!open) setBackupStore(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 bg-white dark:bg-slate-900 border-none shadow-2xl">
          {backupStore && (
            <div className="p-8 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900 dark:text-white">
                  <Database className="h-6 w-6 text-primary" />
                  <span>Respaldo y Recuperación: {backupStore.name}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <StoreBackupRestore storeId={backupStore.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommissionRow({ store }: { store: Store; key?: any }) {
  const [rate, setRate] = useState(store.commissionRate || 5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRate(store.commissionRate || 5);
  }, [store.commissionRate]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        commissionRate: rate
      });
      toast.success(`Comisión de "${store.name}" actualizada al ${rate}%`);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar la comisión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow className="border-slate-800/50 hover:bg-slate-850/50 transition-colors">
      <TableCell className="font-bold py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center font-black text-xs text-primary shrink-0 uppercase">
            {store.name.substring(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white uppercase tracking-tight block truncate max-w-[150px]" title={store.name}>{store.name}</p>
            <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase block">{store.location.province}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-slate-300 font-semibold text-xs py-3">
        <p className="text-white truncate max-w-[120px] font-bold" title={store.ownerName}>{store.ownerName}</p>
        <span className="text-[9px] text-slate-400 font-medium font-mono">ID: {store.ownerId?.substring(0, 8)}...</span>
      </TableCell>
      <TableCell className="text-center py-3">
        <span className="inline-block bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-black text-xs">
          {store.commissionRate || 5}%
        </span>
      </TableCell>
      <TableCell className="py-3 text-right">
        <div className="flex items-center justify-end gap-3 pr-2">
          <Input
            type="number"
            min="0"
            max="100"
            value={rate}
            onChange={(e) => setRate(parseInt(e.target.value) || 0)}
            className="w-20 text-center font-black bg-slate-850 border-slate-700 text-white rounded-xl focus:ring-primary focus:border-primary h-9 text-xs"
          />
          <Button
            onClick={handleUpdate}
            disabled={saving || rate === store.commissionRate}
            className="h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? '...' : 'Guardar'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
