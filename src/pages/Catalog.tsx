import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn, getProxyImageUrl, formatLocation, cleanPackagingName } from '../lib/utils';
import { 
  ShoppingCart, 
  LayoutDashboard, 
  Search, 
  LogIn, 
  User, 
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Phone,
  Store as StoreIcon,
  MapPin,
  Mail,
  Loader2,
  Moon,
  Sun,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  LogOut
} from "lucide-react";
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { Product, StoreSettings, Category, Store } from '../types';
import { db, loginWithGoogle, logout, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, getDocs, limit, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';
import AIAssistant from '../components/AIAssistant';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Catalog() {
  const { storeSlug } = useParams();
  const { count, addToCart } = useCart();
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [officialCategories, setOfficialCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [platformLogo, setPlatformLogo] = useState<string>('');

  useEffect(() => {
    const unsubPlat = onSnapshot(doc(db, 'platform_settings', 'global'), (snap) => {
      if (snap.exists()) {
        setPlatformLogo(snap.data().logo || '');
      }
    });
    return unsubPlat;
  }, []);
  
  // Advanced filters state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'reciente' | 'precio-asc' | 'precio-desc'>('reciente');

  // Fetch store by slug
  useEffect(() => {
    if (!storeSlug) return;
    
    setLoadingStore(true);
    const q = query(collection(db, 'stores'), where('slug', '==', storeSlug), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setStore({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Store);
      } else {
        setStore(null);
      }
      setLoadingStore(false);
    });

    return () => unsubscribe();
  }, [storeSlug]);

  // Fetch products and categories for this store
  useEffect(() => {
    if (!store?.id) return;

    setLoadingProducts(true);
    const qProducts = query(
      collection(db, 'products'),
      where('storeId', '==', store.id),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
      setLoadingProducts(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setLoadingProducts(false);
    });

    const qCats = query(
      collection(db, 'categories'), 
      where('storeId', '==', store.id),
      orderBy('name', 'asc')
    );
    const unsubscribeCats = onSnapshot(qCats, (snapshot) => {
      const catsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setOfficialCategories(catsData);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCats();
    };
  }, [store?.id]);

  const categories = officialCategories.length > 0 
    ? officialCategories.map(c => c.name)
    : Array.from(new Set(products.map(p => {
        const cat = p.category || 'Sin Categoría';
        return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
      })));

  const maxPrice = products.length > 0 ? Math.max(...products.map(p => p.price)) : 50000;

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      const matchesStock = !onlyInStock || p.stock > 0;
      return matchesSearch && matchesCategory && matchesPrice && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === 'precio-asc') return a.price - b.price;
      if (sortBy === 'precio-desc') return b.price - a.price;
      return 0;
    });

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success('Sesión iniciada');
    } catch (error) {
      toast.error('Error al iniciar sesión');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setPriceRange([0, maxPrice]);
    setOnlyInStock(false);
    setSortBy('reciente');
  };

  if (loadingStore) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Ubicando tienda...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6 py-12 text-center">
        <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 max-w-md shadow-inner mb-6">
          <StoreIcon className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Tienda no encontrada, asere</h2>
          <p className="text-muted-foreground font-medium text-sm">
            Esta tienda no existe, se ha mudado de dirección o está temporalmente fuera de servicio. ¡Pero no te preocupes! Puedes ver otras ofertas increíbles en nuestro portal.
          </p>
        </div>
        <Button 
          size="lg"
          className="font-black px-10 h-14 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          render={<Link to="/" />}
          nativeButton={false}
        >
          Volver a la plataforma
        </Button>
      </div>
    );
  }

  const s = store.settings;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md px-6">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="h-12 w-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to={`/store/${storeSlug}`} className="flex items-center gap-4 group">
              <div className="flex gap-2 items-center">
                {s.logo ? (
                  <div className="h-16 w-16 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform shrink-0">
                    <img src={getProxyImageUrl(s.logo)} alt={s.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
                    <StoreIcon className="h-7 w-7 text-white" />
                  </div>
                )}
                {(store.storeImage || s.storeImage) && (
                  <div className="h-16 w-24 p-1 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden group-hover:scale-105 transition-transform hidden md:block shrink-0">
                    <img src={getProxyImageUrl(store.storeImage || s.storeImage)} alt="Imagen de Tienda" className="h-full w-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
              <div className="hidden sm:flex flex-col min-w-0 max-w-[180px] md:max-w-[240px]">
                <span className="font-black text-lg uppercase tracking-tighter leading-none group-hover:text-primary transition-colors truncate">{s.name}.</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mt-1 truncate" title={formatLocation(store.location)}>
                  {formatLocation(store.location)}
                </span>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                {/* Admin button for store owner or platform owner */}
                {(user.uid === store.ownerId || user.email === 'jopocmg9399@gmail.com') ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="hidden md:flex rounded-2xl h-12 gap-2 border-2 border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 font-black uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-amber-200/10"
                      render={<Link to={`/Dashboard?manageStoreId=${store.id}`} />}
                      nativeButton={false}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Administrar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="flex md:hidden rounded-full hover:bg-primary/10 hover:text-primary transition-colors h-12 w-12"
                      render={<Link to={`/Dashboard?manageStoreId=${store.id}`} />}
                      nativeButton={false}
                    >
                      <LayoutDashboard className="h-5 w-5 text-amber-600" />
                    </Button>
                  </>
                ) : (
                  /* Standard Dashboard button for general logged in user */
                  <Button 
                    variant="outline" 
                    className="hidden sm:flex rounded-2xl h-12 gap-2 border border-slate-200 dark:border-slate-800 font-black uppercase text-[10px] tracking-widest px-4"
                    render={<Link to="/Dashboard" />}
                    nativeButton={false}
                  >
                    Micasa/Dashboard
                  </Button>
                )}
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
                  className="rounded-2xl h-11 w-11 hover:text-rose-500 transition-all text-slate-500"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleLogin}
                className="rounded-2xl font-black text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 uppercase tracking-widest h-12 px-3 sm:px-4 shadow-sm transition-all"
              >
                <LogIn className="sm:mr-2 h-3.5 w-3.5" /> <span className="hidden sm:inline">Iniciar Sesión (Admin)</span>
              </Button>
            )}
            <Button 
              variant="default" 
              className="relative rounded-full px-3 sm:px-8 h-12 sm:h-14 font-bold shadow-lg shadow-primary/30 bg-primary hover:bg-primary/95 group transition-all"
              render={<Link to="/Cart" />}
              nativeButton={false}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                 <div className="h-9 w-9 sm:h-11 sm:w-11 bg-white/25 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform overflow-hidden">
                    {platformLogo ? (
                      <img src={getProxyImageUrl(platformLogo)} alt="" className="h-full w-full object-contain p-0.5" referrerPolicy="no-referrer" />
                    ) : (
                      <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    )}
                 </div>
                 <span className="hidden sm:inline uppercase text-[11px] tracking-widest font-black text-white">Mi Carrito</span>
              </div>
              {count > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 sm:h-6 sm:w-5 min-w-[1.25rem] flex items-center justify-center p-0.5 rounded-full border-2 border-white bg-amber-500 text-[9px] sm:text-[10px] font-black text-white">
                  {count}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto py-10 px-6 w-full">
        {/* Banner de Tienda */}
        <div className="relative mb-12 rounded-[2.5rem] overflow-hidden bg-primary/5 border border-primary/10 h-64 md:h-80 shadow-inner group">
          {store.banner ? (
             <img src={getProxyImageUrl(store.banner)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" referrerPolicy="no-referrer" />
          ) : (
             <div className="w-full h-full bg-gradient-to-br from-primary/10 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 w-full">
              <div className="max-w-2xl text-white">
                <Badge className="bg-primary/20 backdrop-blur-md text-white border-primary/50 mb-4 px-4 py-1 text-[10px] font-black tracking-widest uppercase rounded-full">
                  Tienda Local Oficial
                </Badge>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-[0.9]">{s.name}.</h1>
                <p className="text-slate-200 text-lg md:text-xl font-medium max-w-lg leading-relaxed line-clamp-2 italic">
                  "{s.description}"
                </p>
              </div>
              
              {/* Show Logo and Store Image here beautifully */}
              <div className="flex gap-4 shrink-0 items-center">
                {s.logo && (
                  <div className="h-20 w-20 p-2 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-4 border-white/10 shrink-0">
                    <img src={getProxyImageUrl(s.logo)} alt={s.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
                {(store.storeImage || s.storeImage) && (
                  <div className="h-20 w-32 p-1 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-4 border-white/10 overflow-hidden shrink-0">
                    <img src={getProxyImageUrl(store.storeImage || s.storeImage)} alt="Tienda" className="h-full w-full object-cover rounded-[1.25rem]" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 mb-10">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="¿Qué estás buscando hoy?" 
                className="pl-12 h-12 bg-card border-border rounded-2xl shadow-sm focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[180px] h-12 bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="reciente">Más recientes</SelectItem>
                  <SelectItem value="precio-asc">Precio: Menor a Mayor</SelectItem>
                  <SelectItem value="precio-desc">Precio: Mayor a Menor</SelectItem>
                </SelectContent>
              </Select>

              <Sheet>
                <SheetTrigger render={
                  <Button variant="outline" className="h-12 gap-2 bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-slate-50" nativeButton={false} />
                }>
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                </SheetTrigger>
                <SheetContent className="rounded-l-3xl">
                  <SheetHeader>
                    <SheetTitle className="text-2xl font-black">Filtros Avanzados</SheetTitle>
                    <SheetDescription>
                      Personaliza tu búsqueda en {s.name}.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="py-8 space-y-10">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <Label className="text-lg font-bold">Rango de Precio</Label>
                        <Badge variant="outline" className="font-mono">
                          {priceRange[0]} - {priceRange[1]}
                        </Badge>
                      </div>
                      <Slider
                        defaultValue={[0, 50000]}
                        max={50000}
                        step={10}
                        value={priceRange}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                        className="py-4"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="space-y-0.5">
                        <Label htmlFor="stock" className="text-base font-bold cursor-pointer">Solo en Stock</Label>
                        <p className="text-xs text-slate-500">Ocultar productos agotados</p>
                      </div>
                      <Checkbox 
                        id="stock" 
                        checked={onlyInStock}
                        onCheckedChange={(checked) => setOnlyInStock(checked as boolean)}
                        className="h-6 w-6 rounded-lg"
                      />
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full h-12 rounded-2xl font-bold border-slate-200" 
                      onClick={resetFilters}
                    >
                      Limpiar Filtros
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          <div className="sticky top-20 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-sm border-y mb-2">
            <div className="relative max-w-full group">
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pb-2 pt-1 px-4">
                <Button 
                  variant={selectedCategory === null ? "default" : "outline"} 
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "rounded-full px-6 h-10 font-bold transition-all duration-300 flex-shrink-0 whitespace-nowrap uppercase text-[10px] tracking-widest",
                    selectedCategory === null 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-primary/40"
                  )}
                >
                  ✨ Todos
                </Button>
                {categories.map(cat => (
                   <Button 
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"} 
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "rounded-full px-6 h-10 font-bold transition-all duration-300 flex-shrink-0 whitespace-nowrap uppercase text-[10px] tracking-widest",
                      selectedCategory === cat 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-primary/40"
                    )}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="space-y-4">
                <div className="aspect-square rounded-[3rem] bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={`${product.id}-${product.stock}`} 
                product={product} 
                addToCart={addToCart} 
                settings={s as any}
                platformLogo={platformLogo}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Vaya, búscate otra cosa</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Parece que por ahora no tenemos eso que buscas en {s.name}.</p>
            <Button variant="link" onClick={resetFilters} className="mt-6 font-bold text-primary">Ver todo el catálogo</Button>
          </div>
        )}
      </main>

      <footer className="bg-card border-t py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
                <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                   <StoreIcon className="text-white h-7 w-7" />
                </div>
                <span className="text-xl font-black tracking-tighter uppercase">{s.name}</span>
              </div>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed italic">
                "{s.description}"
              </p>
            </div>
              <div className="flex flex-col gap-4 font-bold text-slate-600 dark:text-slate-400">
                <h4 className="text-[10px] font-black uppercase tracking-[3px] text-primary mb-2">Enlaces Útiles</h4>
                <Link to="/" className="hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest px-1">Volver a la Plaza</Link>
                {user && (user.uid === store.ownerId || user.email === 'jopocmg9399@gmail.com') && (
                  <Link to={`/Dashboard?manageStoreId=${store.id}`} className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-600 rounded-xl hover:bg-amber-500/20 transition-all border border-amber-500/20 group">
                    <LayoutDashboard className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Administrar Tienda</span>
                  </Link>
                )}
                <Link to="/Cart" className="hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest px-1 mt-2">Mi Carrito</Link>
                <a 
                  href={`https://wa.me/${s.whatsappNumber.replace(/\D/g, '')}`} 
                  className="flex items-center gap-2 hover:text-primary transition-colors text-sm font-black uppercase tracking-widest px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 w-fit transition-all mt-1" 
                  target="_blank" 
                  rel="noreferrer"
                >
                  <WhatsAppIcon className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Atención Directa</span>
                </a>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[3px] text-primary mb-2">Contacto Local</h4>
                <div className="flex items-center justify-center md:justify-end gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-bold text-sm">{s.phone}</span>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-4 text-right">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-tight leading-tight text-right flex flex-col items-end">
                    {formatLocation(store.location)}
                  </span>
                </div>
              </div>
          </div>
          <div className="mt-16 pt-8 border-t dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
             <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg flex items-center justify-center overflow-hidden p-0.5">
                   {platformLogo ? (
                     <img src={getProxyImageUrl(platformLogo)} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                   ) : (
                     <ShoppingCart className="h-3 w-3 text-slate-500" />
                   )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-[3px]">PaTí: Tecnología de Élite</span>
             </div>
             <p className="text-[9px] font-bold uppercase">© 2026 {s.name}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
      <AIAssistant products={products} storeInfo={store} />
    </div>
  );
}

interface ProductCardProps {
  key?: string;
  product: Product;
  addToCart: any;
  settings: StoreSettings;
  platformLogo?: string;
}

function ProductCard({ product, addToCart, settings, platformLogo }: ProductCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('base');
  const [quantity, setQuantity] = useState(1);
  const selectedPacking = selectedOptionId === 'base' ? null : product.packagingOptions?.find(o => o.id === selectedOptionId);
  
  const getPackagingUnits = (pkg: any): number => {
    if (!pkg) return 1;
    // Check if it's a derived package
    if (pkg.parentPackId && pkg.parentPackId !== 'none') {
      const parent = product.packagingOptions?.find(o => o.id === pkg.parentPackId);
      return pkg.quantity * getPackagingUnits(parent);
    }
    return pkg.quantity;
  };

  // Virtual packing for the "base" units to handle wholesale tiers display
  const basePacking = {
    id: 'base',
    name: 'Unidad',
    quantity: 1,
    active: true,
    wholesaleTiers: product.wholesaleTiers || []
  };

  const currentPackingDisplay = selectedPacking || basePacking;
  const packagingUnits = selectedPacking ? getPackagingUnits(selectedPacking) : 1;
  const reachableOptions = product.packagingOptions?.filter(opt => getPackagingUnits(opt) <= product.stock) || [];

  useEffect(() => {
    // If current selected option is no longer reachable, reset to base
    if (selectedOptionId !== 'base' && !reachableOptions.find(o => o.id === selectedOptionId)) {
      setSelectedOptionId('base');
    }

    if (currentPackingDisplay?.wholesaleTiers?.length) {
      // Only tiers that fit in stock
      const reachableTiers = currentPackingDisplay.wholesaleTiers.filter(t => (t.minPackages * packagingUnits) <= product.stock);
      if (reachableTiers.length > 0) {
        // Find if current quantity is below the first tier's min
        const minAvailable = Math.min(...reachableTiers.map(t => t.minPackages));
        // We don't force quantity to minAvailable if it's already > 1, 
        // but if it's 1 and minAvailable is say 1 (which it should be if there's wholesale for 1+), it's fine.
      }
    }
  }, [selectedOptionId, product.stock]);

  const getUnitPrice = () => {
    if (!currentPackingDisplay?.wholesaleTiers?.length) return product.price;
    // Only consider tiers reachable with current stock
    const reachableTiers = currentPackingDisplay.wholesaleTiers.filter(t => (t.minPackages * packagingUnits) <= product.stock);
    if (reachableTiers.length === 0) return product.price;
    
    const tiers = [...reachableTiers].sort((a, b) => b.minPackages - a.minPackages);
    const reachedTier = tiers.find(t => quantity >= t.minPackages);
    return reachedTier ? reachedTier.pricePerUnit : product.price;
  };

  const unitPrice = getUnitPrice();
  const totalPrice = unitPrice * packagingUnits * quantity;

  return (
    <Card className="overflow-hidden flex flex-col border-0 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 group h-full">
      <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex-shrink-0">
        <img 
          src={product.image || `https://picsum.photos/seed/${product.id}/600/600`} 
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <Badge className="bg-slate-900/40 backdrop-blur-md text-white font-black border-none rounded-xl px-3 py-1 text-[9px] uppercase tracking-wider">
            {product.category}
          </Badge>
        </div>
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
            <Badge variant="destructive" className="font-black px-6 rounded-full uppercase text-[10px] tracking-widest">Agotado</Badge>
          </div>
        )}
      </div>
      <CardHeader className="p-6 pb-2">
        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-[1.1] mb-1 tracking-tight group-hover:text-primary transition-colors">{product.name}</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic font-medium leading-relaxed">
          {product.description}
        </p>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
             <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalPrice.toLocaleString()}</span>
                  <span className="text-[10px] font-black text-primary uppercase">{product.currency}</span>
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-[10px] font-bold text-slate-400 capitalize">{quantity} {selectedPacking ? cleanPackagingName(selectedPacking.name) : 'Unid.'}</span>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1 rounded-sm w-fit mt-1">
                     { (totalPrice / (packagingUnits * quantity)).toLocaleString() } {product.currency} p/u
                  </span>
                </div>
             </div>
             <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl p-1 gap-1">
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg text-slate-500"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
               >
                <ChevronDown className="h-3 w-3" />
               </Button>
               <input 
                  type="number" 
                  min={1}
                  className="w-12 text-center font-black text-xs bg-transparent border-none outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      if (val * packagingUnits <= product.stock) {
                        setQuantity(val);
                      } else {
                        const maxPackages = Math.floor(product.stock / packagingUnits);
                        setQuantity(Math.max(1, maxPackages));
                      }
                    } else if (e.target.value === '') {
                      setQuantity('' as any);
                    }
                  }}
                  onBlur={() => {
                    if (quantity === '' || isNaN(Number(quantity)) || Number(quantity) < 1) {
                      setQuantity(1);
                    }
                  }}
               />
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg text-slate-500"
                onClick={() => setQuantity(prev => {
                  const next = prev + 1;
                  if (next * packagingUnits <= product.stock) return next;
                  return prev;
                })}
               >
                <ChevronUp className="h-3 w-3" />
               </Button>
             </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
             <Button
                variant={selectedOptionId === 'base' ? "default" : "outline"}
                size="sm"
                className={cn(
                   "h-8 rounded-xl px-3 text-[9px] font-black uppercase tracking-tight",
                   selectedOptionId === 'base' ? "bg-slate-900 dark:bg-white dark:text-slate-900" : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-500"
                )}
                onClick={() => setSelectedOptionId('base')}
              >
                Unid.
              </Button>
              {reachableOptions.map(opt => (
                <Button
                  key={opt.id}
                  variant={selectedOptionId === opt.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                     "h-8 rounded-xl px-3 text-[9px] font-black uppercase tracking-tight",
                     selectedOptionId === opt.id ? "bg-primary text-white" : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-500"
                  )}
                  onClick={() => setSelectedOptionId(opt.id)}
                >
                  {cleanPackagingName(opt.name)}
                </Button>
              ))}
          </div>

          {/* Wholesale Tiers Display */}
          {currentPackingDisplay && currentPackingDisplay.wholesaleTiers && currentPackingDisplay.wholesaleTiers.length > 0 && (() => {
            const reachableTiersList = currentPackingDisplay.wholesaleTiers
              .filter(t => (t.minPackages * packagingUnits) <= product.stock)
              .sort((a, b) => b.minPackages - a.minPackages);
            const activeTier = reachableTiersList.find(t => quantity >= t.minPackages);
            const activeTierId = activeTier ? activeTier.id : null;

            return (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Escalas de Mayoreo (Haz clic para seleccionar)</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {[...reachableTiersList]
                    .sort((a, b) => a.minPackages - b.minPackages)
                    .map((tier) => {
                      const isActive = activeTierId === tier.id;
                      return (
                        <div 
                          key={tier.id} 
                          onClick={() => setQuantity(tier.minPackages)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer select-none",
                            isActive 
                              ? "bg-primary/10 border-primary/45 scale-[1.02] shadow-sm ring-1 ring-primary/20" 
                              : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-primary/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/80"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                              isActive ? "border-primary bg-primary text-white" : "border-slate-300 dark:border-slate-700 bg-transparent"
                            )}>
                              {isActive && (
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-[10px] font-black uppercase text-left",
                                isActive ? "text-primary" : "text-slate-600 dark:text-slate-300"
                              )}>
                                {tier.minPackages}+ {cleanPackagingName(currentPackingDisplay.name)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-slate-900 dark:text-white">{tier.pricePerUnit.toLocaleString()}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase italic">c/u</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })()}
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
         <Button 
            className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 px-4" 
            onClick={() => {
              addToCart(product, { ...selectedPacking, quantity: packagingUnits } as any, quantity);
              const unitName = selectedPacking ? cleanPackagingName(selectedPacking.name) : 'unidades';
              toast.success(`¡Listo asere! Agregamos ${quantity} ${unitName} al carrito con éxito.`);
              setQuantity(1);
              setSelectedOptionId('base');
            }}
            disabled={product.stock <= 0}
          >
            {product.stock > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-8 w-8 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {platformLogo ? (
                    <img src={getProxyImageUrl(platformLogo)} alt="" className="h-full w-full object-contain p-0.5" referrerPolicy="no-referrer" />
                  ) : (
                    <ShoppingCart className="h-4.5 w-4.5 text-white" />
                  )}
                </span>
                <span>Añadir al Carrito</span>
              </span>
            ) : 'Sin Existencias'}
          </Button>
      </CardFooter>
    </Card>
  );
}
