import { useState, useEffect } from 'react';
import { db, loginWithGoogle, logout } from '../firebase';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { Store } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ShoppingCart, ArrowRight, ChevronRight, LayoutGrid, LayoutList, LayoutDashboard, Sparkles as SparklesIcon, LogIn, LogOut } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from 'motion/react';
import { ThemeToggle } from '../components/ThemeToggle';
import { getProxyImageUrl, formatLocation } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import InteractiveTutorial from '../components/InteractiveTutorial';

export default function PlatformHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPlatformOwner = user?.email === 'jopocmg9399@gmail.com';

  const handleGetStoreClick = async () => {
    if (user) {
      navigate('/Dashboard?createStore=true');
    } else {
      try {
        await loginWithGoogle();
        toast.success('¡Sesión iniciada, asere! Vamos a gestionar tu negocio.');
        navigate('/Dashboard?createStore=true');
      } catch (error) {
        toast.error('Oye, no se pudo iniciar sesión con Google.');
      }
    }
  };
  const [stores, setStores] = useState<Store[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('Todas');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    const unsubPlat = onSnapshot(doc(db, 'platform_settings', 'global'), (snap) => {
      if (snap.exists()) {
        setPlatformSettings(snap.data());
      }
    });
    return unsubPlat;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'stores'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setStores(storesData);
    });
    return unsubscribe;
  }, []);

  const provinces = ['Todas', ...Array.from(new Set(stores.map(s => s.location.province)))];

  const filteredStores = stores.filter(store => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = store.name.toLowerCase().includes(searchString) || 
                          store.location.municipality.toLowerCase().includes(searchString) ||
                          store.location.province.toLowerCase().includes(searchString);
    const matchesProvince = selectedProvince === 'Todas' || store.location.province === selectedProvince;
    return matchesSearch && matchesProvince;
  });

  // Group stores by province
  const groupedStores = selectedProvince === 'Todas' 
    ? filteredStores.reduce((acc, store) => {
        const prov = store.location.province;
        if (!acc[prov]) acc[prov] = [];
        acc[prov].push(store);
        return acc;
      }, {} as Record<string, Store[]>)
    : { [selectedProvince]: filteredStores };

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-slate-950 font-sans transition-colors duration-500">
      {/* Header Premium */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 h-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="h-11 w-11 sm:h-14 sm:w-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-md border-2 border-slate-100 dark:border-slate-800/80 group-hover:scale-105 transition-transform overflow-hidden p-1">
               {platformSettings?.logo ? (
                 <img src={getProxyImageUrl(platformSettings.logo)} alt="Logo PaTí" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
               ) : (
                 <ShoppingCart className="text-primary h-5 w-5 sm:h-6 sm:w-6" />
               )}
            </div>
            {!platformSettings?.logo && (
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">{platformSettings?.name || 'PaTí'}</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Plaza Digital</span>
              </div>
            )}
          </Link>

          <div className="hidden md:flex flex-1 max-w-xl mx-12">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input 
                className="w-full pl-11 h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl focus-visible:ring-primary/30 transition-all font-medium text-sm"
                placeholder="Busca tiendas, municipios o lo que necesites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <ThemeToggle />
             {user ? (
               <div className="flex items-center gap-1.5 sm:gap-2">
                 <Link to="/Dashboard">
                   <Button 
                     className={cn(
                       "rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest h-10 sm:h-11 px-3 sm:px-6 shadow-lg transition-all active:scale-95",
                       isPlatformOwner 
                         ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20" 
                         : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-900/20"
                     )}
                   >
                     <LayoutDashboard className="mr-1 sm:mr-2 h-3.5 w-3.5" />
                     <span className="hidden sm:inline">{isPlatformOwner ? 'Administrar Plaza' : 'Administrar Tienda'}</span>
                     <span className="inline sm:hidden">Admin</span>
                   </Button>
                 </Link>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={async () => {
                     try {
                       await logout();
                       toast.success('Sesión cerrada');
                     } catch (error) {
                       toast.error('Error al cerrar sesión');
                     }
                   }}
                   className="rounded-2xl h-10 w-10 sm:h-11 sm:w-11 hover:text-rose-500 transition-all text-slate-500"
                   title="Cerrar sesión"
                 >
                   <LogOut className="h-4 w-4" />
                 </Button>
               </div>
             ) : (
               <Button 
                 onClick={async () => {
                   try {
                     await loginWithGoogle();
                     toast.success('Sesión iniciada');
                   } catch (error) {
                     toast.error('Error al iniciar sesión');
                   }
                 }}
                 className="rounded-2xl font-black text-[9px] sm:text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 uppercase tracking-widest h-10 sm:h-11 px-3 sm:px-6 shadow-sm transition-all"
               >
                 <LogIn className="sm:mr-2 h-3.5 w-3.5" /> 
                 <span className="hidden sm:inline">Iniciar Sesión (Admin)</span>
                 <span className="inline sm:hidden">Admin</span>
               </Button>
             )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-[10px] font-black uppercase tracking-widest mb-6"
            >
              <SparklesIcon className="h-3 w-3" />
              Tu mercado local, escalado
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[0.9] mb-8 tracking-tighter"
            >
              Toda <span className="text-primary italic">Cuba</span> en un solo <span className="underline decoration-primary/30 underline-offset-8">mercado</span>.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-xl leading-relaxed mb-10"
            >
              Explora las mejores tiendas locales de tu provincia. Calidad garantizada, precios directos y el sabor de lo nuestro. PaTí, Pa Mí, Pa Todos.
            </motion.p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 h-[600px] w-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      </section>

      {/* Global Platforms Stats */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200/50 dark:border-slate-800/50 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center md:items-start">
               <span className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">
                 {stores.length}
               </span>
               <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Tiendas Activas</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
               <span className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">
                 {provinces.length - 1}
               </span>
               <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Provincias</span>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
               <span className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">
                 +500
               </span>
               <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Productos Únicos</span>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
               <span className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">
                 24/7
               </span>
               <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Soporte con Clase</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="sticky top-20 z-40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border-b border-slate-200/40 dark:border-slate-800/40 py-4 px-6 mb-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3 overflow-x-auto pretty-scrollbar-x pb-2">
            {provinces.map(prov => (
              <Button
                key={prov}
                variant={selectedProvince === prov ? "default" : "ghost"}
                onClick={() => setSelectedProvince(prov)}
                className={cn(
                  "rounded-full px-6 font-black text-[10px] uppercase tracking-widest transition-all",
                  selectedProvince === prov 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-900 border dark:border-slate-800"
                )}
              >
                {prov}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
            <Button 
                variant={viewType === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="rounded-xl px-3"
                onClick={() => setViewType('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
                variant={viewType === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="rounded-xl px-3"
                onClick={() => setViewType('list')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stores Display */}
      <main className="max-w-7xl mx-auto px-6 pb-32">
        <AnimatePresence mode="popLayout">
          {(Object.entries(groupedStores) as [string, Store[]][]).map(([province, storesInProv]) => (
            <motion.div 
               key={province}
               layout
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="mb-20"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="h-1px bg-slate-200 dark:bg-slate-800 flex-1" />
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-600 px-4">{province}</h2>
                <div className="h-1px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>

              <div className={cn(
                "grid gap-8",
                viewType === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}>
                {storesInProv.map(store => (
                  <div key={store.id} className="relative">
                    <Card className={cn(
                        "group overflow-hidden rounded-[2.5rem] border-0 transition-all duration-500",
                        viewType === 'grid' 
                          ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2" 
                          : "flex flex-col md:flex-row items-stretch border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[22rem]"
                    )}>
                      {/* Store Banner/Image - Clickable */}
                      <Link 
                        to={`/store/${store.slug}`}
                        className={cn(
                          "relative overflow-hidden block shrink-0",
                          viewType === 'grid' ? "h-48" : "w-full md:w-1/3 min-h-[12rem] md:min-h-0 self-stretch"
                        )}
                      >
                        {store.banner ? (
                          <img 
                            src={getProxyImageUrl(store.banner)} 
                            alt={store.name} 
                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-full w-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center p-4">
                            {platformSettings?.logo ? (
                              <img src={getProxyImageUrl(platformSettings.logo)} alt="" className="h-16 w-16 object-contain opacity-40" referrerPolicy="no-referrer" />
                            ) : (
                              <ShoppingCart className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                            )}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Logo Overlay */}
                        <div className="absolute bottom-4 left-4 flex gap-2">
                          <div className="h-16 w-16 bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-xl border-4 border-white dark:border-slate-900 group-hover:-translate-y-2 transition-transform duration-500">
                            {store.logo ? (
                              <img src={getProxyImageUrl(store.logo)} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden p-1">
                                 {platformSettings?.logo ? (
                                   <img src={getProxyImageUrl(platformSettings.logo)} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                                 ) : (
                                   <ShoppingCart className="h-6 w-6 text-primary" />
                                 )}
                              </div>
                            )}
                          </div>
                          {(store.storeImage || store.settings?.storeImage) && (
                            <div className="h-16 w-24 bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-xl border-4 border-white dark:border-slate-900 overflow-hidden group-hover:-translate-y-2 transition-transform duration-500 hidden sm:block">
                              <img src={getProxyImageUrl(store.storeImage || store.settings?.storeImage)} alt="" className="h-full w-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      </Link>

                      <CardContent className={cn(
                        "p-6 sm:p-8 flex flex-col justify-between",
                        viewType === 'list' ? "flex-1" : ""
                      )}>
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                             <div className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-2xl border border-primary/10 min-w-0 max-w-[70%] sm:max-w-[75%]" title={formatLocation(store.location)}>
                               <MapPin className="h-3.5 w-3.5 shrink-0" />
                               <span className="truncate">{formatLocation(store.location)}</span>
                             </div>
                             {store.featured && (
                               <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-bold px-2 py-0.5 rounded-full text-[9px] shrink-0">
                                 DESTACADA
                               </Badge>
                             )}
                          </div>
                          <Link to={`/store/${store.slug}`}>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 leading-none group-hover:text-primary transition-colors">{store.name}</h3>
                          </Link>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed italic">
                            "{store.description}"
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center pt-6 border-t border-slate-100 dark:border-slate-800 gap-3 mt-auto">
                            <Button 
                              className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all flex-1"
                              render={<Link to={`/store/${store.slug}`} />}
                              nativeButton={false}
                            >
                               Explorar Tienda
                            </Button>
                            {user && (user.uid === store.ownerId || user.email === 'jopocmg9399@gmail.com') && (
                              <Button 
                                variant="outline" 
                                className="h-12 flex-1 rounded-2xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 shadow-lg shadow-amber-200/10 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                                render={<Link to={`/Dashboard?manageStoreId=${store.id}`} />}
                                nativeButton={false}
                              >
                                  <LayoutDashboard className="h-4 w-4" />
                                  <span>Administrar</span>
                              </Button>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* Call to action for owners */}
      <section className="bg-slate-900 dark:bg-white py-24 px-6 text-center overflow-hidden relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-6xl font-black text-white dark:text-slate-950 mb-8 tracking-tighter leading-[0.9]">
            ¿Tienes un negocio? <br /> Únete a la <span className="text-primary italic">Plaza Digital</span> más grande de Cuba.
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-lg font-medium mb-10 max-w-2xl mx-auto">
            Escala tus ventas, gestiona tus envíos y llega a miles de cubanos en todo el país con nuestra tecnología de élite.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <Button 
               onClick={handleGetStoreClick}
               className="h-14 px-10 rounded-[1.25rem] bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
             >
               Quiero mi tienda PaTí
             </Button>
             <Button 
               onClick={() => setIsTutorialOpen(true)}
               className="h-14 px-10 rounded-[1.25rem] border border-slate-700 dark:border-slate-300 bg-transparent text-white dark:text-slate-950 font-black uppercase text-xs tracking-widest hover:bg-white hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white transition-all duration-300"
             >
               Conocer bondades
             </Button>
          </div>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-0 left-0 h-full w-full opacity-10 pointer-events-none">
           <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 h-96 w-96 border-[40px] border-primary rounded-full" />
           <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 border-[30px] border-slate-500 rounded-full" />
        </div>
      </section>

      {/* Footer Mall */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200/50 dark:border-slate-800/50 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-center overflow-hidden p-1">
               {platformSettings?.logo ? (
                 <img src={getProxyImageUrl(platformSettings.logo)} alt="Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
               ) : (
                 <ShoppingCart className="h-4 w-4 text-primary" />
               )}
             </div>
             <span className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">{platformSettings?.name || 'PaTí Plaza'} 2026</span>
           </div>
           
           <div className="flex items-center gap-8">
             <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Términos</a>
             <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Privacidad</a>
             <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Soporte IA</a>
           </div>

           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
             Diseñado con Ashé por Google AI Studio
           </p>
        </div>
      </footer>

      <InteractiveTutorial isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}

const cn = (...args: any[]) => args.filter(Boolean).join(' ');

function Sparkles(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
