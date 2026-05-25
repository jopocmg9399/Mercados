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
  Sparkles
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Partial<Client> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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

    return () => {
      unsubscribeClients();
      unsubscribeCategories();
    };
  }, [storeId]);

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
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Clientes / Vendedores</h1>
          <p className="text-slate-500 font-bold">Gestión de Compradores y Canales de Venta</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={openCreateDialog} className="h-12 px-8 gap-2 font-black shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-slate-900 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs">
            <Plus className="h-4 w-4" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <div className="bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Buscar por nombre, contacto o teléfono..." 
            className="pl-12 h-14 bg-slate-50/50 border-none rounded-3xl font-medium placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border-2 rounded-[2rem] bg-white overflow-hidden shadow-2xl shadow-slate-200/50 border-slate-100">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b-2 border-slate-100">
              <TableHead className="font-black text-slate-900 uppercase text-[10px] tracking-[0.2em] p-6">Cliente / Identidad</TableHead>
              <TableHead className="font-black text-slate-900 uppercase text-[10px] tracking-[0.2em]">Contacto Directo</TableHead>
              <TableHead className="font-black text-slate-900 uppercase text-[10px] tracking-[0.2em]">Interés de Compra</TableHead>
              <TableHead className="font-black text-slate-900 uppercase text-[10px] tracking-[0.2em] text-center">Estatus</TableHead>
              <TableHead className="text-right font-black text-slate-900 uppercase text-[10px] tracking-[0.2em] px-6">Gestión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-96 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-6">
                    <div className="bg-slate-50 p-10 rounded-full shadow-inner border-2 border-slate-100">
                      <ShoppingBag className="h-16 w-16 opacity-30 text-indigo-200" />
                    </div>
                    <div className="space-y-2">
                       <p className="font-black text-slate-900 uppercase tracking-widest text-lg">Cartera de Clientes Vacía</p>
                       <p className="text-sm font-medium text-slate-400">No hay clientes registrados que coincidan con la búsqueda.</p>
                    </div>
                    <Button variant="ghost" onClick={openCreateDialog} className="text-indigo-600 font-black uppercase text-xs tracking-widest hover:bg-indigo-50">¡Añade tu primer cliente!</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="group hover:bg-indigo-50/30 transition-all duration-300">
                  <TableCell className="p-6">
                    <div className="flex flex-col">
                      <span className="font-black text-2xl text-slate-900 group-hover:text-indigo-600 transition-colors leading-none italic uppercase tracking-tighter">{client.name}</span>
                      {client.address && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">
                          <MapPin className="h-3 w-3 text-indigo-400" />
                          <span className="truncate max-w-[280px]">{client.address}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 group/item">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-black text-slate-800 text-sm tracking-tight">{client.contactName || 'Sin contacto directo'}</span>
                      </div>
                      <div className="flex items-center gap-3 group/item">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all text-emerald-600">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span className="font-black text-slate-600 text-sm tracking-widest">{client.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2 max-w-[240px]">
                      {client.categories?.length ? (
                        client.categories.map(catId => {
                          const cat = categories.find(c => c.id === catId);
                          return cat ? (
                            <Badge key={catId} variant="outline" className="bg-white border-2 border-slate-100 text-slate-500 font-black uppercase text-[8px] tracking-widest px-2.5 py-1 shadow-sm group-hover:border-indigo-200 group-hover:text-indigo-600 transition-all">
                              {cat.name}
                            </Badge>
                          ) : null;
                        })
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Interés general</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={client.active ? 'default' : 'secondary'}
                      className={cn(
                        "rounded-full px-6 py-2 font-black uppercase text-[9px] tracking-[0.2em] shadow-lg cursor-pointer transition-all active:scale-90",
                        client.active ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" : "bg-slate-200 text-slate-500 shadow-none border-2 border-slate-300"
                      )}
                      onClick={() => toggleStatus(client)}
                    >
                      {client.active ? 'Activo' : 'En Pausa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-[1rem] border-2 border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-500/10 hover:rotate-12"
                        onClick={() => {
                          const msg = encodeURIComponent(`¡Qué bolá, ${client.contactName || client.name}! Aquí te mando nuestra lista actualizada de precios. Avísame qué te interesa.`);
                          window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                        }}
                        title="Enviar Precios por WhatsApp"
                      >
                        <Phone className="h-5 w-5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1rem] bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border-2 border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30" />
                        }>
                          <MoreVertical className="h-6 w-6" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] shadow-2xl border-slate-100 p-3 animate-in fade-in zoom-in-95 duration-200">
                          <DropdownMenuItem onClick={() => openEditDialog(client)} className="gap-3 rounded-xl py-4 font-black uppercase text-[10px] tracking-widest text-slate-700 hover:bg-indigo-50 focus:bg-indigo-50 transition-colors">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Edit2 className="h-4 w-4" /></div> Editar Cliente
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-100 my-2" />
                          <DropdownMenuItem 
                            onClick={() => {
                              setCurrentClient(client);
                              setIsDeleteModalOpen(true);
                            }}
                            className="gap-3 text-rose-600 rounded-xl py-4 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 focus:bg-rose-50 transition-colors"
                          >
                            <div className="bg-rose-100 p-2 rounded-lg text-rose-600"><Trash2 className="h-4 w-4" /></div> Eliminar Ficha
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tighter">
              {currentClient?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
            <DialogDescription>
              Gestiona los datos de tus compradores y canales de venta.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateOrUpdate} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="c-name" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Nombre / Negocio</Label>
                <Input 
                  id="c-name"
                  placeholder="Ej. Cafetería Los Amigos"
                  value={currentClient?.name || ''}
                  onChange={e => setCurrentClient({...currentClient, name: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-contact" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Persona de Contacto</Label>
                <Input 
                  id="c-contact"
                  placeholder="Nombre real"
                  value={currentClient?.contactName || ''}
                  onChange={e => setCurrentClient({...currentClient, contactName: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-phone" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Teléfono WhatsApp</Label>
                <Input 
                  id="c-phone"
                  placeholder="+53 5..."
                  value={currentClient?.phone || ''}
                  onChange={e => setCurrentClient({...currentClient, phone: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="c-email" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Correo Electrónico</Label>
                <Input 
                  id="c-email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={currentClient?.email || ''}
                  onChange={e => setCurrentClient({...currentClient, email: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="c-address" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Dirección de Entrega</Label>
                <Input 
                  id="c-address"
                  placeholder="Calle, No, Municipio..."
                  value={currentClient?.address || ''}
                  onChange={e => setCurrentClient({...currentClient, address: e.target.value})}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Categorías de Interés</Label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-dashed">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <input 
                        type="checkbox"
                        id={`cat-${category.id}`}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
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
                      <label htmlFor={`cat-${category.id}`} className="text-xs font-medium text-slate-700 cursor-pointer">{category.name}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="c-notes" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Notas de Cliente</Label>
                <Textarea 
                  id="c-notes"
                  placeholder="Preferencias de empaque, horarios de recibo, etc."
                  value={currentClient?.notes || ''}
                  onChange={e => setCurrentClient({...currentClient, notes: e.target.value})}
                  className="bg-slate-50 border-slate-200 rounded-xl min-h-[80px]"
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
                className="font-bold rounded-xl px-8 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : currentClient?.id ? 'Guardar Cambios' : 'Crear Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tighter">¿Eliminar Cliente?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro de <span className="font-bold text-slate-900">{currentClient?.name}</span> de forma permanente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="font-bold rounded-xl"
            >
              No, cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="font-bold rounded-xl px-8 shadow-lg shadow-destructive/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
