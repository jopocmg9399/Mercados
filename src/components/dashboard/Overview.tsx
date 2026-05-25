import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  Loader2,
  Clock,
  ShoppingBag,
  History,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Calendar,
  User,
  Info,
  ChevronRight,
  Printer,
  FileMinus,
  MessageSquare,
  Sparkles,
  RefreshCw,
  TrendingDown,
  Check
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, getDocs, writeBatch, query, where, getCountFromServer, addDoc, serverTimestamp } from 'firebase/firestore';
import { Order, Product, DailyClose } from '../../types';
import { format, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

// Helper for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Overview({ storeId, platformMode }: { storeId?: string, platformMode?: boolean }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'closing'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeCount, setStoreCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Daily Closings State
  const [dailyCloses, setDailyCloses] = useState<DailyClose[]>([]);
  const [loadingCloses, setLoadingCloses] = useState(false);
  const [notes, setNotes] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);
  const [selectedClose, setSelectedClose] = useState<DailyClose | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Load orders and products
  useEffect(() => {
    if (!platformMode && !storeId) return;

    let qOrders;
    let qProducts;

    if (platformMode) {
      qOrders = query(collection(db, 'orders'));
      qProducts = query(collection(db, 'products'));
      
      getCountFromServer(collection(db, 'stores')).then(snapshot => {
        setStoreCount(snapshot.data().count);
      });
    } else {
      qOrders = query(collection(db, 'orders'), where('storeId', '==', storeId));
      qProducts = query(collection(db, 'products'), where('storeId', '==', storeId));
    }

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      try { handleFirestoreError(error, OperationType.LIST, 'orders'); } catch (e) {}
    });

    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, OperationType.LIST, 'products'); } catch (e) {}
    });

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, [storeId, platformMode]);

  // Load daily closings for store owner
  useEffect(() => {
    if (platformMode || !storeId) return;
    setLoadingCloses(true);
    const qCloses = query(
      collection(db, 'daily_closes'), 
      where('storeId', '==', storeId)
    );
    const unsubCloses = onSnapshot(qCloses, (snapshot) => {
      const cls = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Guarantee it parses date properly
          closedAt: data.closedAt
        } as DailyClose;
      });
      // Sort client-side by closedAt desc to avoid requiring complex firestore index instantly 
      cls.sort((a, b) => {
        const da = a.closedAt?.seconds ? a.closedAt.seconds : (a.closedAt?.toDate ? a.closedAt.toDate().getTime() : new Date(a.closedAt).getTime());
        const dbTime = b.closedAt?.seconds ? b.closedAt.seconds : (b.closedAt?.toDate ? b.closedAt.toDate().getTime() : new Date(b.closedAt).getTime());
        return dbTime - da;
      });
      setDailyCloses(cls);
      setLoadingCloses(false);
    }, (error) => {
      setLoadingCloses(false);
      try { handleFirestoreError(error, OperationType.LIST, 'daily_closes'); } catch (e) {}
    });

    return () => unsubCloses();
  }, [storeId, platformMode]);

  // Helper to format date safely
  const formatCloseDate = (timestamp: any) => {
    if (!timestamp) return 'S/F';
    try {
      if (timestamp.toDate) return format(timestamp.toDate(), 'dd MMM yyyy, hh:mm a', { locale: es });
      if (timestamp.seconds) return format(new Date(timestamp.seconds * 1000), 'dd MMM yyyy, hh:mm a', { locale: es });
      return format(new Date(timestamp), 'dd MMM yyyy, hh:mm a', { locale: es });
    } catch(e) {
      return 'Fecha inválida';
    }
  };

  const lastClose = dailyCloses[0];
  const lastCloseDate = lastClose 
    ? (lastClose.closedAt?.toDate 
        ? lastClose.closedAt.toDate() 
        : (lastClose.closedAt?.seconds 
            ? new Date(lastClose.closedAt.seconds * 1000) 
            : new Date(lastClose.closedAt))) 
    : null;

  // Filter orders that are in the "current operating shift" (since last close)
  const shiftOrders = orders.filter(o => {
    if (!lastCloseDate) return true; // everything is current shift if first layout
    let orderDate;
    try {
      orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt));
    } catch (e) {
      return true;
    }
    return orderDate > lastCloseDate;
  });

  // Calculate shift KPI stats
  const shiftSalesCUP = shiftOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, o) => acc + (o.totalCUP || 0), 0);

  const shiftSalesMLC = shiftOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, o) => acc + (o.totalMLC || 0), 0);

  const shiftPendingOrders = shiftOrders.filter(o => o.status === 'pending').length;
  const shiftCompletedOrders = shiftOrders.filter(o => o.status === 'delivered').length;
  const shiftCancelledOrders = shiftOrders.filter(o => o.status === 'cancelled').length;
  const shiftConfirmedOrders = shiftOrders.filter(o => o.status === 'confirmed').length;
  const shiftShippedOrders = shiftOrders.filter(o => o.status === 'shipped').length;

  const totalSalesCUP = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, o) => acc + (o.totalCUP || 0), 0);
    
  const totalSalesMLC = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, o) => acc + (o.totalMLC || 0), 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const activeProducts = products.filter(p => p.active).length;

  // Pie Chart: Category Distribution
  const categoryStats: Record<string, { name: string, salesCUP: number, salesMLC: number, qty: number }> = {};
  orders.forEach(order => {
    if (order.status === 'cancelled') return;
    order.items?.forEach(item => {
      const category = item.category || 'Varios';
      if (!categoryStats[category]) {
        categoryStats[category] = { name: category, salesCUP: 0, salesMLC: 0, qty: 0 };
      }
      categoryStats[category].qty += (item.quantity || 1);
      const approxItemCUPVal = (item.price || 0) * (item.packagingQuantity || 1) * (item.quantity || 1);
      if (order.totalCUP > 0) {
        categoryStats[category].salesCUP += approxItemCUPVal;
      } else if (order.totalMLC > 0) {
        categoryStats[category].salesMLC += approxItemCUPVal;
      }
    });
  });
  const categoryData = Object.values(categoryStats).sort((a,b) => b.salesCUP - a.salesCUP || b.salesMLC - a.salesMLC);
  const PIE_COLORS = ['#d97706', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#64748b'];

  // Bar Chart: Orders Statuses
  const ordersByStatusData = [
    { name: 'Pendientes', cantidad: orders.filter(o => o.status === 'pending').length, fill: '#f59e0b' },
    { name: 'Confirmados', cantidad: orders.filter(o => o.status === 'confirmed').length, fill: '#3b82f6' },
    { name: 'Enviados', cantidad: orders.filter(o => o.status === 'shipped').length, fill: '#8b5cf6' },
    { name: 'Entregados', cantidad: orders.filter(o => o.status === 'delivered').length, fill: '#10b981' },
    { name: 'Cancelados', cantidad: orders.filter(o => o.status === 'cancelled').length, fill: '#ef4444' },
  ];

  // Plot Chart Data for global trend (last 7 days of raw orders)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayOrders = orders.filter(o => {
      if (o.status === 'cancelled') return false;
      let orderDate;
      try {
        orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt));
      } catch (e) {
        orderDate = new Date();
      }
      return orderDate && isSameDay(orderDate, date);
    });
    return {
      name: format(date, 'EEE', { locale: es }),
      ventas: dayOrders.reduce((acc, o) => acc + (o.totalCUP || 0), 0),
      mlc: dayOrders.reduce((acc, o) => acc + (o.totalMLC || 0), 0),
    };
  });

  // Plot Line Chart Data for Daily Closings (Historical closes)
  const historicalClosingTrendData = [...dailyCloses]
    .slice(0, 10) // last 10 closings
    .reverse()
    .map(close => {
      const d = close.closedAt?.toDate 
        ? close.closedAt.toDate() 
        : (close.closedAt?.seconds 
            ? new Date(close.closedAt.seconds * 1000) 
            : new Date(close.closedAt));
      return {
        fecha: format(d, 'dd MMM', { locale: es }),
        salesCUP: close.totalSalesCUP,
        salesMLC: close.totalSalesMLC,
        orders: close.ordersCount
      };
    });

  const handleCreateClose = async (e: FormEvent) => {
    e.preventDefault();
    if (!storeId || !user) {
      toast.error('Sesión inválida para realizar el cierre.');
      return;
    }

    setSubmittingClose(true);
    try {
      const closeRef = await addDoc(collection(db, 'daily_closes'), {
        storeId,
        closedAt: serverTimestamp(),
        closedBy: user.email || user.uid || 'Desconocido',
        totalSalesCUP: shiftSalesCUP,
        totalSalesMLC: shiftSalesMLC,
        ordersCount: shiftOrders.length,
        notes: notes.trim(),
        pendingOrdersCount: shiftPendingOrders,
        completedOrdersCount: shiftCompletedOrders,
        cancelledOrdersCount: shiftCancelledOrders,
        confirmedOrdersCount: shiftConfirmedOrders,
        shippedOrdersCount: shiftShippedOrders,
        orderIdsClosed: shiftOrders.map(o => o.id)
      });
      
      toast.success('¡Oye asere, cierre guardado perfectamente! Ya tienes archivadas las operaciones del turno.');
      setNotes('');
    } catch (err) {
      toast.error('Error al guardar el cierre. Compruebe la conexión de base de datos.');
    } finally {
      setSubmittingClose(false);
    }
  };

  const handlePrintClose = (close: DailyClose) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('¡Asere! Activa las ventanas emergentes en tu navegador para ver el acta.');
      return;
    }
    const dateStr = formatCloseDate(close.closedAt);
    printWindow.document.write(`
      <html>
        <head>
          <title>Acta de Cierre de Caja - PaTí</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              padding: 25px; 
              color: #000; 
              max-width: 450px; 
              margin: 0 auto;
            }
            .brand { text-align: center; font-size: 16px; font-weight: 900; letter-spacing: 1px; }
            .title { text-align: center; font-size: 14px; font-weight: bold; margin: 5px 0 15px 0; }
            .divider { border-top: 1px dashed #000; margin: 12px 0; }
            .field-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin-top: 5px; }
            .notes-block { font-size: 11px; font-style: italic; white-space: pre-wrap; background: #f5f5f5; border-left: 3px solid #000; padding: 6px; margin: 12px 0; }
            .sig-area { margin-top: 50px; text-align: center; }
            .sig-line { width: 160px; border-top: 1px solid #000; margin: 0 auto 5px auto; }
            .button-no-print { display: block; text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="brand">PaTí: Plaza Digital</div>
          <div class="title">ACTA DE CIERRE OPERATIVO</div>
          <div class="field-row"><strong>FECHA CIERRE:</strong> <span>${dateStr}</span></div>
          <div class="field-row"><strong>ENCARGADO:</strong> <span>${close.closedBy}</span></div>
          <div class="field-row"><strong>TIENDA ID:</strong> <span>${close.storeId.substring(0, 10)}...</span></div>
          <div class="divider"></div>
          
          <div class="field-row"><strong>CANTIDAD PEDIDOS:</strong> <span>${close.ordersCount}</span></div>
          <div class="field-row"><strong>• ENTREGADOS:</strong> <span>${close.completedOrdersCount || 0}</span></div>
          <div class="field-row"><strong>• PENDIENTES:</strong> <span>${close.pendingOrdersCount || 0}</span></div>
          <div class="field-row"><strong>• CANCELADOS:</strong> <span>${close.cancelledOrdersCount || 0}</span></div>
          
          <div class="divider"></div>
          <div class="total-row"><span>TOTAL CASH (CUP):</span> <span>$${(close.totalSalesCUP || 0).toLocaleString()} CUP</span></div>
          <div class="total-row" style="color:#059669;"><span>TOTAL MLC:</span> <span>$${(close.totalSalesMLC || 0).toLocaleString()} MLC</span></div>
          <div class="divider"></div>
          
          <div style="font-size: 11px; font-weight: bold; margin-top: 15px;">NOTAS DE TURNO / OBSERVACIONES:</div>
          <div class="notes-block">${close.notes || 'Sin incidencias reportadas en el turno de operaciones.'}</div>
          
          <div class="divider"></div>
          <div style="text-align: center; font-size: 10px; margin-top: 20px;">
            Soporte Técnico: PaTí Plaza Digital <br/>
            Guarda esta acta para arqueos de auditoría.
          </div>
          
          <div class="sig-area">
            <div class="sig-line"></div>
            <div style="font-size: 10px; text-transform: uppercase;">Firma Responsable de Caja</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderCurrentKPIs = (statsArray: any[]) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsArray.map((stat, i) => (
        <Card key={i} className={cn("bg-white dark:bg-slate-900 border-2 shadow-sm dark:shadow-slate-950/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl overflow-hidden group mb-4", stat.border, "dark:border-slate-800")}>
          <div className={cn("h-1.5 w-full", stat.bg, "dark:bg-slate-800 dark:opacity-40")} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-4">
            <CardTitle className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              {stat.title}
            </CardTitle>
            <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", stat.bg, "dark:bg-slate-800")}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2 h-[120px] flex flex-col justify-between">
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter break-all">{stat.value}</div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wide">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const defaultStats = [
    {
      title: "Ventas Totales (CUP)",
      value: `${totalSalesCUP.toLocaleString()}`,
      icon: DollarSign,
      description: "Pesos Cubanos acumulados",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100"
    },
    {
      title: "Ventas Totales (MLC)",
      value: `${totalSalesMLC.toLocaleString()}`,
      icon: TrendingUp,
      description: "Moneda Libre Convertible",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100"
    },
    {
      title: "Pedidos Pendientes",
      value: pendingOrders.toString(),
      icon: Clock,
      description: "Por confirmar y despachar",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-100"
    },
    {
      title: platformMode ? "Tiendas Afiliadas" : "Productos Activos",
      value: platformMode ? storeCount.toString() : activeProducts.toString(),
      icon: platformMode ? ShoppingBag : Package,
      description: platformMode ? "En la plataforma" : "En catálogo",
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 italic uppercase">
              {platformMode ? "Análisis de Plataforma" : "Estado del Negocio"}
            </h2>
            <Badge className="bg-amber-600 dark:bg-amber-500 text-white rounded-lg px-2 py-0.5 font-black text-[10px] uppercase tracking-widest shadow-md">
              MIPYME Activa
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-tight">
            {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: es })}
          </p>
        </div>

        {/* Dynamic Closed Shift Alert or Action */}
        {!platformMode && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-2xl">
            <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
            <div className="text-xs">
              <p className="font-black text-slate-800 dark:text-amber-200 uppercase tracking-tighter">Turno Actual Operativo</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {lastCloseDate 
                  ? `Desde el último cierre: ${formatCloseDate(lastClose.closedAt)}` 
                  : "Sesión inicial sin cierres registrados"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SUPREME PLATFORM HEADER */}
      {platformMode && (
        <div className="bg-gradient-to-r from-amber-500 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-80" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="bg-white/25 text-white rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest leading-none backdrop-blur-sm">
                Acceso Administrador Supremo
              </span>
              <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">
                Panel de Control de Plaza Digital
              </h3>
              <p className="text-amber-100 text-xs font-semibold leading-relaxed">
                ¡Oye, asere! Aquí tienes las llaves del reino. Desde aquí puedes configurar los parámetros globales de la plataforma, administrar todos los negocios afiliados y monitorear el flujo de ventas.
              </p>
            </div>
            <Link to="/Dashboard/platform-settings" className="shrink-0 w-full md:w-auto">
              <Button className="w-full md:w-auto font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-2xl bg-white hover:bg-slate-100 text-indigo-950 shadow-lg active:scale-95 transition-all">
                Configuración de la Plataforma →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* SEGMENTED TABS PANEL (STORE MODE ONLY) */}
      {!platformMode && (
        <div className="flex flex-wrap md:flex-nowrap bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl max-w-xl shadow-inner border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2",
              activeTab === 'overview'
                ? "bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-amber-500" />
            Resumen General
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2",
              activeTab === 'analytics'
                ? "bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <BarChart2 className="h-3.5 w-3.5 text-indigo-500" />
            Rendimiento y Gráficos
          </button>

          <button
            onClick={() => setActiveTab('closing')}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2",
              activeTab === 'closing'
                ? "bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white shadow-md scale-[1.02]"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <History className="h-3.5 w-3.5 text-emerald-500" />
            Cierre de Operaciones
          </button>
        </div>
      )}

      {/* TAB 1 CONTENT: MAIN RESUMEN GENERAL (ACTIVE STATS & MAIN GRID) */}
      {(activeTab === 'overview' || platformMode) && (
        <div className="space-y-6">
          {renderCurrentKPIs(defaultStats)}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Last 7 Days chart */}
            <Card className="lg:col-span-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-3xl">
              <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <CardTitle className="dark:text-slate-100 flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Ingresos Semanales (CUP)</span>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 font-extrabold text-[9px] uppercase">Flujo Vivo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: '#0f172a',
                          color: '#f8fafc'
                        }}
                        itemStyle={{ color: '#fbbf24' }}
                      />
                      <Bar dataKey="ventas" radius={[8, 8, 0, 0]} fill="#d97706" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Popular items view */}
            <Card className="lg:col-span-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Productos en Almacén</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {products.slice(0, 5).map((product, i) => (
                    <div key={i} className="flex items-center group justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-amber-500/20 transition-all shadow-sm">
                          <img 
                            src={product.image || `https://picsum.photos/seed/${product.id}/50/50`} 
                            alt={product.name}
                            className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="ml-3 space-y-0.5">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none group-hover:text-primary transition-colors uppercase tracking-tight">{product.name}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                            {product.category}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                          (product.stock || 0) > 5 
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" 
                            : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                        )}>
                          {product.stock || 0} UMS
                        </span>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <p className="text-center text-slate-400 py-8 font-medium italic text-xs uppercase">No hay productos válidos en el catálogo hoy</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2 CONTENT: ADVANCED STORE ANALYTICS */}
      {activeTab === 'analytics' && !platformMode && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Orders Status distribution chart */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Desglose de Pedidos por Estado
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByStatusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} width={80} />
                      <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                      <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
                        {ordersByStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sales Distribution by category list */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Ventas Estimadas por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {categoryData.length > 0 ? (
                  <div className="space-y-4">
                    {categoryData.slice(0, 6).map((c, i) => (
                      <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-tight">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                            {c.name}
                          </span>
                          <span className="font-mono text-slate-900 dark:text-slate-100">
                            ${c.salesCUP.toLocaleString()} CUP
                            {c.salesMLC > 0 && ` | $${c.salesMLC.toLocaleString()} MLC`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${(c.salesCUP / (totalSalesCUP || 1)) * 100}%`,
                              backgroundColor: PIE_COLORS[i % PIE_COLORS.length] 
                            }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-black uppercase tracking-tight">No hay datos de venta para clasificar categorías</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Historical closures trend line chart */}
          {historicalClosingTrendData.length > 0 && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Histórico de Ventas de Cierres Diarios (Últimos Turnos)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalClosingTrendData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                      <Area type="monotone" dataKey="salesCUP" name="Ventas (CUP)" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3 CONTENT: DAILY CLOSING MANAGEMENT */}
      {activeTab === 'closing' && !platformMode && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            
            {/* LEFT / TOP PANEL: Formulate or perform the daily close */}
            <Card className="lg:col-span-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden h-fit">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-600 animate-pulse" />
                  Realizar Cierre de Operaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Visual Summary of the Shift */}
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-3">CONCILIACIÓN DEL TURNO ACTUAL</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-inner">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PROYECCIÓN EFECTIVO (CUP)</span>
                      <p className="text-lg font-black text-amber-600 tracking-tighter sm:text-xl font-mono">${shiftSalesCUP.toLocaleString()} CUP</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-inner">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">PROYECCIÓN MLC</span>
                      <p className="text-lg font-black text-emerald-600 tracking-tighter sm:text-xl font-mono">${shiftSalesMLC.toLocaleString()} MLC</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">PEDIDOS</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">{shiftOrders.length}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5">
                      <span className="text-[9px] font-bold text-amber-600 block uppercase">PENDIENTES</span>
                      <span className="text-xs font-black text-amber-600 font-mono">{shiftPendingOrders}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5">
                      <span className="text-[9px] font-bold text-emerald-600 block uppercase">COMPLETADOS</span>
                      <span className="text-xs font-black text-emerald-600 font-mono">{shiftCompletedOrders}</span>
                    </div>
                  </div>
                </div>

                {/* Closing Form Checklists */}
                {shiftPendingOrders > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex gap-3 text-xs text-amber-800 dark:text-amber-400">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-extrabold uppercase tracking-tight">PEDIDOS PENDIENTES SIN RESOLVER</p>
                      <p className="text-[11px] leading-relaxed font-semibold italic">
                        ¡Oye, asere! Tienes {shiftPendingOrders} pedido(s) pendientes de procesar en este turno. Te recomendamos confirmarlos, despacharlos o cancelarlos antes de emitir tu cierre oficial de operaciones para no arrastrar deudas en los libros de caja.
                      </p>
                    </div>
                  </div>
                )}

                {/* Operational checklist */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">CHECKLIST AUDITORÍA DE CAJA</h4>
                  
                  <div className="space-y-2 text-xs">
                    <label className="flex items-start gap-3 cursor-pointer p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" defaultChecked />
                      <span className="font-medium text-slate-600 dark:text-slate-400">Arqueo físico de efectivo CUP con la gaveta de caja.</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" defaultChecked />
                      <span className="font-medium text-slate-600 dark:text-slate-400">Verificado los comprobantes de transferencias bancarias (Transfermóvil/Enzona/Zelle).</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" defaultChecked />
                      <span className="font-medium text-slate-600 dark:text-slate-400">Revisados pedidos de entrega a domicilio para conciliar los costos de transportistas.</span>
                    </label>
                  </div>
                </div>

                {/* Notes and action */}
                <form onSubmit={handleCreateClose} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">OBSERVACIONES DEL CIERRE DIARIO</label>
                    <textarea 
                      placeholder="Ej. Concilia la caja al 100%. Falta registrar propina del mensajero." 
                      rows={3} 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      className="w-full text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl p-3 text-xs outline-none transition-all"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={submittingClose || shiftOrders.length === 0}
                    className="w-full rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {submittingClose ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> PROCESANDO CIERRE...
                      </span>
                    ) : (
                      "Confirmar y Emitir Acta de Cierre Diario"
                    )}
                  </Button>
                  {shiftOrders.length === 0 && (
                    <p className="text-[10px] text-center text-slate-400 uppercase font-black tracking-tight">No se han registrado operaciones o pedidos nuevos para cerrar desde el último reporte</p>
                  )}
                </form>

              </CardContent>
            </Card>

            {/* RIGHT / SUB PANEL: Historic Closes Log list */}
            <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden h-fit">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Historial de Cierres de Día
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 p-4">
                
                {loadingCloses ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  </div>
                ) : dailyCloses.length > 0 ? (
                  <div className="space-y-4 max-h-[450px] overflow-y-auto">
                    {dailyCloses.map((cl) => {
                      const totalCUPVal = cl.totalSalesCUP || 0;
                      const totalMLCVal = cl.totalSalesMLC || 0;
                      return (
                        <div 
                          key={cl.id} 
                          className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900/60 transition-colors p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-start"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatCloseDate(cl.closedAt)}
                            </span>
                            
                            <div className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                              ${totalCUPVal.toLocaleString()} CUP
                              {totalMLCVal > 0 && ` | $${totalMLCVal.toLocaleString()} MLC`}
                            </div>
                            
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic font-semibold max-w-[150px] truncate">
                              {cl.notes || 'Arqueo regular del turno'}
                            </p>
                          </div>

                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => { setSelectedClose(cl); setIsDetailsOpen(true); }}
                              className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                            >
                              <Info className="h-4 w-4 text-slate-500" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handlePrintClose(cl)}
                              className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                            >
                              <Printer className="h-4 w-4 text-slate-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                    <History className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-black uppercase tracking-tight">No se han registrado cierres de caja aún</p>
                  </div>
                )}

              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* DETAIL DIALOG DICTATED BY AUDITING METRICS TRACE */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="rounded-3xl max-w-md w-full border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-slate-900 dark:text-slate-100 italic tracking-tighter">
              Detalles del Cierre
            </DialogTitle>
          </DialogHeader>
          
          {selectedClose && (
            <div className="space-y-4 pt-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
                <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 uppercase tracking-tight font-black">
                  <span className="text-slate-400 text-[10px]">Emitido por:</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedClose.closedBy}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 uppercase tracking-tight font-black">
                  <span className="text-slate-400 text-[10px]">Fecha:</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatCloseDate(selectedClose.closedAt)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 uppercase tracking-tight font-black">
                  <span className="text-slate-400 text-[10px]">Ventas (CUP):</span>
                  <span className="text-amber-600 font-mono">${(selectedClose.totalSalesCUP || 0).toLocaleString()} CUP</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 uppercase tracking-tight font-black">
                  <span className="text-slate-400 text-[10px]">Ventas (MLC):</span>
                  <span className="text-emerald-600 font-mono">${(selectedClose.totalSalesMLC || 0).toLocaleString()} MLC</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 uppercase tracking-tight font-black">
                  <span className="text-slate-400 text-[10px]">Total de Pedidos:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedClose.ordersCount}</span>
                </div>
                <div className="flex justify-between py-1.5 uppercase tracking-tight font-black">
                  <span className="text-slate-400 text-[10px]">Pedidos Entregados:</span>
                  <span className="text-emerald-500 font-mono">{selectedClose.completedOrdersCount || 0}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Observaciones</span>
                <p className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl italic font-semibold text-slate-600 dark:text-slate-400 leading-normal border border-slate-150 dark:border-slate-800">
                  {selectedClose.notes || 'Ninguna observación reportada en este turno de operaciones.'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => handlePrintClose(selectedClose)}
                  className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 gap-2 shadow-md"
                >
                  <Printer className="h-4 w-4" /> Imprimir Acta Oficial
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                  className="rounded-2xl border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest h-12"
                >
                  Cerrar Ventana
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
