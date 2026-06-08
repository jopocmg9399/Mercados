import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  Phone, 
  Mail, 
  MapPin, 
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  ShoppingBag,
  Sparkles,
  Share2, 
  Megaphone, 
  Calendar, 
  Clipboard, 
  MessageSquare, 
  Check, 
  ShoppingCart, 
  Award
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { Supplier as Client, Category } from '../../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ClientManager({ storeId }: { storeId?: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Partial<Client> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Active Sub-Tab: 'list' (Cartera) or 'marketing' (Marketing & Boletines)
  const [activeTab, setActiveTab] = useState<'list' | 'marketing'>('list');

  // Marketing campaign states
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [msgStyle, setMsgStyle] = useState<'colloquial' | 'formal' | 'promo'>('colloquial');
  const [customIntroduction, setCustomIntroduction] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [sentClients, setSentClients] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!storeId) return;

    const qClients = query(
      collection(db, 'clients'), 
      where('storeId', '==', storeId),
      orderBy('name', 'asc')
    );
    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clients');
      setLoading(false);
    });

    const qCategories = query(
      collection(db, 'categories'), 
      where('storeId', '==', storeId),
      orderBy('name', 'asc')
    );
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'categories');
    });

    const qProducts = query(
      collection(db, 'products'),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    }, (error) => {
      console.error("Error loading products for marketing:", error);
    });

    return () => {
      unsubscribeClients();
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, [storeId]);

  // Reactive message builder
  useEffect(() => {
    if (selectedProductIds.length === 0) {
      setDraftMessage("⚠️ Selecciona al menos un producto a la izquierda para armar el boletín, asere.");
      return;
    }

    const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
    
    let intro = "";
    if (msgStyle === 'colloquial') {
      intro = customIntroduction || "¡Qué bolá, asere! 🇨🇺 Te traigo noticias directas de nuestra tienda. Acaban de entrar unos productos fresquecitos y con excelente precio que no te puedes perder. ¡Mira la lista abajo! 👇";
    } else if (msgStyle === 'formal') {
      intro = customIntroduction || "Estimado cliente, nos complace informarle sobre las últimas novedades e ingresos de productos en nuestra plataforma. Le compartimos la lista detallada y sus correspondientes precios a continuación:";
    } else {
      intro = customIntroduction || "🔥 ¡SÚPER OFERTA DEL DÍA! 🔥 Mi gente, esto es para cogerlo al vuelo. Productos con la mejor relación calidad-precio listos para entrega inmediata. ¡Échale un ojo y pídeme antes de que vuelen! ⚡";
    }

    let productsText = "";
    selectedProducts.forEach((p, idx) => {
      const priceText = `${p.price} ${p.currency || 'CUP'}`;
      productsText += `\n📦 *${idx + 1}. ${p.name.toUpperCase()}*\n💰 Precio: *${priceText}*\n📝 ${p.description || 'Sin descripción'}\n`;
    });

    const fullMsg = `${intro}\n${productsText}\n🌐 *Haz tu pedido directamente en nuestro catálogo:* \n👉 ${window.location.origin}/catalog?store=${storeId}\n\n🙏 ¡Gracias por preferir nuestro negocio! ¡Hablamos por aquí! 💬`;
    setDraftMessage(fullMsg);
  }, [selectedProductIds, products, msgStyle, customIntroduction, storeId]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient?.name || !currentClient?.phone || !storeId) {
      toast.error('Nombre, teléfono y tienda son necesarios');
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentClient.id) {
        const clientRef = doc(db, 'clients', currentClient.id);
        const { id, ...data } = currentClient;
        await updateDoc(clientRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
        toast.success('Cliente actualizado');
      } else {
        await addDoc(collection(db, 'clients'), {
          ...currentClient,
          storeId,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Cliente creado');
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Error al guardar el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentClient?.id) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'clients', currentClient.id));
      toast.success('Cliente eliminado');
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (client: Client) => {
    setCurrentClient(client);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setCurrentClient({
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      categories: [],
      active: true
    });
    setIsDialogOpen(true);
  };

  const toggleStatus = async (client: Client) => {
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        active: !client.active,
        updatedAt: serverTimestamp()
      });
      toast.success(`Cliente ${!client.active ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al cambiar el estado');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Cargando clientes de la plaza...</p>
      </div>
    );
  }

  // Calculate statistics for classification blocks
  const tierCounts = {
    VIP: clients.filter(c => c.tier === 'VIP').length,
    Oro: clients.filter(c => c.tier === 'Oro').length,
    Plata: clients.filter(c => c.tier === 'Plata').length,
    Bronce: clients.filter(c => !c.tier || c.tier === 'Bronce').length,
  };

  const handleSelectRecentProducts = () => {
    // Sort products by date desc and take the first 5
    const sorted = [...products].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const newestFive = sorted.slice(0, 5).map(p => p.id);
    setSelectedProductIds(newestFive);
    toast.success("¡Asere! Hemos marcado automáticamente los 5 productos más nuevos de tu inventario.");
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftMessage);
    toast.success("¡Boletín copiado al portapapeles! Listo para pegar en tu grupo de Facebook, Revolico o estados.");
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Sin registros';
    let dateObj;
    if (ts.seconds) {
      dateObj = new Date(ts.seconds * 1000);
    } else if (ts instanceof Date) {
      dateObj = ts;
    } else if (typeof ts === 'number') {
      dateObj = new Date(ts);
    } else {
      return 'Fecha inválida';
    }
    return dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase flex items-center gap-3">
            <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" /> Clientes y Ventas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold">
            Automatización de boletines promocionales e inteligencia de fidelización comercial
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button 
            onClick={openCreateDialog} 
            className="h-12 px-6 gap-2 font-black shadow-lg shadow-indigo-500/20 dark:shadow-indigo-950/40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs flex-1 md:flex-none"
          >
            <Plus className="h-4 w-4" /> Registrar Cliente
          </Button>
        </div>
      </div>

      {/* MENÚ DE PESTAÑAS (TABS CC CON CHISPA CUBANA ACCENT) */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md">
        <button
          onClick={() => setActiveTab('list')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'list' 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
          )}
        >
          <User className="h-4 w-4" /> Cartera de Clientes
        </button>
        <button
          onClick={() => setActiveTab('marketing')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative overflow-hidden",
            activeTab === 'marketing' 
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
          )}
        >
          <Megaphone className="h-4 w-4" /> Chispa de Ventas 🚀
          {activeTab !== 'marketing' && products.length > 0 && (
            <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          )}
        </button>
      </div>

      {/* RENDER PANEL DERECHO/IZQUIERDO SEGÚN TAB */}
      {activeTab === 'list' ? (
        <div className="space-y-6">
          {/* CARDS DE CLASIFICACIÓN / FIDELIDAD */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* VIP TIERS */}
            <div className="bg-gradient-to-br from-violet-600/10 to-indigo-600/5 dark:from-violet-950/30 dark:to-slate-900 border-2 border-violet-100 dark:border-violet-900/40 p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden shadow-sm">
              <div className="absolute right-3 top-3 h-10 w-10 bg-violet-100 dark:bg-violet-900/40 text-violet-600 flex items-center justify-center rounded-2xl">
                <Award className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400">Rango VIP (Fiel)</span>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter">{tierCounts.VIP}</span>
                <span className="text-xs font-semibold text-slate-400 block mt-1">Clientes de alto nivel</span>
              </div>
            </div>

            {/* ORO TIERS */}
            <div className="bg-gradient-to-br from-amber-600/10 to-amber-500/5 dark:from-amber-950/30 dark:to-slate-900 border-2 border-amber-100 dark:border-amber-900/40 p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden shadow-sm">
              <div className="absolute right-3 top-3 h-10 w-10 bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center rounded-2xl">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">Rango Oro (Frecuente)</span>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter">{tierCounts.Oro}</span>
                <span className="text-xs font-semibold text-slate-400 block mt-1">Compras recurrentes</span>
              </div>
            </div>

            {/* PLATA TIERS */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-slate-800/50 dark:to-slate-900 border-2 border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden shadow-sm">
              <div className="absolute right-3 top-3 h-10 w-10 bg-slate-100 dark:bg-slate-800 text-indigo-600 flex items-center justify-center rounded-2xl">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Rango Plata</span>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter">{tierCounts.Plata}</span>
                <span className="text-xs font-semibold text-slate-400 block mt-1">En crecimiento</span>
              </div>
            </div>

            {/* BRONCE TIERS */}
            <div className="bg-gradient-to-br from-orange-600/5 to-orange-500/5 dark:from-slate-800/10 dark:to-slate-900 border-2 border-orange-100/50 dark:border-slate-800/50 p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden shadow-sm">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-600 dark:text-orange-400">Rango Bronce (Nuevos)</span>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter">{tierCounts.Bronce}</span>
                <span className="text-xs font-semibold text-slate-400 block mt-1">Nuevos clientes / un pedido</span>
              </div>
            </div>
          </div>

          {/* CUADRO DE BÚSQUEDA */}
          <div className="bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border-2 border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-450 dark:text-slate-500" />
              <Input 
                placeholder="Buscar por nombre de cliente, contacto o teléfono WhatsApp..." 
                className="pl-12 h-14 bg-slate-50/50 dark:bg-slate-950/50 border-none rounded-3xl font-medium placeholder:text-slate-400 dark:text-white focus-visible:ring-indigo-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* TABLA DE CLIENTES Y CLASIFICACIÓN TRAS COMPRA */}
          <div className="border-2 rounded-[2.5rem] bg-white dark:bg-slate-900 overflow-hidden shadow-2xl shadow-slate-100/50 dark:shadow-none border-slate-100 dark:border-slate-800">
            <div className="overflow-x-auto pretty-scrollbar-x w-full">
              <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-950/20">
                <TableRow className="border-b-2 border-slate-100 dark:border-slate-800">
                  <TableHead className="font-black text-slate-900 dark:text-slate-350 uppercase text-[10px] tracking-[0.15em] p-6">Cliente / Dirección</TableHead>
                  <TableHead className="font-black text-slate-900 dark:text-slate-350 uppercase text-[10px] tracking-[0.15em]">Estatus y Contacto</TableHead>
                  <TableHead className="font-black text-slate-900 dark:text-slate-350 uppercase text-[10px] tracking-[0.15em]">Inteligencia de Fidelidad (Rango)</TableHead>
                  <TableHead className="font-black text-slate-900 dark:text-slate-350 uppercase text-[10px] tracking-[0.15em] text-center">Registro / Compras</TableHead>
                  <TableHead className="text-right font-black text-slate-900 dark:text-slate-350 uppercase text-[10px] tracking-[0.15em] px-6">Acción o Menú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-96 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-4">
                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-full border border-slate-100 dark:border-slate-800">
                          <ShoppingBag className="h-10 w-10 text-slate-305" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-lg">No hay clientes</p>
                          <p className="text-sm font-medium text-slate-500 mt-1">Intenta cambiando el filtro o agrega un cliente manual.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => {
                    const clientTier = client.tier || 'Bronce';
                    return (
                      <TableRow key={client.id} className="group hover:bg-indigo-50/20 dark:hover:bg-slate-800/20 border-b dark:border-slate-800">
                        <TableCell className="p-6">
                          <div className="flex flex-col">
                            <span className="font-black text-xl text-slate-900 dark:text-white tracking-tight italic uppercase block">{client.name}</span>
                            {client.address && (
                              <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1.5 leading-none">
                                <MapPin className="h-3 w-3 text-red-500" /> {client.address}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{client.contactName || 'Sin contacto'}</span>
                            <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                              📞 {client.phone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {clientTier === 'VIP' ? (
                              <Badge className="bg-violet-600 hover:bg-violet-700 text-white font-black text-[9px] uppercase tracking-wider gap-1.5 py-1 px-3 rounded-full w-fit shadow-md">
                                <Award className="h-3.5 w-3.5 animate-bounce" /> 👑 VIP (Cliente Estrella)
                              </Badge>
                            ) : clientTier === 'Oro' ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] uppercase tracking-wider gap-1.5 py-1 px-3 rounded-full w-fit shadow-md">
                                <Sparkles className="h-3.5 w-3.5" /> ⭐ Oro (Súper Fiel)
                              </Badge>
                            ) : clientTier === 'Plata' ? (
                              <Badge className="bg-slate-700 hover:bg-slate-800 text-white font-black text-[9px] uppercase tracking-wider gap-1.5 py-1 px-3 rounded-full w-fit">
                                <ShoppingCart className="h-3 w-3" /> 🥈 Plata
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-500/10 text-orange-600 border border-orange-200 hover:bg-orange-500/20 font-black text-[9px] uppercase tracking-wider py-1 px-3 rounded-full w-fit">
                                🥉 Bronce (Nuevo)
                              </Badge>
                            )}
                            
                            {/* Intereses */}
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {client.categories?.map(catId => {
                                const cat = categories.find(c => c.id === catId);
                                return cat ? (
                                  <span key={catId} className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded font-black tracking-widest uppercase px-1">{cat.name}</span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col gap-1 items-center">
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                              {client.totalOrders || 0} compras
                            </span>
                            {(client.totalSpentCUP || client.totalSpentMLC) ? (
                              <span className={cn(
                                "font-mono text-emerald-600 dark:text-emerald-400 font-black tracking-tight leading-tight block text-center break-all",
                                ((client.totalSpentCUP || 0) + (client.totalSpentMLC || 0)).toString().length > 12
                                  ? "text-[8px]"
                                  : ((client.totalSpentCUP || 0) + (client.totalSpentMLC || 0)).toString().length > 8
                                    ? "text-[9px]"
                                    : "text-[10px]"
                              )}>
                                {client.totalSpentCUP ? `${client.totalSpentCUP.toLocaleString()} CUP` : ''} 
                                {client.totalSpentMLC ? (client.totalSpentCUP ? ` | ${client.totalSpentMLC.toLocaleString()} MLC` : `${client.totalSpentMLC.toLocaleString()} MLC`) : ''}
                              </span>
                            ) : (
                              <span className="text-[9px] italic text-slate-400">Sin compras</span>
                            )}
                            <span className="text-[8px] text-slate-400 font-mono italic">
                              Última: {formatTimestamp(client.lastPurchaseAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-11 w-11 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-650 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-500 transition-all shadow-sm"
                              onClick={() => {
                                const msg = encodeURIComponent(`¡Oye, ${client.contactName || client.name}! ¿Qué bolá? 🇨🇺 Quería saludarte y pasarte nuestro catálogo. ¡Tenemos nuevos ingresos que te van a cuadrar muchísimo! Míralos aquí: ${window.location.origin}/catalog?store=${storeId}`);
                                window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                              }}
                              title="Saludar por WhatsApp"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger render={
                                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" />
                              }>
                                <MoreVertical className="h-5 w-5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-xl border bg-white dark:bg-slate-900 border-slate-100 p-2 shadow-xl">
                                <DropdownMenuItem onClick={() => openEditDialog(client)} className="gap-2 rounded-lg font-bold text-xs uppercase p-3">
                                  <Edit2 className="h-4 w-4 text-indigo-500" /> Editar Ficha
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setCurrentClient(client);
                                    setIsDeleteModalOpen(true);
                                  }} 
                                  className="gap-2 rounded-lg font-bold text-xs uppercase text-rose-600 p-3"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-600" /> Eliminar Ficha
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA DE BOLETINES DE MARKETING ("CHISPA DE VENTAS") */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* COL 1: SELECCIONE PRODUCTOSE (NUEVOS ENTRADOS) */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase italic text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" /> 1. Elegir Novedades
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Marcas lo nuevo para el boletín promocional</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleSelectRecentProducts}
                className="h-10 text-[9px] font-black uppercase tracking-wider px-3 rounded-lg border-indigo-200 text-indigo-650 hover:bg-indigo-50"
              >
                ⏱️ 5 Más Nuevos
              </Button>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
              {products.length === 0 ? (
                <p className="text-xs italic text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                  No hay productos cargados en esta tienda para promocionar.
                </p>
              ) : (
                products.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id);
                  const isRecent = (Date.now() - (p.createdAt || 0)) < (7 * 24 * 3600 * 1000); // 7 days
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                        } else {
                          setSelectedProductIds([...selectedProductIds, p.id]);
                        }
                      }}
                      className={cn(
                        "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between select-none hover:border-indigo-400/65",
                        isSelected 
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500" 
                          : "bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-850"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</span>
                          {isRecent && <Badge className="bg-rose-500 text-white text-[7px] py-[1px] font-black uppercase">¡NUEVO!</Badge>}
                        </div>
                        <span className="text-xs font-bold text-emerald-650 dark:text-emerald-400 font-mono block">
                          {p.price} {p.currency || 'CUP'}
                        </span>
                        {p.createdAt && (
                          <span className="text-[9px] text-slate-400 block font-mono italic">
                            Entrada: {formatTimestamp(p.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center border transition-all",
                        isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      )}>
                        {isSelected && <Check className="h-4 w-4" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium italic">
              * El boletín incluye automáticamente una descripción breve, precio e hipervínculos estructurados para que hagan clic y compren al momento.
            </p>
          </div>

          {/* COL 2: REDACTAR SCRIPT CON CHISPA CUBANA */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 lg:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-black uppercase italic text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <Megaphone className="h-5 w-5 text-indigo-600" /> 2. Personalizar & Tono
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ajusta el estilo del texto promocional</p>
            </div>

            {/* Cambiar estilo */}
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Estilo Literario / Chispa</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  type="button"
                  variant={msgStyle === 'colloquial' ? 'default' : 'outline'}
                  onClick={() => setMsgStyle('colloquial')}
                  className={cn(
                    "h-10 text-[9px] font-black uppercase rounded-lg",
                    msgStyle === 'colloquial' ? 'bg-indigo-600 text-white' : 'text-slate-500'
                  )}
                >
                  🇨🇺 Con Chispa
                </Button>
                <Button 
                  type="button"
                  variant={msgStyle === 'formal' ? 'default' : 'outline'}
                  onClick={() => setMsgStyle('formal')}
                  className={cn(
                    "h-10 text-[9px] font-black uppercase rounded-lg",
                    msgStyle === 'formal' ? 'bg-indigo-600 text-white' : 'text-slate-500'
                  )}
                >
                  👔 Formal
                </Button>
                <Button 
                  type="button"
                  variant={msgStyle === 'promo' ? 'default' : 'outline'}
                  onClick={() => setMsgStyle('promo')}
                  className={cn(
                    "h-10 text-[9px] font-black uppercase rounded-lg",
                    msgStyle === 'promo' ? 'bg-indigo-600 text-white' : 'text-slate-500'
                  )}
                >
                  🔥 Oferta Loca
                </Button>
              </div>
            </div>

            {/* Intro editable */}
            <div className="space-y-2">
              <Label htmlFor="custom-intro" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Introducción Personalizada (Opcional)</Label>
              <Textarea 
                id="custom-intro"
                className="bg-slate-50 dark:bg-slate-950 border-slate-100 rounded-xl text-xs"
                placeholder="Si escribes algo aquí, reemplazará el saludo por defecto en el boletín..."
                value={customIntroduction}
                onChange={(e) => setCustomIntroduction(e.target.value)}
                rows={3}
              />
            </div>

            {/* PREVISUALIZACIÓN EN VIVO DEL MENSAJE */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Previsualización del Boletín comercial</span>
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-sans whitespace-pre-wrap max-h-[220px] overflow-y-auto font-mono scrollbar-thin">
                {draftMessage}
              </div>
            </div>

            {/* Botón copiar para redes */}
            <Button 
              type="button" 
              onClick={handleCopyDraft}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl text-xs font-black uppercase tracking-widest gap-2"
            >
              <Clipboard className="h-4 w-4" /> Copiar para Facebook / Grupos
            </Button>
          </div>

          {/* COL 3: CLIENTES Y ENVIO POR WHATSAPP AUTOMATIZADO */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 lg:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-black uppercase italic text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <Share2 className="h-5 w-5 text-indigo-600" /> 3. Despachar WhatsApp
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Envía el boletín de forma individual y segura</p>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {clients.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No hay clientes agregados todavía.</p>
              ) : (
                clients.map((c) => {
                  const hasSent = sentClients[c.id];
                  return (
                    <div 
                      key={c.id} 
                      className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-105 dark:border-slate-850 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">{c.name}</span>
                          <span className="text-[8px] font-mono font-black border uppercase px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                            {c.tier || 'Bronce'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">🧑 {c.contactName || 'Sin contacto'} - {c.phone}</span>
                      </div>

                      <Button 
                        type="button"
                        onClick={() => {
                          const clientMsg = draftMessage.replace("¡Qué bolá, asere!", `¡Qué bolá, ${c.contactName || c.name}!`);
                          const encodedMsg = encodeURIComponent(clientMsg);
                          
                          window.open(`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodedMsg}`, '_blank');
                          setSentClients(prev => ({
                            ...prev,
                            [c.id]: true
                          }));
                          toast.success(`Boletín despachado para ${c.name}.`);
                        }}
                        className={cn(
                          "h-10 px-3.5 gap-1.5 rounded-xl font-black uppercase text-[9px] tracking-wider transition-all active:scale-95",
                          hasSent 
                            ? "bg-emerald-100 hover:bg-emerald-100 text-emerald-700 shadow-none border border-emerald-300 dark:bg-emerald-950/30" 
                            : "bg-indigo-600 text-white hover:bg-slate-900"
                        )}
                      >
                        {hasSent ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Enviado
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-3.5 w-3.5" /> Enviar
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/30 rounded-2xl space-y-2">
              <span className="text-xs font-black text-amber-600 block uppercase">💡 ¿Por qué es manual/por lotes?</span>
              <p className="text-[10px] text-amber-800 dark:text-amber-400 font-medium">
                WhatsApp prohíbe el envío masivo robotizado con una sola tecla y cancela cuentas. Al enviarlo con este despachador, abres de forma consecutiva cada chat oficial de tus clientes pre-rellenado con un clic. ¡Es súper rápido, personalizado y 100% seguro contra bloqueos!
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-indigo-600">
              {currentClient?.id ? '✏️ Editar Ficha' : '👥 Registrar Cliente'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Completa los datos esenciales. Si el cliente compra en el catálogo con el mismo número telefónico, sus compras se unificarán y su clasificación de fidelidad subirá automáticamente.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateOrUpdate} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="c-name" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Nombre Comercial de la Cuenta / Negocio</Label>
                <Input 
                  id="c-name"
                  placeholder="Ej. Cafetería Versalles o Juan Pérez"
                  value={currentClient?.name || ''}
                  onChange={e => setCurrentClient({...currentClient, name: e.target.value})}
                  className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-contact" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Persona de Contacto</Label>
                <Input 
                  id="c-contact"
                  placeholder="Nombre de pila"
                  value={currentClient?.contactName || ''}
                  onChange={e => setCurrentClient({...currentClient, contactName: e.target.value})}
                  className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-phone" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Teléfono WhatsApp</Label>
                <Input 
                  id="c-phone"
                  placeholder="Ej: +5355555555"
                  value={currentClient?.phone || ''}
                  onChange={e => setCurrentClient({...currentClient, phone: e.target.value})}
                  className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="c-email" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Correo (Opcional)</Label>
                <Input 
                  id="c-email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={currentClient?.email || ''}
                  onChange={e => setCurrentClient({...currentClient, email: e.target.value})}
                  className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="c-address" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Dirección de Entrega</Label>
                <Input 
                  id="c-address"
                  placeholder="Calle, No, Municipio, Provincia..."
                  value={currentClient?.address || ''}
                  onChange={e => setCurrentClient({...currentClient, address: e.target.value})}
                  className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Categorías de Interés</Label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed dark:border-slate-800">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <input 
                        type="checkbox"
                        id={`cat-${category.id}`}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-650 cursor-pointer"
                        checked={currentClient?.categories?.includes(category.id) || false}
                        onChange={(e) => {
                          const prev = currentClient?.categories || [];
                          if (e.target.checked) {
                            setCurrentClient({...currentClient, categories: [...prev, category.id]});
                          } else {
                            setCurrentClient({...currentClient, categories: prev.filter(id => id !== category.id)});
                          }
                        }}
                      />
                      <label htmlFor={`cat-${category.id}`} className="text-xs font-medium text-slate-705 dark:text-slate-300 cursor-pointer">{category.name}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="c-notes" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Preferencias o Comentarios</Label>
                <Textarea 
                  id="c-notes"
                  placeholder="Detalles sobre entregas, empaque preferido, etc."
                  value={currentClient?.notes || ''}
                  onChange={e => setCurrentClient({...currentClient, notes: e.target.value})}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 rounded-xl min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-3 mt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="font-bold rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="font-bold rounded-xl px-8 bg-indigo-600 text-white hover:bg-slate-900"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin font-bold" /> : currentClient?.id ? 'Guardar Cambios' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="rounded-[2rem] bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tighter text-rose-600 uppercase">¿Quieres eliminar este cliente?</DialogTitle>
            <DialogDescription className="text-slate-500">
              Se eliminará de forma permanente el registro de <span className="font-bold text-slate-900 dark:text-white">{currentClient?.name}</span> de tu cartera. Sus estadísticas anteriores no se mostrarán en tableros comerciales.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="font-bold rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="font-bold rounded-xl px-8 bg-red-650 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar de todas formas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
