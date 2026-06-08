import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut,
  Menu,
  Store as StoreIcon,
  User as UserIcon,
  Truck,
  Users,
  Sparkles,
  Building2,
  HelpCircle,
  Search as SearchIcon,
  GitBranch,
  Tag
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn, getProxyImageUrl } from "../lib/utils";
import Overview from '../components/dashboard/Overview';
import ProductManager from '../components/dashboard/ProductManager';
import OrderManager from '../components/dashboard/OrderManager';
import InventoryManager from '../components/dashboard/InventoryManager';
import DispatchManager from '../components/dashboard/DispatchManager';
import SettingsManager from '../components/dashboard/SettingsManager';
import SupplierManager from '../components/dashboard/SupplierManager';
import AffiliateManager from '../components/dashboard/AffiliateManager';
import ClientManager from '../components/dashboard/ClientManager';
import StoreManager from '../components/dashboard/StoreManager';
import GlobalExplorer from '../components/dashboard/GlobalExplorer';
import PlatformSupport from '../components/dashboard/PlatformSupport';
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useUserStore } from '../hooks/useStoreSettings';
import { db, logout, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, doc, addDoc, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Store as StoreLucideIcon } from "lucide-react";

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

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const isPlatformOwner = user?.email === 'jopocmg9399@gmail.com';
  
  // Platform owner might be managing a specific store passed in URL
  const manageStoreId = searchParams.get('manageStoreId');
  const forceStoreView = !!manageStoreId || searchParams.get('storeId') === 'active';
  const showPlatformOwnerView = isPlatformOwner && !forceStoreView;

  // If platform owner is forcing store view, we use that storeId. Otherwise, use the user's store.
  const effectiveStoreUid = (isPlatformOwner && manageStoreId) ? null : user?.uid;
  const { store: userStore, loading: loadingStore } = useUserStore(effectiveStoreUid);
  const [targetStore, setTargetStore] = useState<any>(null);
  const [loadingTarget, setLoadingTarget] = useState(false);

  // Fetch target store if platform owner is managing a specific one
  useEffect(() => {
    if (isPlatformOwner && manageStoreId) {
      setLoadingTarget(true);
      const q = query(collection(db, 'stores'), where('__name__', '==', manageStoreId));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setTargetStore({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
        setLoadingTarget(false);
      }, (error) => {
        setLoadingTarget(false);
        try { handleFirestoreError(error, OperationType.GET, `stores/${manageStoreId}`); } catch (e) {}
      });
      return unsub;
    }
  }, [isPlatformOwner, manageStoreId]);

  const activeStore = (isPlatformOwner && targetStore) ? targetStore : userStore;
  const isLoading = loading || (user && (loadingStore || loadingTarget));

  // Store Creation Flow State
  const createStoreParam = searchParams.get('createStore') === 'true';
  const [createStoreName, setCreateStoreName] = useState('');
  const [createStoreSlug, setCreateStoreSlug] = useState('');
  const [createStoreDesc, setCreateStoreDesc] = useState('');
  const [createOwnerPhone, setCreateOwnerPhone] = useState('');
  const [createProvince, setCreateProvince] = useState('La Habana');
  const [createMunicipality, setCreateMunicipality] = useState('Plaza de la Revolución');
  const [createLocality, setCreateLocality] = useState('');
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);

  // Sync municipality options when province changes
  useEffect(() => {
    const availableMunis = CUBAN_PROVINCES_MUNICIPALITIES[createProvince] || [];
    if (availableMunis.length > 0) {
      if (!availableMunis.includes(createMunicipality)) {
        setCreateMunicipality(availableMunis[0]);
      }
    } else {
      setCreateMunicipality('');
    }
  }, [createProvince]);

  // Auto-generate slug from name
  useEffect(() => {
    if (createStoreName) {
      const gSlug = createStoreName
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setCreateStoreSlug(gSlug);
    }
  }, [createStoreName]);

  const handleCreateStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStoreName.trim() || !createStoreSlug.trim() || !createOwnerPhone.trim() || !createMunicipality.trim()) {
      toast.error('¡Oye asere! Rellena todos los campos requeridos para poder montar tu negocio.');
      return;
    }

    setIsSubmittingStore(true);
    try {
      // Check if slug is unique
      const slugQuery = query(collection(db, 'stores'), where('slug', '==', createStoreSlug.toLowerCase().trim()));
      const slugSnap = await getDocs(slugQuery);
      if (!slugSnap.empty) {
        toast.error('Oye, ese nombre de enlace/slug ya existe en PaTí. ¡Búscate otro con más de chispa!');
        setIsSubmittingStore(false);
        return;
      }

      const storeData = {
        name: createStoreName.trim(),
        slug: createStoreSlug.toLowerCase().trim(),
        description: createStoreDesc.trim(),
        ownerId: user?.uid || '',
        ownerName: user?.displayName || 'Propietario',
        ownerPhone: createOwnerPhone.trim(),
        location: {
          province: createProvince.trim(),
          municipality: createMunicipality.trim(),
          locality: createLocality.trim(),
        },
        commissionRate: 5,
        active: true,
        featured: false,
        createdAt: Date.now(),
        settings: {
          name: createStoreName.trim(),
          description: createStoreDesc.trim(),
          phone: createOwnerPhone.trim(),
          whatsappNumber: createOwnerPhone.replace(/\D/g, ''),
          address: `${createLocality ? `${createLocality}, ` : ''}${createMunicipality}, ${createProvince}, Cuba`,
          email: user?.email || '',
          cupPaymentInstructions: 'Pagar via Transfermóvil',
          mlcPaymentInstructions: 'Pagar via Transferencia MLC',
          mainCurrency: 'CUP',
          enabledCurrencies: ['CUP', 'MLC'],
          exchangeRates: { 'MLC': 1, 'USD': 350 },
          activePaymentMethods: ['transfer', 'cash'],
          affiliateSystemEnabled: false,
          affiliateMode: 'recommendation',
          zelleInstructions: '',
        }
      };

      await addDoc(collection(db, 'stores'), storeData);
      toast.success('¡Qué clase de negocio, asere! Tu tienda "PaTí" ha sido creada con éxito.');
      
      // Navigate to /Dashboard so the newly created store is immediately selected/loaded
      navigate('/Dashboard', { replace: true });
    } catch (error) {
      console.error(error);
      toast.error('No se pudo registrar la tienda, asere.');
    } finally {
      setIsSubmittingStore(false);
    }
  };

  const [platformLogo, setPlatformLogo] = useState<string>('');
  const [platformName, setPlatformName] = useState<string>('');
  const [currentPlatformVer, setCurrentPlatformVer] = useState<string>('');
  const [allReleases, setAllReleases] = useState<any[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeRelease, setActiveRelease] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubPlat = onSnapshot(doc(db, 'platform_settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPlatformLogo(data?.logo || '');
        setPlatformName(data?.name || '');
        setCurrentPlatformVer(data?.currentVersion || '1.1.0');
        setAllReleases(data?.releases || []);
      }
    });
    return unsubPlat;
  }, []);

  useEffect(() => {
    if (currentPlatformVer) {
      const lastSeen = localStorage.getItem('pati_last_seen_version');
      if (lastSeen !== currentPlatformVer) {
        // Encontrar noticia de actualización que calce con esta versión, o en su defecto la primera de la lista
        const matchingRel = allReleases.find(r => r.version === currentPlatformVer) || allReleases[0];
        if (matchingRel) {
          setActiveRelease(matchingRel);
          const timer = setTimeout(() => {
            setShowUpdateModal(true);
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [currentPlatformVer, allReleases]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada');
      navigate('/');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Determinar si entra en flujo de creación de tienda (porque hizo click en el botón "Quiero mi tienda PaTí" o porque no tiene tienda registrada siendo usuario normal)
  const isCreatingNewStore = createStoreParam || (!isPlatformOwner && !activeStore);

  if (isCreatingNewStore) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 py-12 md:p-8 relative">
        <div className="absolute top-6 left-6 flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" className="h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest bg-white dark:bg-slate-900 border-slate-200">
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Inicio
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <Card className="w-full max-w-2xl border-2 border-slate-100 dark:border-slate-800 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-slate-50/60 dark:bg-slate-800/50 border-b-2 border-slate-100 dark:border-slate-800 p-8 md:p-10 text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 text-primary animate-pulse">
              <StoreLucideIcon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              Crea tu Tienda PaTí 🇨🇺
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-sm max-w-md mx-auto">
              Diseña y lanza tu propia plaza digital de productos en minutos. Llena los datos básicos para configurar tu tienda personalizada.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 md:p-10">
            <form onSubmit={handleCreateStoreSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Store Name */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Nombre de tu Negocio *
                  </Label>
                  <Input
                    required
                    placeholder="e.g. Mi Combo Cubano, El Bodegón Criollo"
                    className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-150 rounded-2xl font-black text-slate-900 dark:text-white"
                    value={createStoreName}
                    onChange={(e) => setCreateStoreName(e.target.value)}
                  />
                </div>

                {/* Enlace de tu tienda */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Enlace de tu Tienda (Slug Url) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-450 dark:text-slate-400 font-mono">
                      /store/
                    </span>
                    <Input
                      required
                      placeholder="mi-combo-cubano"
                      className="h-12 pl-16 bg-slate-50 dark:bg-slate-950 border-2 border-slate-150 rounded-2xl font-black text-slate-900 dark:text-white font-mono lowercase"
                      value={createStoreSlug}
                      onChange={(e) => {
                        const cleaned = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-0-]/g, '');
                        setCreateStoreSlug(cleaned);
                      }}
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Teléfono / WhatsApp * (sin el +)
                  </Label>
                  <Input
                    required
                    maxLength={15}
                    placeholder="e.g. 5351234567"
                    className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-150 rounded-2xl font-black text-slate-900 dark:text-white font-mono"
                    value={createOwnerPhone}
                    onChange={(e) => setCreateOwnerPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                {/* Province */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Provincia *
                  </Label>
                  <select
                    className="flex w-full h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-150 dark:border-slate-800 rounded-2xl font-black text-slate-900 dark:text-white text-sm px-4 focus:outline-none focus:ring-0"
                    value={createProvince}
                    onChange={(e) => setCreateProvince(e.target.value)}
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

                {/* Municipio */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Municipio *
                  </Label>
                  <select
                    className="flex w-full h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-150 dark:border-slate-800 rounded-2xl font-black text-slate-900 dark:text-white text-sm px-4 focus:outline-none focus:ring-0"
                    value={createMunicipality}
                    onChange={(e) => setCreateMunicipality(e.target.value)}
                  >
                    {(CUBAN_PROVINCES_MUNICIPALITIES[createProvince] || ['Plaza de la Revolución']).map(muni => (
                      <option key={muni} value={muni}>{muni}</option>
                    ))}
                  </select>
                </div>

                {/* Localidad / Reparto */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Localidad / Reparto (Opcional)
                  </Label>
                  <Input
                    autoComplete="new-locality-field"
                    name="custom_create_locality"
                    placeholder="e.g. Vedado, Reparto San Matías"
                    className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-150 rounded-2xl font-black text-slate-900 dark:text-white"
                    value={createLocality}
                    onChange={(e) => setCreateLocality(e.target.value)}
                  />
                </div>

              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Descripción o Slogan del Negocio *
                </Label>
                <Textarea
                  required
                  rows={3}
                  placeholder="Explícales a tus clientes qué vendes (e.g., combos cárnicos de excelencia, verduras frescas, aseo nacional e importado)."
                  className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-150 rounded-2xl font-medium text-slate-800 dark:text-slate-200 text-xs p-4"
                  value={createStoreDesc}
                  onChange={(e) => setCreateStoreDesc(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                {activeStore || isPlatformOwner ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200"
                    onClick={() => {
                      const nextParams = new URLSearchParams();
                      searchParams.forEach((val, key) => {
                        if (key !== 'createStore') {
                          nextParams.set(key, val);
                        }
                      });
                      setSearchParams(nextParams, { replace: true });
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  disabled={isSubmittingStore}
                  className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20"
                >
                  {isSubmittingStore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando Tu Tienda...
                    </>
                  ) : (
                    '¡Lanzar Mi Tienda PaTí! 🚀'
                  )}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = showPlatformOwnerView ? [
    { label: 'Inicio', icon: Building2, path: '/Dashboard' },
    { label: 'Negocios', icon: StoreIcon, path: '/Dashboard/stores' },
    { label: 'Configuración', icon: Settings, path: '/Dashboard/platform-settings' },
    { label: 'Explorador', icon: SearchIcon, path: '/Dashboard/search' },
    { label: 'Soporte', icon: HelpCircle, path: '/Dashboard/help' },
  ] : [
    { label: 'Inicio', icon: LayoutDashboard, path: '/Dashboard' },
    { label: 'Catálogo', icon: Package, path: '/Dashboard/products' },
    { label: 'Afiliados', icon: Users, path: '/Dashboard/affiliates' },
    { label: 'Proveedores', icon: Building2, path: '/Dashboard/suppliers' },
    { label: 'Almacén', icon: StoreIcon, path: '/Dashboard/inventory' },
    { label: 'Clientes', icon: UserIcon, path: '/Dashboard/clients' },
    { label: 'Pedidos', icon: ShoppingCart, path: '/Dashboard/orders' },
    { label: 'Despacho', icon: Truck, path: '/Dashboard/dispatch' },
    { label: 'Configuración', icon: Settings, path: '/Dashboard/settings' },
  ];

  const sidebarSettings = showPlatformOwnerView ? {
    name: 'Admin PaTí: Plaza',
    logo: '/pati-logo.png', // Logo conceptual de la plataforma
  } : activeStore?.settings;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <Sidebar 
          settings={sidebarSettings} 
          user={user} 
          navItems={navItems} 
          location={location} 
          onLogout={handleLogout} 
          isAdmin={showPlatformOwnerView}
          platformLogo={platformLogo}
          platformName={platformName}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 w-full overflow-x-hidden">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-20 items-center justify-between px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-2">
             <Badge className="bg-primary/10 text-primary border-none rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest">
               {showPlatformOwnerView ? 'Panel de Plataforma' : `Dashboard Tienda: ${activeStore?.name}`}
             </Badge>
             {isPlatformOwner && forceStoreView && (
               <Button variant="outline" size="sm" onClick={() => navigate('/Dashboard')} className="h-8 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 border-slate-200 shadow-sm active:scale-95 transition-all">
                  ← Volver al Control Global
               </Button>
             )}
          </div>
          <div className="flex items-center gap-4">
            {/* Clickable Version History Badge */}
            <Badge 
              className="gap-1.5 rounded-full select-none cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 border-none font-black text-[9px] uppercase tracking-wider py-1.5 px-3 transition-colors active:scale-95 duration-200"
              onClick={() => {
                const latestRel = allReleases[0];
                if (latestRel) {
                  setActiveRelease(latestRel);
                  setShowUpdateModal(true);
                } else {
                  toast.info("No hay novedades registradas de v" + (currentPlatformVer || '1.1.0'));
                }
              }}
            >
              <GitBranch className="h-3 w-3 text-primary animate-pulse" /> PaTí v{currentPlatformVer || '1.1.0'}
            </Badge>

            <ThemeToggle />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">{user?.displayName || 'Admin'}</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none">Status: Verificado</span>
            </div>
          </div>
        </header>
        
        {/* Mobile Header - Improved to respect platform vs store view */}
        <header className="flex md:hidden h-16 items-center justify-between px-6 bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-30">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger render={
              <Button variant="ghost" size="icon" className="rounded-xl" nativeButton={true} />
            }>
              <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r-0 rounded-r-[2.5rem]">
              <Sidebar 
                settings={sidebarSettings} 
                user={user} 
                navItems={navItems} 
                location={location} 
                onLogout={handleLogout} 
                isAdmin={showPlatformOwnerView}
                platformLogo={platformLogo}
                platformName={platformName}
                onItemClick={() => setMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-none rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
              {showPlatformOwnerView ? 'Plaza' : activeStore?.name}
            </Badge>
            {isPlatformOwner && forceStoreView && (
              <Button variant="outline" size="sm" onClick={() => navigate('/Dashboard')} className="h-7 rounded-lg px-2 text-[8px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 border-slate-200 shadow-sm active:scale-95 transition-all">
                ← Global
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              className="gap-1 rounded-full select-none cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-none font-black text-[9px] uppercase tracking-wider py-1 px-2.5 transition-all active:scale-95 duration-200"
              onClick={() => {
                const latestRel = allReleases[0];
                if (latestRel) {
                  setActiveRelease(latestRel);
                  setShowUpdateModal(true);
                } else {
                  toast.info("No hay novedades");
                }
              }}
            >
              <GitBranch className="h-3 w-3 text-primary animate-pulse" /> v{currentPlatformVer || '1.1.0'}
            </Badge>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full pb-24">
          <Routes>
            {showPlatformOwnerView ? (
              <>
                <Route path="/" element={<Overview platformMode />} />
                <Route path="stores" element={<StoreManager />} />
                <Route path="platform-settings" element={<SettingsManager platformMode />} />
                <Route path="search" element={<GlobalExplorer />} />
                <Route path="help" element={<PlatformSupport />} />
                <Route path="*" element={<Navigate to="/Dashboard" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Overview storeId={activeStore?.id} />} />
                <Route path="products" element={<ProductManager storeId={activeStore?.id} />} />
                <Route path="affiliates" element={<AffiliateManager storeId={activeStore?.id} />} />
                <Route path="suppliers" element={<SupplierManager storeId={activeStore?.id} />} />
                <Route path="inventory" element={<InventoryManager storeId={activeStore?.id} />} />
                <Route path="orders" element={<OrderManager storeId={activeStore?.id} />} />
                <Route path="dispatch" element={<DispatchManager storeId={activeStore?.id} />} />
                <Route path="clients" element={<ClientManager storeId={activeStore?.id} />} />
                <Route path="settings" element={<SettingsManager storeId={activeStore?.id} />} />
                <Route path="*" element={<Navigate to="/Dashboard" replace />} />
              </>
            )}
          </Routes>
        </main>
      </div>

      {/* DIALOG DE ACTUALIZACIONES (MODAL) */}
      {showUpdateModal && activeRelease && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in transition-all">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden transform scale-100 transition-all p-8 md:p-10 space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <Badge className="bg-primary hover:bg-primary text-white font-black uppercase text-[8px] tracking-wider mb-0.5">Novedades en PaTí</Badge>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-300 font-mono tracking-tighter uppercase leading-none">Versión {activeRelease.version}</h3>
                </div>
              </div>
              <Badge className={cn(
                "hidden sm:flex font-bold text-[8px] uppercase tracking-wider border",
                activeRelease.impact === 'high' ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400" :
                activeRelease.impact === 'medium' ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400" :
                "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
              )}>
                {activeRelease.impact === 'high' ? '⚠️ Importante' : activeRelease.impact === 'medium' ? '💡 Recomendable' : '✅ Menor'}
              </Badge>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight leading-snug">
                {activeRelease.title}
              </h2>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                ¡Oye asere, mira las bondades de esta actualización! Diseñada con chispa cubana para que impulses las ventas y gestiones tu negocio como un reloj:
              </p>

              <div className="bg-slate-50 dark:bg-slate-950/60 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 space-y-3 max-h-[220px] overflow-y-auto">
                <ul className="space-y-3 font-medium text-xs text-slate-600 dark:text-slate-350 list-inside">
                  {Array.isArray(activeRelease.features) ? activeRelease.features.map((feat: string, idx: number) => (
                    <li key={idx} className="flex gap-2.5 items-start">
                      <span className="text-primary mt-1 select-none font-bold">🇨🇺</span>
                      <span>{feat}</span>
                    </li>
                  )) : (
                    <li className="flex gap-2.5 items-start">
                      <span className="text-primary mt-1 select-none font-bold">🇨🇺</span>
                      <span>{activeRelease.features}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                className="w-full flex-1 font-black text-[10px] tracking-widest h-12 uppercase rounded-2xl shadow-lg shadow-primary/25"
                onClick={() => {
                  localStorage.setItem('pati_last_seen_version', currentPlatformVer);
                  setShowUpdateModal(false);
                  toast.success("¡Viento en popa, asere! Que tengas excelentes ventas.");
                }}
              >
                ¡Está durísimo, vamos a meterle mano! 🚀
              </Button>
              {allReleases.length > 1 && (
                <Button 
                  variant="outline"
                  className="w-full sm:w-auto font-black text-[10px] tracking-widest h-12 uppercase rounded-2xl border-slate-200 dark:border-slate-800 text-slate-500"
                  onClick={() => {
                    const curIndex = allReleases.findIndex(r => r.version === activeRelease.version);
                    const nextIndex = (curIndex + 1) % allReleases.length;
                    setActiveRelease(allReleases[nextIndex]);
                  }}
                >
                  Ver Anterior
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ settings, navItems, location, user, onLogout, isAdmin, platformLogo, platformName, onItemClick }: any) {
  const [searchParams] = useSearchParams();
  const manageStoreId = searchParams.get('manageStoreId');
  const storeIdActive = searchParams.get('storeId') === 'active';
  
  // Construir el sufijo de búsqueda para mantener el contexto de la tienda
  const searchSuffix = manageStoreId 
    ? `?manageStoreId=${manageStoreId}` 
    : (storeIdActive ? '?storeId=active' : '');

  const logoToShow = isAdmin ? platformLogo : settings?.logo;
  const nameToShow = isAdmin ? (platformName || 'Admin PaTí: Plaza') : (settings?.name || 'Panel PaTí');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r dark:border-slate-800">
      <Link to={`/Dashboard${searchSuffix}`} onClick={onItemClick} className="p-8 flex flex-col items-center text-center gap-4 border-b dark:border-slate-800 group">
        <div className={cn(
          "h-20 w-20 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 rotate-3 overflow-hidden bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-2",
          (!logoToShow) && (isAdmin ? "bg-slate-900 text-white" : "bg-primary text-white")
        )}>
          {logoToShow ? (
            <img src={getProxyImageUrl(logoToShow)} alt="Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
          ) : (
            <ShoppingCart className="h-10 w-10 text-white" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">{nameToShow}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{isAdmin ? 'Plaza Intelligence' : 'Control Tienda'}</span>
        </div>
      </Link>
      <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item: any) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-4 font-black h-12 px-6 rounded-2xl transition-all duration-300 uppercase text-[10px] tracking-widest",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
              render={<Link to={`${item.path}${searchSuffix}`} />}
              nativeButton={false}
              onClick={onItemClick}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </div>
      <div className="p-6 border-t dark:border-slate-800 space-y-4">
        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800"
          onClick={() => {
            onItemClick?.();
            onLogout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4 text-rose-500" /> Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}

