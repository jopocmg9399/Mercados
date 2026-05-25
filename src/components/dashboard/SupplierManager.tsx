import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Phone, Mail, MapPin, 
  Trash2, Edit2, Loader2, UserPlus, 
  ExternalLink, MessageSquare, AlertCircle
} from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from '../../firebase';
import { 
  collection, onSnapshot, query, 
  where, orderBy, addDoc, deleteDoc, 
  doc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { Supplier } from '../../types';
import { toast } from 'sonner';

export default function SupplierManager({ storeId }: { storeId?: string }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    const q = query(
      collection(db, 'suppliers'), 
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suppData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Supplier[];
      setSuppliers(suppData);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      console.error("Error loading suppliers:", error);
    });

    return () => unsubscribe();
  }, [storeId]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!storeId) return;
    const formData = new FormData(e.currentTarget);
    
    const supplierData: any = {
      name: formData.get('name') as string,
      contactName: formData.get('contactName') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      imageUrl: formData.get('imageUrl') as string,
      notes: formData.get('notes') as string,
      active: true,
      storeId,
      updatedAt: serverTimestamp()
    };

    setIsSaving(true);
    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), supplierData);
        toast.success('Proveedor actualizado, asere.');
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...supplierData,
          createdAt: serverTimestamp()
        });
        toast.success('Nuevo proveedor en la lista, mi gente.');
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
    } catch (error) {
      toast.error('Se nos perdió la conexión con el proveedor. Intenta luego.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar a este socio?')) return;
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      toast.success('Proveedor borrado. ¡A otro con ese cuento!');
    } catch (error) {
      toast.error('No se pudo borrar. El tipo se resiste.');
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactName || '').toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 uppercase italic leading-none flex items-center gap-3">
            Directorio de Proveedores
            <Badge className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border-none font-black px-2">{suppliers.length}</Badge>
          </h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest">Gestiona tus contactos y fuentes de productos</p>
        </div>
        <Button 
          onClick={() => {
            setEditingSupplier(null);
            setIsModalOpen(true);
          }}
          className="rounded-2xl h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Añadir Socio
        </Button>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 transition-colors" />
        </div>
        <Input 
          placeholder="BUSCAR PROVEEDOR POR NOMBRE O TELÉFONO..."
          className="h-16 pl-14 pr-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-bold uppercase tracking-widest shadow-sm focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 transition-all dark:text-white dark:placeholder:text-slate-600"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cargando socios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden hover:shadow-2xl dark:hover:shadow-none hover:border-indigo-100 dark:hover:border-indigo-800 transition-all group bg-white dark:bg-slate-950">
              <CardContent className="p-0">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b-2 border-slate-100 dark:border-slate-800 relative group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm overflow-hidden">
                      {supplier.imageUrl ? (
                        <img src={supplier.imageUrl} alt={supplier.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserPlus className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setIsModalOpen(true);
                        }}
                        className="h-8 w-8 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(supplier.id)}
                        className="h-8 w-8 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase italic leading-tight group-hover:text-indigo-900 dark:group-hover:text-indigo-400">{supplier.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{supplier.contactName || 'Sin nombre de contacto'}</p>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Teléfono</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">{supplier.phone}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.open(`https://wa.me/${supplier.phone.replace(/\D/g,'')}`, '_blank')}
                      className="rounded-xl border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-10 px-4 font-black uppercase text-[10px]"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>

                  {supplier.email && (
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Correo</p>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 truncate">{supplier.email}</p>
                      </div>
                    </div>
                  )}

                  {supplier.address && (
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Dirección</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{supplier.address}</p>
                      </div>
                    </div>
                  )}

                  {supplier.notes && (
                    <div className="mt-4 pt-4 border-t-2 border-slate-50 dark:border-slate-800">
                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Notas
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">{supplier.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredSuppliers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Search className="h-10 w-10 text-slate-300" />
              </div>
              <h4 className="text-xl font-black text-slate-400 uppercase italic">No se encontró ningún socio en la lista</h4>
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Intenta con otro nombre o añade uno nuevo</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Añadir/Editar Proveedor */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleSave}>
            <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <DialogHeader>
                <DialogTitle className="text-3xl font-black uppercase italic leading-none tracking-tight">
                  {editingSupplier ? 'Editar Socio' : 'Añadir Nuevo Socio'}
                </DialogTitle>
                <DialogDescription className="text-indigo-100 font-bold mt-2 uppercase text-[10px] tracking-widest">
                  Registra los datos de tu proveedor de confianza
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-8 grid grid-cols-2 gap-6 bg-white">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre de la Empresa / Proveedor</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={editingSupplier?.name}
                  required 
                  className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm uppercase focus:ring-4 focus:ring-indigo-50"
                  placeholder="EJ. CERVECERÍA 69 S.A."
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="imageUrl" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Logo / Imagen del Proveedor (URL)</Label>
                <Input 
                  id="imageUrl" 
                  name="imageUrl" 
                  defaultValue={editingSupplier?.imageUrl}
                  className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm"
                  placeholder="HTTPS://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre del Contacto</Label>
                <Input 
                  id="contactName" 
                  name="contactName" 
                  defaultValue={editingSupplier?.contactName}
                  className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm uppercase"
                  placeholder="EJ. JUAN PÉREZ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Teléfono / WhatsApp</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  defaultValue={editingSupplier?.phone}
                  required 
                  className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm"
                  placeholder="+53 5555 5555"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Correo Electrónico (Opcional)</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email"
                  defaultValue={editingSupplier?.email}
                  className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm"
                  placeholder="PROVEEDOR@EJEMPLO.COM"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Dirección / Almacén</Label>
                <Input 
                  id="address" 
                  name="address" 
                  defaultValue={editingSupplier?.address}
                  className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm uppercase"
                  placeholder="CALLE 42 #123, LA HABANA"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Notas / Observaciones</Label>
                <Input 
                  id="notes" 
                  name="notes" 
                  defaultValue={editingSupplier?.notes}
                  className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm italic"
                  placeholder="EJ. TRAE MERCANCÍA LOS MARTES"
                />
              </div>
            </div>

            <DialogFooter className="p-8 pt-0 bg-white">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl h-14 px-8 border-2 border-slate-100 font-black uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="flex-1 rounded-2xl h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />}
                {editingSupplier ? 'Actualizar Socio' : 'Añadir al Directorio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
