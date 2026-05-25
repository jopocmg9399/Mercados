import * as React from 'react';
import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  SlidersHorizontal, 
  Store, 
  AlertCircle, 
  ArrowUpDown, 
  Eye, 
  Layers, 
  Package, 
  DollarSign, 
  TrendingUp, 
  RefreshCcw, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  storeId: string;
  imageUrl?: string;
  category?: string;
  categoryId?: string;
  description?: string;
}

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  settings?: any;
}

export default function GlobalExplorer() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState('all'); // all, in_stock, low_stock, out_of_stock
  const [sortBy, setSortBy] = useState('name_asc'); // name_asc, price_asc, price_desc, stock_desc
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Comparer state
  const [selectedForComparison, setSelectedForComparison] = useState<Product[]>([]);

  // Fetch stores & products
  useEffect(() => {
    setLoading(true);

    // 1. Listen to all stores
    const unsubscribeStores = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const storeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoreData[];
      setStores(storeList);
    }, (error) => {
      console.error("Error loading stores:", error);
    });

    // 2. Listen to all products
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prodList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(prodList);
      setLoading(false);
    }, (error) => {
      console.error("Error loading products:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeStores();
      unsubscribeProducts();
    };
  }, []);

  // Helpers
  const getStoreName = (storeId: string) => {
    const s = stores.find(st => st.id === storeId);
    return s ? s.name : 'Tienda Desconocida';
  };

  const getStoreSlug = (storeId: string) => {
    const s = stores.find(st => st.id === storeId);
    return s ? s.slug : '';
  };

  const handleToggleComparison = (product: Product) => {
    if (selectedForComparison.some(p => p.id === product.id)) {
      setSelectedForComparison(prev => prev.filter(p => p.id !== product.id));
      toast.info(`Eliminado ${product.name} del comparador.`);
    } else {
      if (selectedForComparison.length >= 3) {
        toast.warning('Oye asere, puedes comparar un máximo de 3 productos a la vez.');
        return;
      }
      setSelectedForComparison(prev => [...prev, product]);
      toast.success(`Añadido ${product.name} para comparar.`);
    }
  };

  // Filter & Sort Logic
  const filteredProducts = products.filter(p => {
    // Search keyword
    const nameMatch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const skuMatch = p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const storeMatch = getStoreName(p.storeId).toLowerCase().includes(searchTerm.toLowerCase());
    const generalMatch = nameMatch || skuMatch || descMatch || storeMatch;

    // Store filter
    const matchStore = selectedStoreId === 'all' || p.storeId === selectedStoreId;

    // Stock Filter
    let matchStock = true;
    if (selectedStockFilter === 'in_stock') matchStock = p.stock > 0;
    else if (selectedStockFilter === 'low_stock') matchStock = p.stock > 0 && p.stock <= 5;
    else if (selectedStockFilter === 'out_of_stock') matchStock = p.stock === 0;

    // Price Filter
    const priceValue = Number(p.price) || 0;
    const matchMinPrice = priceMin === '' || priceValue >= Number(priceMin);
    const matchMaxPrice = priceMax === '' || priceValue <= Number(priceMax);

    return generalMatch && matchStore && matchStock && matchMinPrice && matchMaxPrice;
  });

  // Sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'price_asc') {
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    }
    if (sortBy === 'price_desc') {
      return (Number(b.price) || 0) - (Number(a.price) || 0);
    }
    if (sortBy === 'stock_desc') {
      return (Number(b.stock) || 0) - (Number(a.stock) || 0);
    }
    return 0;
  });

  // Statistics calculation
  const totalProducts = products.length;
  const totalStockValue = products.reduce((acc, p) => acc + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const averagePrice = totalProducts > 0 
    ? products.reduce((acc, p) => acc + (Number(p.price) || 0), 0) / totalProducts 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Platform Welcome Header */}
      <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-200/30 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 dark:from-teal-950/20 dark:to-emerald-500/10 shadow-sm relative overflow-hidden group">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-500/20 rounded-xl text-teal-600 dark:text-teal-400">
              <Search className="h-5 w-5" />
            </span>
            <span className="font-black text-xs uppercase tracking-widest text-teal-600 dark:text-teal-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Explorador de Plaza
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-none">
            BÚSQUEDA GLOBAL MULTITIENDA
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed font-medium">
            ¡Oye asere! Desde aquí puedes monitorear de un vistazo todos los artículos de todos los negocios de PaTí. Compara existencias, precios de costo y supervisa el stock general.
          </p>
        </div>
        <div className="shrink-0 relative z-10 p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur rounded-2xl border dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Última Sincronización</span>
          <span className="text-xs font-mono font-black text-primary dark:text-white flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            VÍA FIRESTORE REALTIME
          </span>
        </div>
      </div>

      {/* KPI Display Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-sm p-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Productos Totales</span>
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{loading ? '...' : totalProducts}</p>
            <span className="text-[10px] text-teal-500 font-bold uppercase tracking-wider">Activos en el portal</span>
          </div>
          <div className="h-12 w-12 bg-teal-550/10 text-teal-500 rounded-2xl flex items-center justify-center shrink-0">
            <Package className="h-6 w-6" />
          </div>
        </Card>

        <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-sm p-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Valor de Inventario</span>
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : `$${totalStockValue.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Capital de Stock</span>
          </div>
          <div className="h-12 w-12 bg-emerald-550/10 text-emerald-550 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
        </Card>

        <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-sm p-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Precio Promedio</span>
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? '...' : `$${averagePrice.toFixed(2)}`}
            </p>
            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Valor unitario medio</span>
          </div>
          <div className="h-12 w-12 bg-indigo-550/10 text-indigo-500 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
        </Card>

        <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-sm p-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Alarmas de Stock</span>
            <p className="text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
              {loading ? '...' : outOfStockCount} <span className="text-xs text-slate-400 font-normal">({lowStockCount} bajos)</span>
            </p>
            <span className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider">Sin existencia hoy</span>
          </div>
          <div className="h-12 w-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Comparison Engine Widget */}
      {selectedForComparison.length > 0 && (
        <Card className="rounded-[2rem] border-2 border-dashed border-teal-500/30 bg-teal-50/20 dark:bg-slate-950/40 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Herramienta Comparativa Integrada</span>
              <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Comparador de Precios y Existencias</h4>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setSelectedForComparison([])}
              className="rounded-xl h-8 text-[9px] font-bold uppercase tracking-widest"
            >
              Cerrar Comparación
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedForComparison.map((compProd) => {
              const belongsStoreName = getStoreName(compProd.storeId);
              return (
                <div key={compProd.id} className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl relative shadow-sm group hover:-translate-y-1 transition-all">
                  <span className="absolute top-3 right-3 text-[8px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase font-bold text-slate-400">
                    SKU: {compProd.sku || 'N/A'}
                  </span>
                  
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#F59E0B]">
                      {belongsStoreName}
                    </span>
                    <h5 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 truncate pr-16">{compProd.name}</h5>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t dark:border-slate-850 mt-2">
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Precio</span>
                        <span className="text-sm font-black text-rose-500">${Number(compProd.price).toFixed(2)}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Stock</span>
                        <span className={`text-sm font-black ${compProd.stock === 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{compProd.stock} u.</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Control Panel: Search filters & Ordering */}
      <Card className="rounded-[2rem] border-0 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          {/* Main Search Bar & Settings */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="relative md:col-span-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="h-5 w-5" />
              </span>
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Busca por nombre, SKU, descripción de producto o nombre de tienda..."
                className="pl-12 h-12 rounded-xl text-xs border-slate-200 bg-white dark:bg-slate-950 focus-visible:ring-teal-500/20"
              />
            </div>

            <div className="md:col-span-3">
              <select 
                value={selectedStoreId} 
                onChange={e => setSelectedStoreId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="all">🏢 TODAS LOS NEGOCIOS</option>
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="name_asc">🔤 ORDENE POR NOMBRE (A-Z)</option>
                <option value="price_asc">💵 PRECIO: MENOR A MAYOR</option>
                <option value="price_desc">💵 PRECIO: MAYOR A MENOR</option>
                <option value="stock_desc">📦 EXISTENCIAS: MAYOR A MENOR</option>
              </select>
            </div>
          </div>

          {/* Advanced Filter drawer parameters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t dark:border-slate-850">
            <div className="md:col-span-3 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estatus del Stock</span>
              <div className="flex gap-1.5">
                {['all', 'in_stock', 'low_stock', 'out_of_stock'].map((col) => (
                  <Button 
                    key={col}
                    onClick={() => setSelectedStockFilter(col)}
                    className={`flex-1 rounded-lg h-9 text-[9px] font-black uppercase tracking-wider ${
                      selectedStockFilter === col 
                        ? 'bg-teal-500 text-white hover:bg-teal-600' 
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {col === 'all' && 'Todos'}
                    {col === 'in_stock' && 'Con Stock'}
                    {col === 'low_stock' && 'Bajo'}
                    {col === 'out_of_stock' && 'Cero'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rangos de Precios</span>
              <div className="flex items-center gap-2">
                <Input 
                  type="number"
                  placeholder="Mínimo"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  className="h-9 rounded-lg text-xs bg-slate-50 dark:bg-slate-950"
                />
                <span className="text-xs text-slate-400">a</span>
                <Input 
                  type="number"
                  placeholder="Máximo"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  className="h-9 rounded-lg text-xs bg-slate-50 dark:bg-slate-950"
                />
                {(priceMin || priceMax) && (
                  <Button 
                    variant="ghost" 
                    onClick={() => { setPriceMin(''); setPriceMax(''); }}
                    className="h-9 w-9 p-0 text-rose-500 shrink-0"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>

            <div className="md:col-span-5 flex items-end justify-end">
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStoreId('all');
                  setSelectedStockFilter('all');
                  setSortBy('name_asc');
                  setPriceMin('');
                  setPriceMax('');
                  setSelectedForComparison([]);
                  toast.success('Filtros del explorador limpios asere.');
                }}
                className="h-9 px-4 bg-slate-150 text-slate-700 hover:bg-slate-200 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl font-bold uppercase text-[9px] tracking-widest"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid displays */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Artículos Coincidentes ({sortedProducts.length})
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            De un universo de {products.length} productos registrados.
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="animate-spin h-8 w-8 text-teal-500 mx-auto mb-3" />
            <span className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">Conectando con base de datos plaza...</span>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-20 text-center rounded-[2.5rem] border border-dashed text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850">
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-black uppercase text-sm tracking-widest text-slate-800 dark:text-slate-200">¡Vaya asere, qué salazón!</h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 max-w-sm mx-auto leading-relaxed mt-1">
              No hemos encontrado ningún producto con esos filtros aplicados. Intenta reducir las exigencias de tu consulta.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProducts.map((p) => {
              const belongsStoreName = getStoreName(p.storeId);
              const belongsStoreSlug = getStoreSlug(p.storeId);
              const isCheckedForComp = selectedForComparison.some(comp => comp.id === p.id);

              return (
                <Card 
                  key={p.id} 
                  className={`rounded-[2rem] bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 group transition-all duration-300 border-2 ${
                    isCheckedForComp ? 'border-teal-400 dark:border-teal-500/50' : 'border-transparent'
                  }`}
                >
                  {/* Image container & comparison pill */}
                  <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center border-b dark:border-slate-850">
                    {p.imageUrl || p.image ? (
                      <img 
                        src={p.imageUrl || p.image} 
                        alt={p.name} 
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Package className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                    )}

                    {/* Stock level tag absolute */}
                    <div className="absolute top-4 left-4">
                      {p.stock === 0 ? (
                        <Badge className="bg-rose-500 text-white font-extrabold text-[9px]">SOLDO OUT</Badge>
                      ) : p.stock <= 5 ? (
                        <Badge className="bg-amber-500 text-white font-extrabold text-[9px] animate-pulse">BAJO STOCK: {p.stock}</Badge>
                      ) : (
                        <Badge className="bg-emerald-500 text-white font-extrabold text-[9px]">STOCK: {p.stock}</Badge>
                      )}
                    </div>

                    {/* Store absolute top-right */}
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-slate-900/80 backdrop-blur text-white border-none font-bold text-[8px] uppercase tracking-wider">
                        {belongsStoreName}
                      </Badge>
                    </div>

                    {/* Direct link on hover button */}
                    {belongsStoreSlug && (
                      <a 
                        href={`/store/${belongsStoreSlug}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-900 p-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md hover:bg-white"
                      >
                        Visitar <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>SKU: {p.sku || 'N/A'}</span>
                        <span>{p.category || 'General'}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight line-clamp-1">
                        {p.name}
                      </h4>
                      {p.description && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed h-[30px]">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t dark:border-slate-850">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none">PRECIO VENTA</span>
                        <span className="text-base font-black text-primary">${Number(p.price).toFixed(2)}</span>
                      </div>

                      <Button 
                        onClick={() => handleToggleComparison(p)}
                        className={`rounded-xl h-8 px-3 text-[9px] font-extrabold uppercase tracking-widest ${
                          isCheckedForComp 
                            ? 'bg-teal-500 text-white hover:bg-teal-600'
                            : 'bg-slate-50 text-slate-600 border dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isCheckedForComp ? 'Comparando' : 'Comparar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

function Loader2(props: any) {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56 animate-spin" />
    </svg>
  );
}
