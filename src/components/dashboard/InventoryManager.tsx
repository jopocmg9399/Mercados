import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Trash2,
  History
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, getProxyImageUrl } from "../../lib/utils";
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, query, orderBy, where, addDoc, doc, updateDoc, deleteDoc, increment, serverTimestamp, getDoc, getDocs, writeBatch, runTransaction } from 'firebase/firestore';
import { Product, InventoryEntry, Supplier, Category } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function parseSafeDate(val: any): Date {
  if (!val) return new Date();
  if (val.toDate && typeof val.toDate === 'function') {
    try { return val.toDate(); } catch (e) { return new Date(); }
  }
  if (typeof val === 'object' && ('_methodName' in val || !('seconds' in val))) {
    return new Date();
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) {
    return new Date();
  }
}

export default function InventoryManager({ storeId }: { storeId?: string }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updateProductCost, setUpdateProductCost] = useState(false);
  const [adjustmentDirection, setAdjustmentDirection] = useState<'up' | 'down'>('up');
  
  const [newEntry, setNewEntry] = useState<Partial<InventoryEntry>>({
    productId: '',
    supplierId: '',
    quantity: 0,
    type: 'in',
    notes: '',
  });

  const handleDeleteEntry = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      setLoading(true);
      
      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', entry.productId);
        const productSnap = await transaction.get(productRef);
        
        if (productSnap.exists()) {
          let revertChange = 0;
          const type = String(entry.type || 'in').toLowerCase();
          
          if (type === 'in' || type === 'entrada') revertChange = -entry.totalUnits;
          else if (type === 'out' || type === 'salida' || type === 'venta') revertChange = entry.totalUnits;
          else if (type === 'adjustment' || type === 'ajuste') {
            const dir = String(entry.adjustmentDirection || '').toLowerCase();
            revertChange = (dir === 'down' || dir === 'bajar') ? entry.totalUnits : -entry.totalUnits;
          }

          transaction.update(productRef, {
            stock: increment(revertChange),
            lastStockUpdate: serverTimestamp()
          });
        }

        transaction.delete(doc(db, 'inventory_entries', entryId));
      });

      toast.success('Movimiento eliminado y stock revertido');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Error al eliminar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storeId) return;

    // Listen to products for the selection dropdown
    const qProducts = query(
      collection(db, 'products'), 
      where('storeId', '==', storeId),
      orderBy('name', 'asc')
    );
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'products');
      } catch (e) {}
    });

    // Listen to suppliers
    const qSuppliers = query(
      collection(db, 'suppliers'), 
      where('storeId', '==', storeId),
      orderBy('name', 'asc')
    );
    const unsubSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[]);
    });

    // Listen to categories
    const qCats = query(
      collection(db, 'categories'), 
      where('storeId', '==', storeId)
    );
    const unsubCategories = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]);
    });

    // Listen to inventory entries
    const qEntries = query(
      collection(db, 'inventory_entries'),
      where('storeId', '==', storeId)
    );
    const unsubEntries = onSnapshot(qEntries, (snapshot) => {
      const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryEntry[];
      // Sort in memory so documents with null createdAt (pending) still show up
      const sortedEntries = allEntries.sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as any)?.toMillis?.() || Date.now();
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as any)?.toMillis?.() || Date.now();
        return timeB - timeA;
      });
      setEntries(sortedEntries);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.LIST, 'inventory_entries');
      } catch (e) {
        // Error reported to console by handleFirestoreError
      }
    });

    return () => {
      unsubProducts();
      unsubSuppliers();
      unsubCategories();
      unsubEntries();
    };
  }, [storeId]);

  const [selectedFormatId, setSelectedFormatId] = useState<string>('base');

  useEffect(() => {
    // Reset format to base when product changes
    setSelectedFormatId('base');
  }, [newEntry.productId]);

  const handleAddEntry = async () => {
    if (isSaving) return;

    if (!newEntry.productId) {
      toast.error('Oye, selecciona un producto primero.');
      return;
    }
    
    if (!newEntry.quantity || Number(newEntry.quantity) <= 0) {
      toast.error('La cantidad tiene que ser mayor que cero, asere.');
      return;
    }

    const product = products.find(p => p.id === newEntry.productId);
    if (!product) {
      toast.error('No encuentro ese producto en la base de datos.');
      return;
    }

    let multiplier = 1;
    let formatName = 'Unidad';
    
    if (selectedFormatId !== 'base') {
      const opt = product.packagingOptions?.find(o => o.id === selectedFormatId);
      if (opt) {
        multiplier = Number(opt.quantity || 1);
        formatName = opt.name;
      }
    }

    const totalUnits = Number(newEntry.quantity || 0) * multiplier;

    setIsSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Get the product first to ensure it exists and get fresh data
        const productRef = doc(db, 'products', newEntry.productId!);
        const productSnap = await transaction.get(productRef);
        
        if (!productSnap.exists()) {
          throw new Error('El producto no existe en la base de datos.');
        }

        const productData = productSnap.data() as Product;

        // 2. Calculate units
        let multiplier = 1;
        let formatName = 'Unidad';
        
        if (selectedFormatId !== 'base') {
          const opt = productData.packagingOptions?.find(o => o.id === selectedFormatId);
          if (opt) {
            multiplier = Number(opt.quantity || 1);
            formatName = opt.name;
          }
        }

        const totalUnits = Number(newEntry.quantity || 0) * multiplier;

        // 3. Register the entry
        const entryRef = doc(collection(db, 'inventory_entries'));
        const entryToWrite: any = {
          storeId, // MANDATORY for security rules
          productId: newEntry.productId,
          supplierId: newEntry.supplierId || 'none',
          type: newEntry.type,
          notes: newEntry.notes || '',
          quantity: Number(newEntry.quantity || 0),
          productName: productData.name,
          formatName,
          multiplier,
          totalUnits,
          createdAt: serverTimestamp(),
          currency: newEntry.currency || productData.currency || 'CUP'
        };

        if (newEntry.type === 'adjustment') {
          entryToWrite.adjustmentDirection = adjustmentDirection;
        }

        if (newEntry.cost && Number(newEntry.cost) > 0) {
          entryToWrite.cost = Number(newEntry.cost);
        }

        transaction.set(entryRef, entryToWrite);

        // 4. Update the product
        let stockChange = 0;
        const type = String(newEntry.type || 'in').toLowerCase();
        if (type === 'in' || type === 'entrada') stockChange = totalUnits;
        else if (type === 'out' || type === 'salida' || type === 'venta') stockChange = -totalUnits;
        else if (type === 'adjustment' || type === 'ajuste') {
          stockChange = adjustmentDirection === 'up' ? totalUnits : -totalUnits;
        }

        const productUpdate: any = {
          stock: increment(stockChange),
          lastStockUpdate: serverTimestamp()
        };

        if (updateProductCost && (type === 'in' || type === 'entrada') && entryToWrite.cost) {
          productUpdate.cost = entryToWrite.cost;
        }

        transaction.update(productRef, productUpdate);
        return stockChange;
      });

      toast.success('Movimiento registrado y stock actualizado con éxito.');
      setIsAddModalOpen(false);
      setUpdateProductCost(false);
      setNewEntry({
        productId: '',
        supplierId: '',
        quantity: 0,
        type: 'in',
        notes: '',
      });
      setSelectedFormatId('base');
    } catch (error) {
      console.error('Add Entry Error:', error);
      toast.error('Error al registrar movimiento. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.productName.toLowerCase().includes(search.toLowerCase()) || 
    (e.notes && e.notes.toLowerCase().includes(search.toLowerCase())) ||
    (e.supplierId && suppliers.find(s => s.id === e.supplierId)?.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-3xl font-bold tracking-tight italic uppercase text-slate-900 dark:text-white">Recepción / Inventario</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                className="font-bold border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl h-11" 
                onClick={() => navigate('/Dashboard/products')}
              >
                <Plus className="mr-2 h-4 w-4" /> Catálogo
              </Button>
              <Button 
                className="font-bold shadow-lg shadow-amber-500/20 dark:shadow-amber-900/40 bg-amber-600 hover:bg-amber-700 rounded-xl h-11" 
                onClick={() => {
                  setNewEntry({
                    productId: '',
                    supplierId: 'none',
                    quantity: 0,
                    type: 'in',
                    notes: '',
                  });
                  setIsAddModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Registrar Movimiento
              </Button>
            </div>
          </div>

      {/* Stock Overview - Show all products to verify stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{categories.find(c => c.id === product.category)?.name || 'General'}</p>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{product.name}</h3>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center p-2 shadow-inner group-hover:border-indigo-200 transition-all">
                <img src={getProxyImageUrl(product.image) || `https://picsum.photos/seed/${product.id}/100/100`} alt={product.name} className="h-full w-full object-cover rounded-xl" referrerPolicy="no-referrer" />
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stock Disponible</span>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-4xl font-black tracking-tighter", product.stock <= 5 ? "text-rose-600" : "text-emerald-600")}>
                      {product.stock.toLocaleString()}
                    </span>
                    <span className="text-xs font-black text-slate-400 dark:text-slate-200 uppercase">u.</span>
                  </div>
                </div>
              </div>
              
              {product.packagingOptions && product.packagingOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.packagingOptions.map(opt => (
                    <div key={opt.id} className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border-2 border-slate-100 dark:border-slate-800 shadow-inner group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20 transition-colors flex flex-col">
                      <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1 tracking-widest">{opt.name}</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-slate-100">
                        {Math.floor(product.stock / opt.quantity)} <span className="text-indigo-600">u.</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {products.length === 0 && !loading && (
          <div className="col-span-full p-20 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] text-center bg-white dark:bg-slate-900 shadow-inner">
            <div className="bg-slate-50 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <RefreshCw className="h-12 w-12 text-slate-200" />
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-2xl font-black uppercase italic tracking-tighter">Inventario Vacío</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-3 max-w-sm mx-auto font-medium">Crea productos en el catálogo para comenzar a gestionar los niveles de existencia.</p>
          </div>
        )}
      </div>

      <div className="space-y-6 pt-10">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Historial de Flujos</h3>
          <div className="flex items-center gap-3 w-72">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 text-slate-400" />
              <Input 
                placeholder="Filtrar movimientos..." 
                className="pl-11 h-12 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 rounded-[2rem] bg-white dark:bg-slate-950 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/40 border-slate-100 dark:border-slate-800">
        {loading ? (
          <div className="p-20 flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent border-b-2 border-slate-100 dark:border-slate-800">
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em] p-6">Fecha / Registro</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em]">Producto</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em]">Operación</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em]">Formato transado</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em]">Impacto Stock</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em] p-6">Notas / Referencia</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all duration-300 border-b dark:border-slate-800">
                  <TableCell className="p-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {entry.createdAt ? format(parseSafeDate(entry.createdAt), 'dd MMM', { locale: es }) : '—'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase">
                        {entry.createdAt ? format(parseSafeDate(entry.createdAt), 'HH:mm') : '—'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 dark:text-slate-200 text-lg leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase italic">
                        {products.find(p => p.id === entry.productId)?.name || entry.productName || entry.productId}
                      </span>
                      {entry.supplierId && entry.supplierId !== 'none' && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge variant="outline" className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900 font-black uppercase text-[8px] tracking-widest px-2 py-0 shadow-sm">
                            {suppliers.find(s => s.id === entry.supplierId)?.name || entry.supplierId}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.type === 'in' ? (
                      <Badge className="bg-emerald-500 text-white border-none gap-2 rounded-xl font-black px-4 py-1.5 uppercase text-[9px] tracking-widest shadow-lg shadow-emerald-500/20">
                        <ArrowDownCircle className="h-3 w-3" /> Entrada
                      </Badge>
                    ) : entry.type === 'out' ? (
                      <Badge className="bg-rose-500 text-white border-none gap-2 rounded-xl font-black px-4 py-1.5 uppercase text-[9px] tracking-widest shadow-lg shadow-rose-500/20">
                        <ArrowUpCircle className="h-3 w-3" /> Salida
                      </Badge>
                    ) : (
                      <Badge className={cn(
                        "gap-2 rounded-xl font-black px-4 py-1.5 uppercase text-[9px] tracking-widest shadow-lg border-none text-white",
                        entry.adjustmentDirection === 'down' ? "bg-amber-500 shadow-amber-500/20" : "bg-indigo-500 shadow-indigo-500/20"
                      )}>
                        <RefreshCw className="h-3 w-3" /> Ajuste {entry.adjustmentDirection === 'down' ? '(-)' : '(+)'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 dark:text-slate-100">{entry.quantity} <span className="text-slate-400 dark:text-slate-500 uppercase text-[10px]">{entry.formatName}s</span></span>
                      {entry.multiplier > 1 && (
                        <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-widest mt-1">Factor x{entry.multiplier} unid.</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "inline-flex items-center p-3 rounded-2xl font-black shadow-inner border-2",
                      entry.type === 'in' 
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" 
                        : entry.type === 'out' 
                          ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40" 
                          : (entry.adjustmentDirection === 'down' ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40" : "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40")
                    )}>
                      <span className="text-lg">
                        {entry.type === 'in' ? '+' : entry.type === 'out' ? '-' : (entry.adjustmentDirection === 'down' ? '-' : '+')}
                        {entry.totalUnits.toLocaleString()}
                      </span>
                      <span className="text-[9px] uppercase ml-1 opacity-60">u.</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-6">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-300 italic max-w-[200px] line-clamp-2">
                      {entry.notes || '—'}
                    </p>
                  </TableCell>
                  <TableCell className="p-4">
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg" nativeButton={false} />
                      }>
                        <Trash2 className="h-4 w-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar este movimiento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esto eliminará el registro histórico y revertirá el impacto en el stock del producto de forma automática.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel variant="outline" size="default">Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            variant="destructive"
                            size="default"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
                          >
                            Eliminar y Revertir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 max-w-[280px] mx-auto">
                      <div className="bg-slate-50 p-4 rounded-full mb-2">
                        <RefreshCw className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="font-bold text-slate-600">Sin movimientos registrados</p>
                      <p className="text-xs text-slate-400">
                        El inventario rastrea las entradas y salidas. ¡Usa el botón "Registrar Movimiento" para registrar tu primer movimiento!
                      </p>
                      {products.length === 0 && (
                        <p className="text-[10px] text-primary font-bold uppercase tracking-tighter mt-2">
                          Primero debes crear productos en la pestaña "Productos".
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento de Inventario</DialogTitle>
            <DialogDescription>
              Añade entradas de productos o registra salidas (mermas/ajustes).
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product-select" className="font-bold flex justify-between">
                Producto
                {products.length === 0 && <span className="text-destructive text-[10px] animate-pulse">¡No hay productos creados!</span>}
              </Label>
              <Select 
                value={newEntry.productId} 
                onValueChange={(val) => setNewEntry({...newEntry, productId: val})}
              >
                <SelectTrigger id="product-select" className="h-12 border-slate-300 rounded-xl">
                  <SelectValue placeholder="Selecciona un producto del catálogo" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id} className="font-medium">
                      {p.name} <span className="text-slate-400 ml-2">(Disp: {p.stock || 0})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newEntry.type === 'in' && (
              <div className="grid gap-2">
                <Label htmlFor="supplier-select" className="font-bold">Proveedor</Label>
                <Select 
                  value={newEntry.supplierId} 
                  onValueChange={(val) => setNewEntry({...newEntry, supplierId: val})}
                >
                <SelectTrigger id="supplier-select" className="h-12 border-slate-300 rounded-xl bg-slate-50">
                    <SelectValue placeholder="¿Quién suministra esto?" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    <SelectItem value="none">Ninguno / Otro</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="font-bold">{s.name}</span>
                        {s.contactName && <span className="text-[10px] text-slate-400 font-normal ml-2">({s.contactName})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type" className="font-bold">Acción</Label>
                <Select 
                  value={newEntry.type} 
                  onValueChange={(val: any) => {
                    setNewEntry({...newEntry, type: val});
                    if (val !== 'adjustment') setAdjustmentDirection('up');
                  }}
                >
                  <SelectTrigger className="h-12 border-slate-300">
                    <SelectValue placeholder="Tipo">
                      {newEntry.type === 'in' ? 'Entrada (+)' : 
                       newEntry.type === 'out' ? 'Salida (-)' : 'Ajuste (±)'}
                    </SelectValue>
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in" className="text-emerald-600 font-bold">Entrada (+)</SelectItem>
                  <SelectItem value="out" className="text-rose-600 font-bold">Salida (-)</SelectItem>
                  <SelectItem value="adjustment" className="text-amber-600 font-bold">Ajuste (±)</SelectItem>
                </SelectContent>
                </Select>
              </div>

              {newEntry.type === 'adjustment' && (
                <div className="grid gap-2">
                  <Label className="font-bold">Sentido del Ajuste</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant={adjustmentDirection === 'up' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setAdjustmentDirection('up')}
                    >
                      Aumentar (+)
                    </Button>
                    <Button 
                      type="button"
                      variant={adjustmentDirection === 'down' ? 'destructive' : 'outline'}
                      className="flex-1"
                      onClick={() => setAdjustmentDirection('down')}
                    >
                      Disminuir (-)
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="quantity" className="font-bold">Cantidad</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  placeholder="0"
                  className="h-12 border-slate-300 font-bold"
                  value={newEntry.quantity || ''}
                  onChange={(e) => setNewEntry({...newEntry, quantity: Number(e.target.value)})}
                />
              </div>
            </div>

            {newEntry.productId && products.find(p => p.id === newEntry.productId)?.packagingOptions?.length ? (
              <div className="grid gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Unidad de Medida / Formato</Label>
                <Select 
                  value={selectedFormatId}
                  onValueChange={setSelectedFormatId}
                >
                  <SelectTrigger id="format-select" className="bg-white border-slate-300">
                    <SelectValue placeholder="Unidad Individual">
                      {selectedFormatId === 'base' ? 'Unidad Individual' : 
                       products.find(p => p.id === newEntry.productId)?.packagingOptions?.find(o => o.id === selectedFormatId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Unidad Individual (Factor x1)</SelectItem>
                    {products.find(p => p.id === newEntry.productId)?.packagingOptions?.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.name} (Factor x{opt.quantity})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500 italic mt-1">
                  Se multiplicará la cantidad por el formato para actualizar el stock total.
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cost" className="font-bold">Costo Unitario</Label>
                <Input 
                  id="cost" 
                  type="number" 
                  placeholder="0.00"
                  className="h-12 border-slate-300 font-bold"
                  value={newEntry.cost || ''}
                  onChange={(e) => setNewEntry({...newEntry, cost: e.target.value ? Number(e.target.value) : undefined})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency" className="font-bold">Moneda</Label>
                <Select 
                  value={newEntry.currency} 
                  onValueChange={(val: any) => setNewEntry({...newEntry, currency: val})}
                >
                  <SelectTrigger className="h-12 border-slate-300">
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUP">CUP (Pesos)</SelectItem>
                    <SelectItem value="MLC">MLC (Tarjeta)</SelectItem>
                    <SelectItem value="USD">USD (Dólares)</SelectItem>
                    <SelectItem value="EUR">EUR (Euros)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newEntry.type === 'in' && newEntry.cost && newEntry.cost > 0 && (
              <div className="flex items-center space-x-2 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                <Checkbox 
                  id="update-cost" 
                  checked={updateProductCost}
                  onCheckedChange={(checked) => setUpdateProductCost(checked as boolean)}
                />
                <Label htmlFor="update-cost" className="text-xs font-bold leading-tight cursor-pointer text-primary">
                  Vincular: Actualizar el costo base en la ficha del producto con este nuevo valor.
                </Label>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes" className="font-bold">Notas o Referencia</Label>
              <Input 
                id="notes" 
                className="h-12 border-slate-300"
                placeholder="Ej: Lote #23, Proveedor Pérez..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-6 pt-6 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setIsAddModalOpen(false)} 
              className="rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 font-bold"
            >
              Cancelar y Cerrar
            </Button>
            <Button 
              onClick={handleAddEntry} 
              disabled={isSaving} 
              className="rounded-xl font-black px-10 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Movimiento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
