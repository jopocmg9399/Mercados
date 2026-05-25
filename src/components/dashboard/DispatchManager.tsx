import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Truck, 
  Search, 
  Loader2, 
  PackageCheck, 
  MapPin, 
  Phone, 
  Clock,
  CheckCircle2
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Order } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";

export default function DispatchManager({ storeId }: { storeId?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!storeId) return;
    // Fetch all confirmed or shipped orders
    // We remove orderBy from the query to avoid composite index requirements
    const q = query(
      collection(db, 'orders'), 
      where('storeId', '==', storeId),
      where('status', 'in', ['confirmed', 'shipped'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Sort client-side by createdAt descending
      const sortedOrders = ordersData.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (typeof val === 'number') return val;
          return 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
      
      setOrders(sortedOrders);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      } catch (e) {}
    });

    return () => unsubscribe();
  }, [storeId]);

  const markAsShipped = async (id: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: 'shipped' });
      toast.success('Pedido marcado como despachado');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
      toast.error('Error al actualizar pedido');
    }
  };

  const markAsDelivered = async (id: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: 'delivered' });
      toast.success('Pedido marcado como entregado');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
      toast.error('Error al actualizar pedido');
    }
  };

  const filteredOrders = orders.filter(order => 
    order.customerName.toLowerCase().includes(search.toLowerCase()) || 
    order.customerPhone.includes(search) ||
    order.customerAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 italic uppercase">Logística y Despacho</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Control de entregas y seguimiento de flota</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-50 dark:bg-indigo-900/40 border-2 border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 rounded-2xl px-4 py-2 font-black uppercase text-[10px] tracking-widest shadow-sm">
            {orders.filter(o => o.status === 'confirmed').length} En Cola
          </Badge>
          <Badge className="bg-emerald-50 dark:bg-emerald-900/40 border-2 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-2xl px-4 py-2 font-black uppercase text-[10px] tracking-widest shadow-sm">
            {orders.filter(o => o.status === 'shipped').length} En Ruta
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4 max-w-md bg-white dark:bg-slate-900 p-2 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
          <Input 
            placeholder="Buscar por cliente o destino..." 
            className="pl-12 h-14 bg-slate-50/50 dark:bg-slate-800/50 border-none rounded-xl font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="p-20 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl dark:hover:shadow-indigo-950/20 transition-all duration-500 hover:-translate-y-2 rounded-[2.5rem] bg-white dark:bg-slate-900 group">
              <div className={cn(
                "h-3 w-full",
                order.status === 'confirmed' ? "bg-indigo-600" : "bg-emerald-500"
              )} />
              <CardContent className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 dark:text-slate-100 leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase italic tracking-tighter">{order.customerName}</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-[10px] font-black font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 uppercase tracking-widest">#{order.id.substring(0, 8)}</span>
                    </div>
                  </div>
                  <Badge className={cn(
                    "font-black uppercase text-[9px] tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg border-2",
                    order.status === 'confirmed' 
                      ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40 shadow-indigo-500/10" 
                      : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 shadow-emerald-500/10"
                  )}>
                    {order.status === 'confirmed' ? 'Por Despachar' : 'En Camino'}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 group-hover:border-indigo-100 dark:group-hover:border-indigo-900 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <span className="font-black text-slate-700 dark:text-slate-200 tracking-widest">{order.customerPhone}</span>
                  </div>
                  <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 group-hover:border-indigo-100 dark:group-hover:border-indigo-900 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800 flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Destino</span>
                      <span className="text-xs font-black text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 italic uppercase">{order.customerAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-dashed border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Resumen de Carga</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">{order.items.reduce((acc, i) => acc + i.quantity, 0)} unid.</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, i) => (
                      <Badge key={i} variant="outline" className="bg-white dark:bg-slate-800 text-[9px] font-black uppercase tracking-tighter px-3 py-1 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg shadow-sm">
                        {item.quantity}x {item.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  {order.status === 'confirmed' ? (
                    <Button 
                      className="w-full h-14 gap-3 font-black uppercase text-xs tracking-[0.2em] bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-500/30 active:scale-95 transition-all" 
                      onClick={() => markAsShipped(order.id)}
                    >
                      <Truck className="h-5 w-5" /> Iniciar Despacho
                    </Button>
                  ) : (
                    <Button 
                      className="w-full h-14 gap-3 font-black uppercase text-xs tracking-[0.2em] bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-xl shadow-emerald-500/30 active:scale-95 transition-all" 
                      onClick={() => markAsDelivered(order.id)}
                    >
                      <CheckCircle2 className="h-5 w-5" /> Confirmar Entrega
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredOrders.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 shadow-inner">
              <Truck className="h-20 w-20 text-slate-100 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Logística al Día</h3>
              <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">No hay pedidos confirmados esperando transporte en este momento.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
