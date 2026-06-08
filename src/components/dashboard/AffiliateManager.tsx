import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, 
  Trash2, Edit2, Loader2, 
  Share2, Trophy, DollarSign,
  CheckCircle2, XCircle
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from '../../firebase';
import { 
  collection, onSnapshot, query, 
  where, addDoc, deleteDoc, 
  doc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface Affiliate {
  id: string;
  storeId: string;
  name: string;
  code: string;
  phone: string;
  type: 'recommendation' | 'direct_sale';
  active: boolean;
  totalSales: number;
  commissionEarned: number;
  createdAt: number;
}

export default function AffiliateManager({ storeId }: { storeId?: string }) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'affiliates'), 
      where('storeId', '==', storeId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Affiliate[];
      setAffiliates(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      console.error("Error loading affiliates:", error);
    });

    return () => unsubscribe();
  }, [storeId]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!storeId) return;
    const formData = new FormData(e.currentTarget);
    
    const nameInput = formData.get('name') as string;
    let codeInput = (formData.get('code') as string || '').toUpperCase().trim().replace(/\s+/g, '');

    // Auto-generate code from Name/Apodo if user left it blank
    if (!codeInput) {
      const sanitizedName = nameInput
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const prefix = sanitizedName.substring(0, 6) || 'SOCIO';
      const randomDigits = Math.floor(100 + Math.random() * 900);
      codeInput = `${prefix}${randomDigits}`;
    }
    
    const affiliateData = {
      name: nameInput,
      code: codeInput,
      phone: formData.get('phone') as string,
      type: formData.get('type') as 'recommendation' | 'direct_sale',
      active: true,
      storeId,
      updatedAt: serverTimestamp(),
      totalSales: editingAffiliate?.totalSales || 0,
      commissionEarned: editingAffiliate?.commissionEarned || 0,
    };

    // Check code uniqueness within this store
    const existing = affiliates.find(a => a.code === affiliateData.code && a.id !== editingAffiliate?.id);
    if (existing) {
      toast.error('Este código, apodo o sobrenombre ya está en uso, asere. Ponle otro o déjalo vacío para auto-generar.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAffiliate) {
        await updateDoc(doc(db, 'affiliates', editingAffiliate.id), affiliateData);
        toast.success('Socio actualizado');
      } else {
        await addDoc(collection(db, 'affiliates'), {
          ...affiliateData,
          createdAt: serverTimestamp()
        });
        toast.success('Nuevo gestor reclutado');
      }
      setIsModalOpen(false);
      setEditingAffiliate(null);
    } catch (error) {
      toast.error('Algo falló en el reclutamiento');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (affiliate: Affiliate) => {
    try {
      await updateDoc(doc(db, 'affiliates', affiliate.id), {
        active: !affiliate.active
      });
      toast.success(affiliate.active ? 'Socio pausado' : 'Socio reactivado');
    } catch (error) {
      toast.error('No se pudo cambiar el estatus');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres dar de baja a este gestor?')) return;
    try {
      await deleteDoc(doc(db, 'affiliates', id));
      toast.success('Socio eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const filtered = affiliates.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 uppercase italic leading-none flex items-center gap-3 tracking-tighter">
            Gestión de Afiliados y Gestores
            <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-none font-black px-2">{affiliates.length}</Badge>
          </h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest">Controla tu red de ventas y comisiones</p>
        </div>
        <Button 
          onClick={() => {
            setEditingAffiliate(null);
            setIsModalOpen(true);
          }}
          className="rounded-2xl h-14 px-8 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-amber-100 transition-all active:scale-95"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Nuevo Gestor
        </Button>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-amber-600 transition-colors" />
        </div>
        <Input 
          placeholder="BUSCAR POR NOMBRE O CÓDIGO..."
          className="h-16 pl-14 pr-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-bold uppercase tracking-widest shadow-sm focus:ring-4 focus:ring-amber-100 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Escaneando red comercial...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((affiliate) => (
            <Card key={affiliate.id} className="border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-all group bg-white dark:bg-slate-950">
              <CardContent className="p-0">
                <div className={cn(
                  "p-6 border-b-2 border-slate-100 dark:border-slate-800 relative transition-colors",
                  affiliate.active ? "bg-slate-50/50 dark:bg-slate-900/50" : "bg-rose-50/30 dark:bg-rose-900/10 grayscale"
                )}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3",
                      affiliate.type === 'direct_sale' ? "bg-amber-600 text-white" : "bg-black text-white"
                    )}>
                      {affiliate.type === 'direct_sale' ? <Share2 className="h-7 w-7" /> : <Trophy className="h-7 w-7" />}
                    </div>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="icon" onClick={() => toggleStatus(affiliate)} className="h-9 w-9 rounded-xl hover:bg-white shrink-0">
                         {affiliate.active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => { setEditingAffiliate(affiliate); setIsModalOpen(true); }} className="h-9 w-9 rounded-xl hover:bg-white shrink-0">
                         <Edit2 className="h-4 w-4 text-slate-400" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDelete(affiliate.id)} className="h-9 w-9 rounded-xl hover:bg-rose-50 text-rose-500 shrink-0">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase italic tracking-tighter">{affiliate.name}</h3>
                  <div className="mt-2 inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código:</span>
                    <span className="text-xs font-black text-primary uppercase">{affiliate.code}</span>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ventas Logradas</p>
                         <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{affiliate.totalSales}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Comisión Acum.</p>
                         <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-amber-500" />
                            <p className="text-2xl font-black text-amber-600 tabular-nums tracking-tighter">0.00</p>
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t dark:border-slate-800 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Tipo de Gestor</span>
                        <Badge className={cn(
                          "rounded-lg font-black text-[9px] uppercase tracking-widest px-3 py-1",
                          affiliate.type === 'direct_sale' ? "bg-amber-100 text-amber-700" : "bg-black text-white"
                        )}>
                          {affiliate.type === 'direct_sale' ? 'Venta Directa / Gestor' : 'Recomendación / Influencer'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Teléfono</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{affiliate.phone}</span>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="h-20 w-20 bg-white dark:bg-slate-950 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              </div>
              <h4 className="text-xl font-black text-slate-400 dark:text-slate-500 uppercase italic">No se encontró ningún socio en la lista</h4>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest">Añade o invita a un nuevo gestor de ventas para empezar</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Reclutamiento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleSave}>
            <div className="bg-amber-600 p-8 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <DialogHeader>
                <DialogTitle className="text-3xl font-black uppercase italic leading-none tracking-tighter">
                  {editingAffiliate ? 'Actualizar Socio' : 'Nuevo Socio Comercial'}
                </DialogTitle>
                <DialogDescription className="text-amber-100 font-bold mt-2 uppercase text-[10px] tracking-widest italic">
                  Configura los beneficios y el código de tu gestor
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-8 space-y-6 bg-white">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre Comercial del Socio</Label>
                <Input id="name" name="name" defaultValue={editingAffiliate?.name} required className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm uppercase" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Código o Apodo (Opcional)</Label>
                  <Input id="code" name="code" defaultValue={editingAffiliate?.code} placeholder="EJ: EL_LOCO (VACÍO PARA AUTO)" className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm uppercase text-amber-600" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Teléfono de Contacto</Label>
                  <Input id="phone" name="phone" defaultValue={editingAffiliate?.phone} required className="h-12 px-6 rounded-xl border-2 border-slate-100 font-bold text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Modalidad de Trabajo</Label>
                <div className="grid grid-cols-1 gap-3">
                   {[
                     { id: 'recommendation', label: 'Recomendación (Referral Link/Code)', desc: 'Gana por cada venta que traiga el código.' },
                     { id: 'direct_sale', label: 'Venta Directa (Dropshipping/Gestor)', desc: 'Compra para vender a otros y entrega al final.' }
                   ].map((type) => (
                     <label key={type.id} className={cn(
                       "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                       "hover:border-amber-200",
                       "has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50/50"
                     )}>
                        <input 
                          type="radio" 
                          name="type" 
                          value={type.id} 
                          defaultChecked={editingAffiliate?.type === type.id || (!editingAffiliate && type.id === 'recommendation')}
                          className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500" 
                        />
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight leading-none mb-1">{type.label}</p>
                          <p className="text-[10px] font-medium text-slate-500 leading-tight">{type.desc}</p>
                        </div>
                     </label>
                   ))}
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 pt-0 bg-white">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-2xl h-14 px-8 border-2 border-slate-100 font-black uppercase text-[10px] tracking-widest">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="flex-1 rounded-2xl h-14 bg-amber-600 hover:bg-amber-700 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-amber-100 transition-all active:scale-95 text-white">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                {editingAffiliate ? 'Guardar Cambios' : 'Guardar Socio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
