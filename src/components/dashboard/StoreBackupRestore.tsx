import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  deleteDoc, 
  getDocs,
  writeBatch,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Database, 
  UploadCloud, 
  Download, 
  RefreshCw,  
  Trash2, 
  AlertTriangle, 
  Calendar, 
  FileJson, 
  CheckCircle2, 
  Info,
  Layers,
  ShoppingBag,
  Users2,
  FileCode
} from "lucide-react";
import { toast } from 'sonner';

interface BackupRestoreProps {
  storeId: string;
}

export default function StoreBackupRestore({ storeId }: BackupRestoreProps) {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State for creating a backup
  const [backupDescription, setBackupDescription] = useState('');

  // Local Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load backups list from database
  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    const q = query(
      collection(db, 'backups'),
      where('storeId', '==', storeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const backupList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort client-side in descending order of createdAt
      backupList.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setBackups(backupList);
      setLoading(false);
    }, (error) => {
      console.error("Error loading backups:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [storeId]);

  // Read all collections to assemble a complete backup payload
  const assembleBackupPayload = async (description: string) => {
    // 1. Fetch Store doc
    const storeRef = doc(db, 'stores', storeId);
    const storeSnap = await getDoc(storeRef);
    if (!storeSnap.exists()) {
      throw new Error("El negocio de la tienda no existe en el sistema.");
    }
    const storeDocData = storeSnap.data();

    // 2. Fetch categories
    const catQuery = query(collection(db, 'categories'), where('storeId', '==', storeId));
    const catSnap = await getDocs(catQuery);
    const categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Fetch products
    const prodQuery = query(collection(db, 'products'), where('storeId', '==', storeId));
    const prodSnap = await getDocs(prodQuery);
    const products = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 4. Fetch suppliers
    const suppQuery = query(collection(db, 'suppliers'), where('storeId', '==', storeId));
    const suppSnap = await getDocs(suppQuery);
    const suppliers = suppSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 5. Fetch clients
    const clientQuery = query(collection(db, 'clients'), where('storeId', '==', storeId));
    const clientSnap = await getDocs(clientQuery);
    const clients = clientSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 6. Fetch affiliates
    const affQuery = query(collection(db, 'affiliates'), where('storeId', '==', storeId));
    const affSnap = await getDocs(affQuery);
    const affiliates = affSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return {
      version: "1.0",
      storeId,
      storeSlug: storeDocData.slug,
      createdAt: Date.now(),
      description: description || "Salva rápida sin descripción",
      data: {
        store: { id: storeSnap.id, ...storeDocData },
        categories,
        products,
        suppliers,
        clients,
        affiliates
      }
    };
  };

  // Perform full overwrite in Firestore with backup content
  const executeRestore = async (backupPayload: any) => {
    const batch = writeBatch(db);

    // 1. Update the store configuration
    const storeData = backupPayload.data.store;
    if (storeData) {
      const storeRef = doc(db, 'stores', storeId);
      // Keep ID the same to avoid breaks, remove ID from fields
      const { id, ...cleanStore } = storeData;
      batch.set(storeRef, cleanStore, { merge: true });
    }

    // 2. Clean up & restore categories
    const existingCats = await getDocs(query(collection(db, 'categories'), where('storeId', '==', storeId)));
    existingCats.forEach(d => batch.delete(d.ref));
    const restoredCats = backupPayload.data.categories || [];
    restoredCats.forEach((cat: any) => {
      const { id, ...cleanCat } = cat;
      const docRef = id ? doc(db, 'categories', id) : doc(collection(db, 'categories'));
      batch.set(docRef, { ...cleanCat, storeId });
    });

    // 3. Clean up & restore products
    const existingProds = await getDocs(query(collection(db, 'products'), where('storeId', '==', storeId)));
    existingProds.forEach(d => batch.delete(d.ref));
    const restoredProds = backupPayload.data.products || [];
    restoredProds.forEach((prod: any) => {
      const { id, ...cleanProd } = prod;
      const docRef = id ? doc(db, 'products', id) : doc(collection(db, 'products'));
      batch.set(docRef, { ...cleanProd, storeId });
    });

    // 4. Clean up & restore suppliers
    const existingSupps = await getDocs(query(collection(db, 'suppliers'), where('storeId', '==', storeId)));
    existingSupps.forEach(d => batch.delete(d.ref));
    const restoredSupps = backupPayload.data.suppliers || [];
    restoredSupps.forEach((supp: any) => {
      const { id, ...cleanSupp } = supp;
      const docRef = id ? doc(db, 'suppliers', id) : doc(collection(db, 'suppliers'));
      batch.set(docRef, { ...cleanSupp, storeId });
    });

    // 5. Clean up & restore clients
    const existingClients = await getDocs(query(collection(db, 'clients'), where('storeId', '==', storeId)));
    existingClients.forEach(d => batch.delete(d.ref));
    const restoredClients = backupPayload.data.clients || [];
    restoredClients.forEach((client: any) => {
      const { id, ...cleanClient } = client;
      const docRef = id ? doc(db, 'clients', id) : doc(collection(db, 'clients'));
      batch.set(docRef, { ...cleanClient, storeId });
    });

    // 6. Clean up & restore affiliates
    const existingAffs = await getDocs(query(collection(db, 'affiliates'), where('storeId', '==', storeId)));
    existingAffs.forEach(d => batch.delete(d.ref));
    const restoredAffs = backupPayload.data.affiliates || [];
    restoredAffs.forEach((aff: any) => {
      const { id, ...cleanAff } = aff;
      const docRef = id ? doc(db, 'affiliates', id) : doc(collection(db, 'affiliates'));
      batch.set(docRef, { ...cleanAff, storeId });
    });

    await batch.commit();
  };

  // Handler: Save backup to Firestore
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = await assembleBackupPayload(backupDescription);
      await addDoc(collection(db, 'backups'), payload);
      toast.success('¡Salva creada con éxito en la nube, asere!');
      setBackupDescription('');
    } catch (error) {
      console.error(error);
      toast.error('Rayos, falló la creación de la salva.');
    } finally {
      setCreating(false);
    }
  };

  // Handler: Restore a backup from Firebase
  const handleRestoreFromCloud = async (backup: any) => {
    const confirmation = window.confirm(
      `¡Oye, asere! ¿Estás de verdad seguro de restaurar la salva "${backup.description}"?\nEsto borrará todos tus productos, categorías, proveedores y clientes actuales para escribir los guardados el ${new Date(backup.createdAt).toLocaleString()}.`
    );
    if (!confirmation) return;

    setRestoringId(backup.id);
    try {
      await executeRestore(backup);
      toast.success('¡Qué clase de maravilla! Tienda restaurada a su estado anterior.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo completar la restauración de datos en la nube.');
    } finally {
      setRestoringId(null);
    }
  };

  // Handler: Delete dry backup document
  const handleDeleteBackup = async (id: string) => {
    const confirmation = window.confirm('¿Quieres eliminar esta salva permanentemente de la nube?');
    if (!confirmation) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'backups', id));
      toast.success('Salva eliminada de la nube.');
    } catch (error) {
      console.error(error);
      toast.error('Fallo al eliminar la salva.');
    } finally {
      setDeletingId(null);
    }
  };

  // Handler: Export current store to a JSON file (Downloads locally)
  const handleExportLocal = async () => {
    try {
      toast.loading('Preparando paquete de exportación...');
      const payload = await assembleBackupPayload(`Exportación manual desde panel`);
      toast.dismiss();

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pati_Export_${payload.storeSlug}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('¡Listo asere! Archivo de exportación descargado con éxito.');
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error('Error al generar la exportación.');
    }
  };

  // Handler: Custom file import read
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.version || !parsed.data || !parsed.data.store) {
          toast.error('Este archivo no tiene el formato oficial de salvas de PaTí.');
          setImportedData(null);
          setImportFile(null);
          return;
        }
        setImportedData(parsed);
        toast.info('Archivo cargado y verificado correctamente. Revisa el resumen y presiona Importar.');
      } catch (err) {
        toast.error('Error al parsear el archivo JSON. Verifica que esté íntegro.');
        setImportedData(null);
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  // Handler: Confirm parsing and import of local JSON to Firestore overwriting current state
  const handleImportLocal = async () => {
    if (!importedData) return;
    const confirmation = window.confirm(
      `¡ALERTA MÁXIMA! Estás por importar el archivo guardado originalmente el ${new Date(importedData.createdAt).toLocaleString()}.\nEsto sobreescribirá por completo todos los productos, categorías, proveedores y clientes en esta tienda. ¿Proceder, asere?`
    );
    if (!confirmation) return;

    setImporting(true);
    try {
      await executeRestore(importedData);
      toast.success('¡Importación completada! Los datos de la tienda han sido renovados.');
      // Reset local file states
      setImportFile(null);
      setImportedData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      toast.error('No se pudo completar la importación del archivo.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-primary/10 border border-indigo-200/30 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 dark:from-indigo-950/20 dark:to-primary/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Database className="h-5 w-5" />
            </span>
            <span className="font-black text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Centro de Respaldo PaTí</span>
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Salva, Restaura, Exporta e Importa</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Mantén a salvo el inventario, catálogo, clientes y la configuración de tu negocio. Puedes crear copias en la base de datos o descargarlas directamente en tu computadora.
          </p>
        </div>
        <div className="flex gap-3 self-stretch md:self-auto">
          <Button 
            onClick={handleExportLocal}
            className="flex-1 md:flex-initial h-11 px-6 bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-bold uppercase text-[9px] tracking-wider rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Exportar Datos (.JSON)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Database Backups */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <UploadCloud className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Copias en la Nube</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Guarda y restaura al instante en la base de datos.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Form to create current backup */}
              <form onSubmit={handleCreateBackup} className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800/60 flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest ml-1 text-slate-500">Nota o Descripción para la salva</Label>
                  <Input 
                    value={backupDescription}
                    onChange={e => setBackupDescription(e.target.value)}
                    placeholder="Ej: Salva previa cambio de precios muelle"
                    className="rounded-xl h-10 border-slate-200 bg-white dark:bg-slate-900 focus-visible:ring-primary/20 text-xs"
                    required
                  />
                </div>
                <Button 
                  type="submit"
                  disabled={creating}
                  className="rounded-xl h-10 px-5 font-black text-[9px] uppercase tracking-widest bg-primary hover:bg-primary/95 text-white active:scale-95 transition-all text-center flex items-center gap-1.5"
                >
                  {creating ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Database className="h-3.5 w-3.5" />
                      Crear Salva
                    </>
                  )}
                </Button>
              </form>

              {/* Backups list */}
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Historial de Salvas en la Nube</span>
                
                {loading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="animate-spin h-6 w-6 text-primary mx-auto mb-2" />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cargando salvas de la base de datos...</span>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-transparent">
                     <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No hay salvas creadas en la nube para esta tienda.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {backups.map((bk) => (
                      <div key={bk.id} className="p-4 bg-slate-50/75 dark:bg-slate-950/40 rounded-2xl border dark:border-slate-800 border-slate-100 flex items-center justify-between gap-4 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate" title={bk.description}>
                            {bk.description}
                          </p>
                          <div className="flex items-center gap-3 text-[9px] font-semibold text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {new Date(bk.createdAt).toLocaleDateString()} {new Date(bk.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="bg-slate-200/50 dark:bg-slate-850 px-2 py-0.5 rounded text-primary">
                              {bk.data?.products?.length || 0} Prod
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button 
                            variant="outline"
                            onClick={() => handleRestoreFromCloud(bk)}
                            disabled={restoringId !== null}
                            className="h-8 px-4 rounded-lg font-black text-[9px] uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-950/80 active:scale-95 transition-all text-center flex items-center gap-1"
                          >
                            {restoringId === bk.id ? (
                              <Loader2 className="animate-spin h-3 w-3" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Restaura
                          </Button>
                          <Button 
                            variant="ghost"
                            size="icon"
                            disabled={deletingId !== null}
                            onClick={() => handleDeleteBackup(bk.id)}
                            className="h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-600"
                            title="Eliminar salva permanentemente"
                          >
                            {deletingId === bk.id ? (
                              <Loader2 className="animate-spin h-3.5 w-3.5" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Column: Local Files (Export / Import) */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <FileJson className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Importación Local</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Sube copias en archivo JSON para recuperar tu negocio.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* File upload zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-2xl bg-slate-50 dark:bg-slate-950/20 text-center cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/40 transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".json" 
                  className="hidden" 
                />
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Sube tu Archivo .JSON</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Haz click para seleccionar la salva descargada desde tu computadora</p>
                {importFile && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">
                    <CheckCircle2 className="h-3 w-3" /> {importFile.name}
                  </div>
                )}
              </div>

              {/* Uploaded File Data Preview */}
              {importedData && (
                <div className="p-5 border border-amber-200 bg-amber-500/5 rounded-2xl dark:border-amber-800/60 max-h-[350px] overflow-y-auto space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-black text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">Fichero Verificado Elegible para Importar</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                        Este archivo contiene una salva completa de la tienda. Puedes revisar el resumen abajo antes de sobreescribir los datos actuales.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border dark:border-slate-800 flex items-center gap-2 shadow-sm">
                      <Layers className="h-4 w-4 text-slate-450 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Categorías</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{importedData.data?.categories?.length || 0}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border dark:border-slate-800 flex items-center gap-2 shadow-sm">
                      <ShoppingBag className="h-4 w-4 text-slate-450 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Productos</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{importedData.data?.products?.length || 0}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border dark:border-slate-800 flex items-center gap-2 shadow-sm">
                      <Users2 className="h-4 w-4 text-slate-450 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Clientes</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{importedData.data?.clients?.length || 0}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border dark:border-slate-800 flex items-center gap-2 shadow-sm col-span-2 md:col-span-3">
                      <FileCode className="h-4 w-4 text-slate-450 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Fecha de Creación de la Salva</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate block">
                          {new Date(importedData.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleImportLocal}
                      disabled={importing}
                      className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="animate-spin h-3.5 w-3.5" />
                          Importando y Sobreescribiendo...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 animate-bounce" /> Importar & Sobreescribir todo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
