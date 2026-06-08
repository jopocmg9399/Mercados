import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save, Loader2, Trash2, AlertTriangle, RotateCcw, DollarSign, Wallet, CreditCard, Ban, UserPlus, CheckCircle2, MapPin, Truck, Plus, Tag, GitBranch, History, Sparkles, Award } from "lucide-react";
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { StoreSettings, Currency } from '../../types';
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { getProxyImageUrl, cn } from '../../lib/utils';
import StoreBackupRestore from './StoreBackupRestore';
import { ImageFileUploader } from '../ImageFileUploader';
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

const CUBAN_PROVINCES_MUNICIPALITIES: Record<string, string[]> = {
  'La Habana': [
    'Plaza de la Revolución', 'Playa', 'Centro Habana', 'Habana Vieja', 'Regla',
    'Guanabacoa', 'San Miguel del Padrón', 'Diez de Octubre', 'Cerro', 'Marianao',
    'La Lisa', 'Boyeros', 'Arroyo Naranjo', 'Cotorro', 'Habana del Este'
  ],
  'Pinar del Río': [
    'Pinar del Río', 'Consolación del Sur', 'Viñales', 'Minas de Matahambre', 
    'San Juan y Martínez', 'San Luis', 'Guane', 'Mantua', 'Sandino', 'Los Palacios', 'La Palma'
  ],
  'Artemisa': [
    'Artemisa', 'Bauta', 'Caimito', 'Guanajay', 'Mariel', 'San Antonio de los Baños', 
    'Bahía Honda', 'San Cristóbal', 'Candelaria', 'Alquízar', 'Güira de Melena'
  ],
  'Mayabeque': [
    'San José de las Lajas', 'Bejucal', 'Jaruco', 'Santa Cruz del Norte', 'Madruga', 
    'Nueva Paz', 'San Nicolás', 'Melena del Sur', 'Batabanó', 'Quivicán', 'Güines'
  ],
  'Matanzas': [
    'Matanzas', 'Cárdenas', 'Varadero', 'Jovellanos', 'Limonar', 'Colón', 'Jagüey Grande', 
    'Calimete', 'Martí', 'Pedro Betancourt', 'Unión de Reyes', 'Los Arabos', 'Ciénaga de Zapata'
  ],
  'Cienfuegos': [
    'Cienfuegos', 'Abreus', 'Aguada de Pasajeros', 'Cruces', 'Lajas', 'Palmira', 'Rodas', 'Cumanayagua'
  ],
  'Villa Clara': [
    'Santa Clara', 'Sagua la Grande', 'Caibarién', 'Remedios', 'Camajuaní', 'Placetas', 
    'Ranchuelo', 'Santo Domingo', 'Manicaragua', 'Cifuentes', 'Encrucijada', 'Quemado de Güines', 'Corralillo'
  ],
  'Sancti Spíritus': [
    'Sancti Spíritus', 'Trinidad', 'Cabaiguán', 'Fomento', 'Jatibonico', 'Taguasco', 'Yaguajay', 'La Sierpe'
  ],
  'Ciego de Ávila': [
    'Ciego de Ávila', 'Morón', 'Chambas', 'Florencia', 'Venezuela', 'Baraguá', 'Primero de Enero', 
    'Ciro Redondo', 'Majagua', 'Bolivia'
  ],
  'Camagüey': [
    'Camagüey', 'Nuevitas', 'Florida', 'Vertientes', 'Guáimaro', 'Sibanicú', 'Jimaguayú', 
    'Santa Cruz del Sur', 'Najasa', 'Esmeralda', 'Sierra de Cubitas', 'Minas', 'Céspedes'
  ],
  'Las Tunas': [
    'Las Tunas', 'Puerto Padre', 'Amancio', 'Colombia', 'Jesús Menéndez', 'Majibacoa', 'Manatí', 'Jobabo'
  ],
  'Holguín': [
    'Holguín', 'Banes', 'Gibara', 'Mayarí', 'Moa', 'Sagua de Tánamo', 'Rafael Freyre', 'Calixto García', 
    'Cacocum', 'Baguanos', 'Urbano Noris', 'Cueto', 'Frank País', 'Antilla'
  ],
  'Granma': [
    'Bayamo', 'Manzanillo', 'Jiguaní', 'Cauto Cristo', 'Río Cauto', 'Yara', 'Campechuela', 
    'Media Luna', 'Niquero', 'Pilón', 'Bartolomé Masó', 'Buey Arriba', 'Guisa'
  ],
  'Santiago de Cuba': [
    'Santiago de Cuba', 'Palma Soriano', 'Contramaestre', 'San Luis', 'Songo - La Maya', 
    'Mella', 'Segundo Frente', 'Tercer Frente', 'Guamá'
  ],
  'Guantánamo': [
    'Guantánamo', 'Baracoa', 'Maisí', 'Yateras', 'Imías', 'San Antonio del Sur', 
    'Manuel Tames', 'Caimanera', 'El Salvador', 'Niceto Pérez'
  ],
  'Isla de la Juventud': [
    'Nueva Gerona'
  ]
};

export default function SettingsManager({ storeId, platformMode }: { storeId?: string, platformMode?: boolean }) {
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States for version control (platform mode)
  const [newRelVersion, setNewRelVersion] = useState('');
  const [newRelTitle, setNewRelTitle] = useState('');
  const [newRelImpact, setNewRelImpact] = useState('medium'); 
  const [newRelFeaturesText, setNewRelFeaturesText] = useState('');

  const [address, setAddress] = useState({
    province: '',
    municipality: '',
    locality: ''
  });

  // Synchronize municipality options when province changes in settings form
  useEffect(() => {
    if (!address.province) return;
    const available = CUBAN_PROVINCES_MUNICIPALITIES[address.province] || [];
    if (available.length > 0) {
      if (!available.includes(address.municipality)) {
        setAddress(prev => ({ ...prev, municipality: available[0] }));
      }
    } else {
      setAddress(prev => ({ ...prev, municipality: '' }));
    }
  }, [address.province]);

  useEffect(() => {
    if (!storeId && !platformMode) return;
    
    // We listen to either the specific store document or platform settings
    const docRef = platformMode ? doc(db, 'platform_settings', 'global') : doc(db, 'stores', storeId!);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as any;
        if (platformMode) {
          setSettings({
            name: data.name || 'PaTí: Plaza Digital',
            description: data.description || 'Mercado Mayorista de Cuba',
            logo: data.logo || '',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            contactWhatsapp: data.contactWhatsapp || '',
            announcement: data.announcement || '',
            currentVersion: data.currentVersion || '1.1.0',
            releases: data.releases || [],
            active: data.active !== false,
            // Fidelity thresholds
            vipMinCUP: data.vipMinCUP ?? 15000,
            vipMinMLC: data.vipMinMLC ?? 150,
            vipMinOrders: data.vipMinOrders ?? 10,
            oroMinCUP: data.oroMinCUP ?? 6000,
            oroMinMLC: data.oroMinMLC ?? 60,
            oroMinOrders: data.oroMinOrders ?? 5,
            plataMinCUP: data.plataMinCUP ?? 2000,
            plataMinMLC: data.plataMinMLC ?? 20,
            plataMinOrders: data.plataMinOrders ?? 2
          });
        } else {
          const sObj = data.settings || {};
          setSettings({
            name: data.name || 'Nueva Tienda',
            description: data.description || 'Descripción de la tienda',
            logo: data.logo || sObj.logo || '',
            banner: data.banner || sObj.banner || '',
            storeImage: data.storeImage || sObj.storeImage || '',
            phone: sObj.phone || '',
            whatsappNumber: sObj.whatsappNumber || '',
            address: sObj.address || '',
            email: sObj.email || '',
            cupPaymentInstructions: sObj.cupPaymentInstructions || '',
            mlcPaymentInstructions: sObj.mlcPaymentInstructions || '',
            zelleInstructions: sObj.zelleInstructions || '',
            mainCurrency: sObj.mainCurrency || 'CUP',
            enabledCurrencies: sObj.enabledCurrencies || ['CUP'],
            exchangeRates: sObj.exchangeRates || { 'MLC': 1, 'USD': 350, 'EUR': 380, 'ZELLE': 1 },
            activePaymentMethods: sObj.activePaymentMethods || ['cash'],
            affiliateSystemEnabled: sObj.affiliateSystemEnabled || false,
            affiliateMode: sObj.affiliateMode || 'recommendation',
            homeDeliveryEnabled: sObj.homeDeliveryEnabled || false,
            homeDeliveryPlaces: sObj.homeDeliveryPlaces || '',
            homeDeliveryPrice: sObj.homeDeliveryPrice ?? 0,
            homeDeliveryPriceType: sObj.homeDeliveryPriceType || 'fixed',
            homeDeliveryZones: sObj.homeDeliveryZones || []
          });
          
          if (data.location) {
            setAddress({
              province: data.location.province || '',
              municipality: data.location.municipality || '',
              locality: data.location.locality || ''
            });
          }
        }
      } else if (platformMode) {
        // Initial defaults for platform if document doesn't exist
        setSettings({
          name: 'PaTí: Plaza Digital',
          description: 'Mercado Mayorista de Cuba',
          logo: '',
          contactEmail: '',
          contactPhone: '',
          contactWhatsapp: '',
          announcement: '',
          currentVersion: '1.1.0',
          releases: [],
          active: true,
          // Fidelity Thresholds defaults
          vipMinCUP: 15000,
          vipMinMLC: 150,
          vipMinOrders: 10,
          oroMinCUP: 6000,
          oroMinMLC: 60,
          oroMinOrders: 5,
          plataMinCUP: 2000,
          plataMinMLC: 20,
          plataMinOrders: 2
        });
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, platformMode ? 'platform_settings/global' : `stores/${storeId}`);
      } catch (e) {}
    });

    return () => unsubscribe();
  }, [storeId, platformMode]);

  const [resetting, setResetting] = useState(false);

  const [fixingStock, setFixingStock] = useState(false);

  const handleFixNegatives = async () => {
    setFixingStock(true);
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      let batch = writeBatch(db);
      let count = 0;
      let fixedCount = 0;
      
      for (const productDoc of snapshot.docs) {
        const data = productDoc.data();
        if (data.stock < 0) {
          batch.update(productDoc.ref, { stock: 0 });
          count++;
          fixedCount++;
          
          if (count === 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
      
      toast.success(`¡Oye, ya arreglé ${fixedCount} productos que estaban en negativo! Incluyendo la 69 Beer ;)`);
    } catch (error) {
      console.error("Error arreglando negativos:", error);
      toast.error('No pude arreglar los negativos. Se trabó el sistema.');
    } finally {
      setFixingStock(false);
    }
  };

  const handleFactoryReset = async () => {
    setResetting(true);
    try {
      const collections = [
        'products', 
        'inventory_entries', 
        'categories', 
        'suppliers', 
        'clients', 
        'orders', 
        'dispatches', 
        'price_history',
        'affiliates'
      ];
      
      let totalDeleted = 0;
      
      for (const collName of collections) {
        const snapshot = await getDocs(collection(db, collName));
        let batch = writeBatch(db);
        let count = 0;
        
        for (const doc of snapshot.docs) {
          batch.delete(doc.ref);
          count++;
          totalDeleted++;
          
          // Firestore batch limit is 500
          if (count === 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        
        if (count > 0) {
          await batch.commit();
        }
      }
      
      toast.success(`¡REBENCASO COMPLETADO! Se eliminaron ${totalDeleted} registros. La tienda está limpia, asere.`);
    } catch (error) {
      console.error("Error en reset total:", error);
      toast.error('Oye, falló la limpieza. Algo pasó con la base de datos.');
    } finally {
      setResetting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || (!storeId && !platformMode)) return;

    setSaving(true);
    try {
      if (platformMode) {
        await setDoc(doc(db, 'platform_settings', 'global'), {
          ...settings,
          updatedAt: serverTimestamp()
        });
        toast.success('Configuración de la Plataforma actualizada');
      } else {
        // Formatear la dirección completa
        const fullAddress = `${address.locality ? `${address.locality}, ` : ''}${address.municipality}, ${address.province}, Cuba`;
        
        const updatedSettings = {
          ...settings,
          address: fullAddress,
          logo: settings.logo || null,
          banner: settings.banner || null,
          storeImage: settings.storeImage || null
        };

        // Update both top-level and settings object in the store document
        await updateDoc(doc(db, 'stores', storeId!), { 
          settings: updatedSettings,
          name: settings.name,
          description: settings.description,
          logo: settings.logo || null,
          banner: settings.banner || null,
          storeImage: settings.storeImage || null,
          location: {
            province: address.province.trim(),
            municipality: address.municipality.trim(),
            locality: address.locality.trim()
          }
        });
        toast.success('Configuración y ubicación guardadas con éxito');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, platformMode ? 'platform_settings/global' : `stores/${storeId}`);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white italic uppercase">{platformMode ? 'Configuración de Plaza' : 'Configuración'}</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">{platformMode ? 'Control maestro de la plataforma PaTí' : 'Control maestro de la identidad y finanzas del negocio'}</p>
      </div>

      <form onSubmit={handleSave} className="grid gap-8 pb-32">
        {platformMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 border-slate-100 dark:border-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 group">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2 border-slate-100 dark:border-slate-800 p-8">
                <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">Identidad Global</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Nombre de la Plaza</Label>
                  <Input 
                    value={settings.name} 
                    className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white"
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Eslogan / Descripción</Label>
                  <Textarea 
                    rows={3}
                    className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white"
                    value={settings.description} 
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Logo de la Plataforma (URL)</Label>
                  <Input 
                    value={settings.logo} 
                    className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white"
                    onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-100 dark:border-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 group">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2 border-slate-100 dark:border-slate-800 p-8">
                <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">Contacto de Soporte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Email de Soporte</Label>
                  <Input 
                    value={settings.contactEmail} 
                    className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white"
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  />
                </div>
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">WhatsApp de Soporte</Label>
                  <Input 
                    value={settings.contactWhatsapp} 
                    className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white"
                    onChange={(e) => setSettings({ ...settings, contactWhatsapp: e.target.value })}
                  />
                </div>
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Comunicado Global</Label>
                  <Textarea 
                    rows={4}
                    placeholder="Escribe un mensaje para todos los dueños de tiendas..."
                    className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white"
                    value={settings.announcement} 
                    onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* CARD: GESTOR DE VERSIONES (ONLY FOR PLATFORM MANAGER) */}
            <Card className="col-span-1 md:col-span-2 border-2 border-slate-100 dark:border-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 mt-4">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2 border-slate-100 dark:border-slate-800 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-primary" /> Control Maestro de Versiones y Novedades
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Define la versión activa para todos los negocios y actualiza el boletín informativo que verán los administradores de tiendas.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 self-start md:self-auto">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">Versión Actual Activa:</span>
                  <Badge className="bg-primary text-white font-black hover:bg-primary">{settings.currentVersion || '1.1.0'}</Badge>
                </div>
              </CardHeader>

              <CardContent className="p-8 space-y-8">
                {/* 1. Versión Global */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 grid gap-6 md:grid-cols-3 items-end">
                  <div className="grid gap-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      Establecer Versión del Software de la Plataforma
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mb-1">
                      ¡Asere! Define qué versión está corriendo en este momento en los servidores. Al cambiar esto, los managers que tengan una versión antigua verán el aviso con los cambios.
                    </p>
                    <Input 
                      placeholder="Ej: 1.2.0"
                      value={settings.currentVersion || ''} 
                      className="h-12 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black dark:text-white max-w-sm"
                      onChange={(e) => setSettings({ ...settings, currentVersion: e.target.value })}
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 leading-none">Última Actualización</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                      {settings.updatedAt ? "Sincronizado con Firebase" : "Borrador de Cambios"}
                    </span>
                  </div>
                </div>

                {/* 2. Publicar Nueva Actualización (Novedad) */}
                <div className="border border-slate-100 dark:border-slate-800 p-8 rounded-[2rem]">
                  <h3 className="text-base font-black uppercase italic tracking-tight text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" /> Redactar Novedades de una Nueva Versión
                  </h3>

                  <div className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Versión de la Novedad</Label>
                        <Input 
                          placeholder="Ej: 1.2.0"
                          value={newRelVersion}
                          className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white"
                          onChange={(e) => setNewRelVersion(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Título del Boletín (Llamativo y con chispa cubana)</Label>
                        <Input 
                          placeholder="Ej: ¡Inventario y Ajustes Rápidos! Menos fly en tus cuentas 💸"
                          value={newRelTitle}
                          className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white"
                          onChange={(e) => setNewRelTitle(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Impacto Visual</Label>
                        <Select value={newRelImpact} onValueChange={setNewRelImpact}>
                          <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white">
                            <SelectValue placeholder="Impacto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high" className="font-bold flex items-center gap-2">🔴 Alto Nivel (¡Candela!)</SelectItem>
                            <SelectItem value="medium" className="font-bold flex items-center gap-2">🟡 Nivel Medio (Bueno)</SelectItem>
                            <SelectItem value="low" className="font-bold flex items-center gap-2">🟢 Nivel Bajo (Ajuste menor)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2 md:col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Bondades y Cambios (Pon uno por línea, asere)</Label>
                        <Textarea 
                          rows={3}
                          placeholder="Soporte integrado para cobro por Zelle&#10;Listado de inventario exportable&#10;Se eliminó el error de productos negativos"
                          value={newRelFeaturesText}
                          className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white placeholder:italic"
                          onChange={(e) => setNewRelFeaturesText(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border-primary hover:bg-primary hover:text-white text-primary self-start mt-2 px-6 shadow-sm active:scale-95 transition-all"
                      onClick={() => {
                        if (!newRelVersion.trim() || !newRelTitle.trim() || !newRelFeaturesText.trim()) {
                          toast.error("Llena todos los campos de la novedad, asere.");
                          return;
                        }
                        const featuresArray = newRelFeaturesText.split('\n').map(l => l.trim()).filter(Boolean);
                        const newRelease = {
                          version: newRelVersion.trim(),
                          title: newRelTitle.trim(),
                          impact: newRelImpact,
                          features: featuresArray,
                          releasedAt: Date.now()
                        };
                        const updatedReleases = [newRelease, ...(settings.releases || [])];
                        setSettings({
                          ...settings,
                          releases: updatedReleases,
                          currentVersion: newRelVersion.trim() // automatically bump active version
                        });
                        setNewRelVersion('');
                        setNewRelTitle('');
                        setNewRelImpact('medium');
                        setNewRelFeaturesText('');
                        toast.success("¡Novedad agregada! Guarda los cambios de la Plaza abajo para activar de verdad.");
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4" /> Agregar y Activar Versión {newRelVersion || '...'}
                    </Button>
                  </div>
                </div>

                {/* 3. Lista de Versiones Anteriores */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <History className="h-4 w-4" /> Historial de Novedades Registradas
                  </h3>

                  {(!settings.releases || settings.releases.length === 0) ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                      No hay boletines de actualización todavía. ¡Crea el primero arriba, asere!
                    </p>
                  ) : (
                    <div className="grid gap-4 max-h-[350px] overflow-y-auto pr-2">
                      {settings.releases.map((rel: any, idx: number) => (
                        <div 
                          key={rel.version + '-' + idx} 
                          className="flex items-start justify-between p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-slate-100 dark:border-slate-800 transition-all hover:border-slate-200 dark:hover:border-slate-700"
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-slate-900 text-white dark:bg-slate-800 font-extrabold uppercase text-[9px] tracking-wider">
                                {rel.version}
                              </Badge>
                              <Badge className={cn(
                                "font-bold text-[8px] uppercase tracking-wider border",
                                rel.impact === 'high' ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30" :
                                rel.impact === 'medium' ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30" :
                                "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
                              )}>
                                {rel.impact === 'high' ? 'Crítico/Llamativo' : rel.impact === 'medium' ? 'Moderado' : 'Menor'}
                              </Badge>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-mono">
                                {new Date(rel.releasedAt || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight uppercase font-sans tracking-tight">
                              {rel.title}
                            </h4>
                            <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 space-y-1 font-medium font-sans">
                              {Array.isArray(rel.features) ? rel.features.map((feat: string, fIdx: number) => (
                                <li key={fIdx}>{feat}</li>
                              )) : <li>{rel.features}</li>}
                            </ul>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
                            onClick={() => {
                              const updatedReleases = settings.releases.filter((_: any, rIdx: number) => rIdx !== idx);
                              // If deleting currently active version, set to first remaining, or '1.1.0'
                              const nextVersion = rel.version === settings.currentVersion 
                                ? (updatedReleases[0]?.version || '1.1.0')
                                : settings.currentVersion;
                              
                              setSettings({
                                ...settings,
                                releases: updatedReleases,
                                currentVersion: nextVersion
                              });
                              toast.info("Novedad quitada del borrador. Guarda la configuración abajo para aplicar.");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CARD: UMBRALES DE FIDELIDAD DEL CLIENTE (ANTI-INFLACIÓN) */}
            <Card className="col-span-1 md:col-span-2 border-2 border-slate-100 dark:border-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 mt-4">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2 border-slate-100 dark:border-slate-800 p-8">
                <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" /> Umbrales globales de Fidelidad del Cliente (Escudo Anti-Inflación)
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Ajusta los montos acumulados mínimos y cantidad de pedidos que deben cumplir los clientes para escalar de tier de fidelidad en las tiendas. Incrementa estos valores si la inflación hace que los clientes alcancen los niveles muy rápido.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* VIP */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 space-y-4">
                    <span className="text-xs font-black uppercase text-rose-500 tracking-widest block bg-rose-500/10 px-3 py-1.5 rounded-full w-fit">🥇 Categoría VIP</span>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Mínimo Compra (CUP)</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-805 rounded-xl font-black"
                        value={settings.vipMinCUP ?? 15000}
                        onChange={(e) => setSettings({ ...settings, vipMinCUP: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Mínimo Compra (MLC)</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-805 rounded-xl font-black"
                        value={settings.vipMinMLC ?? 150}
                        onChange={(e) => setSettings({ ...settings, vipMinMLC: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Cantidad Mínima Pedidos</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-850 rounded-xl font-black"
                        value={settings.vipMinOrders ?? 10}
                        onChange={(e) => setSettings({ ...settings, vipMinOrders: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* ORO */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 space-y-4">
                    <span className="text-xs font-black uppercase text-amber-500 tracking-widest block bg-amber-500/10 px-3 py-1.5 rounded-full w-fit">🥈 Categoría Oro</span>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Mínimo Compra (CUP)</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-805 rounded-xl font-black"
                        value={settings.oroMinCUP ?? 6000}
                        onChange={(e) => setSettings({ ...settings, oroMinCUP: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Mínimo Compra (MLC)</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-805 rounded-xl font-black"
                        value={settings.oroMinMLC ?? 60}
                        onChange={(e) => setSettings({ ...settings, oroMinMLC: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Cantidad Mínima Pedidos</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-850 rounded-xl font-black"
                        value={settings.oroMinOrders ?? 5}
                        onChange={(e) => setSettings({ ...settings, oroMinOrders: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* PLATA */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 space-y-4">
                    <span className="text-xs font-black uppercase text-indigo-500 tracking-widest block bg-indigo-500/10 px-3 py-1.5 rounded-full w-fit">🥉 Categoría Plata</span>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Mínimo Compra (CUP)</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-805 rounded-xl font-black"
                        value={settings.plataMinCUP ?? 2000}
                        onChange={(e) => setSettings({ ...settings, plataMinCUP: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Mínimo Compra (MLC)</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-805 rounded-xl font-black"
                        value={settings.plataMinMLC ?? 20}
                        onChange={(e) => setSettings({ ...settings, plataMinMLC: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Cantidad Mínima Pedidos</Label>
                      <Input
                        type="number"
                        className="h-11 bg-white dark:bg-slate-900 border-2 border-slate-150 dark:border-slate-850 rounded-xl font-black"
                        value={settings.plataMinOrders ?? 2}
                        onChange={(e) => setSettings({ ...settings, plataMinOrders: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-2 border-slate-100 dark:border-slate-800 shadow-sm rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 group hover:shadow-xl transition-all duration-500">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2 border-slate-100 dark:border-slate-800 p-8">
              <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">Identidad Visual</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium mt-2">Personalidad y presencia de tu marca.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="grid gap-3">
                <Label htmlFor="store-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Nombre del Negocio</Label>
                <Input 
                  id="store-name" 
                  placeholder="Ej: Mercado Central"
                  value={settings.name} 
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="store-desc" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Eslogan Principal</Label>
                <Textarea 
                  id="store-desc" 
                  rows={3}
                  placeholder="Describe qué ofreces..."
                  className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  value={settings.description} 
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="store-logo" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Recurso de Marca (Logo de la Tienda)</Label>
                <ImageFileUploader 
                  value={settings.logo || ""} 
                  onChange={(url) => setSettings({ ...settings, logo: url })} 
                  placeholder="Arrastra el logo físico o haz clic"
                />
                <Input 
                  id="store-logo" 
                  placeholder="https://tuweb.com/logo.png o pega un link"
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  value={settings.logo || ''} 
                  onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="store-banner" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Imagen de Portada o Banner (Imagen Representativa)</Label>
                <ImageFileUploader 
                  value={settings.banner || ""} 
                  onChange={(url) => setSettings({ ...settings, banner: url })} 
                  placeholder="Arrastra tu portada física o haz clic"
                />
                <Input 
                  id="store-banner" 
                  placeholder="https://tuweb.com/portada.png o pega un link"
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  value={settings.banner || ''} 
                  onChange={(e) => setSettings({ ...settings, banner: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="store-image" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Imagen de Tienda (Adicional al Logo)</Label>
                <ImageFileUploader 
                  value={settings.storeImage || ""} 
                  onChange={(url) => setSettings({ ...settings, storeImage: url })} 
                  placeholder="Arrastra una foto de la tienda física o haz clic"
                />
                <Input 
                  id="store-image" 
                  placeholder="https://tuweb.com/tienda_adicional.png o pega un link"
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  value={settings.storeImage || ''} 
                  onChange={(e) => setSettings({ ...settings, storeImage: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-100 dark:border-slate-800 shadow-sm rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 group hover:shadow-xl transition-all duration-500">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2 border-slate-100 dark:border-slate-800 p-8">
              <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">Canales de Contacto</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium mt-2">Vínculos directos con tus clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              {/* Nueva sección de ubicación */}
              <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/30 rounded-[2rem] space-y-6 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Localización Geográfica (Global)</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Provincia</Label>
                    <select
                      className="flex w-full h-12 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white px-3 focus:outline-none focus:ring-0 text-sm"
                      value={address.province}
                      onChange={(e) => setAddress({ ...address, province: e.target.value })}
                    >
                      {[
                        'La Habana', 'Pinar del Río', 'Artemisa', 'Mayabeque', 'Matanzas', 
                        'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila', 
                        'Camagüey', 'Las Tunas', 'Holguín', 'Granma', 'Santiago de Cuba', 
                        'Guantánamo', 'Isla de la Juventud'
                      ].map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Municipio</Label>
                    <select
                      className="flex w-full h-12 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold dark:text-white px-3 focus:outline-none focus:ring-0 text-sm"
                      value={address.municipality}
                      onChange={(e) => setAddress({ ...address, municipality: e.target.value })}
                    >
                      {(CUBAN_PROVINCES_MUNICIPALITIES[address.province] || ['Plaza de la Revolución']).map(muni => (
                        <option key={muni} value={muni}>{muni}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Localidad / Barrio</Label>
                  <Input 
                    autoComplete="new-locality-owner"
                    name="owner_store_locality"
                    placeholder="Ej: Centro Histórico, Vedado"
                    value={address.locality} 
                    className="h-12 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:border-amber-400 dark:text-white transition-all shadow-sm"
                    onChange={(e) => setAddress({ ...address, locality: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="store-phone" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Línea Telefónica</Label>
                <Input 
                  id="store-phone" 
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  value={settings.phone} 
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="whatsapp" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">WhatsApp Business</Label>
                <Input 
                  id="whatsapp" 
                  placeholder="Ej: 5355555555"
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  value={settings.whatsappNumber} 
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Email Corporativo</Label>
                <Input 
                  id="email" 
                  type="email"
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  value={settings.email || ''} 
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Sede</Label>
                <Input 
                  id="address" 
                  className="h-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all shadow-sm"
                  value={settings.address} 
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Global Financial and System Cards (only for store mode) */}
        {!platformMode && (
          <>
            <Card className="border-2 border-stone-100 dark:border-stone-800 shadow-sm rounded-[3rem] overflow-hidden bg-white dark:bg-stone-950/20 group hover:shadow-xl transition-all duration-500">
              <CardHeader className="bg-stone-50/50 dark:bg-stone-900/50 border-b-2 border-stone-100 dark:border-stone-800 p-8">
                <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">Motor Financiero de Precisión</CardTitle>
                <CardDescription className="text-stone-500 dark:text-stone-400 font-medium mt-2">Configuración multi-moneda, tasas de cambio y pasarelas de pago.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-12 p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Main Currency Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-5 w-5 text-amber-600" />
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Moneda Base de Operación</Label>
                    </div>
                    <Select 
                      value={settings.mainCurrency} 
                      onValueChange={(val: Currency) => setSettings({ ...settings, mainCurrency: val })}
                    >
                      <SelectTrigger className="h-16 bg-amber-50/30 dark:bg-amber-950/20 border-2 border-amber-100/50 dark:border-amber-900/40 rounded-2xl font-black text-2xl text-amber-700 dark:text-amber-400 shadow-sm">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl font-bold">
                        <SelectItem value="CUP">CUP (Pesos)</SelectItem>
                        <SelectItem value="MLC">MLC (Convertible)</SelectItem>
                        <SelectItem value="USD">USD (Dólar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="ZELLE">ZELLE (Zelle USD)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-amber-600/60 dark:text-amber-500/60 font-black uppercase mt-2 px-2 italic">
                      * Referencia para cálculos automáticos en el catálogo.
                    </p>
                  </div>

                  {/* Enabled Currencies */}
                  <div className="lg:col-span-2 space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 block mb-1">Pasarelas y Divisas Habilitadas</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {(['CUP', 'MLC', 'USD', 'EUR', 'ZELLE'] as Currency[]).map((cur) => (
                        <div 
                          key={cur}
                          className={cn(
                            "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer",
                            settings.enabledCurrencies.includes(cur) 
                              ? "bg-stone-50 dark:bg-stone-900 border-amber-200 dark:border-amber-900 shadow-sm" 
                              : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-60"
                          )}
                          onClick={() => {
                            const newEnabled = settings.enabledCurrencies.includes(cur)
                              ? settings.enabledCurrencies.filter(c => c !== cur)
                              : [...settings.enabledCurrencies, cur];
                            if (newEnabled.length > 0) {
                              setSettings({ ...settings, enabledCurrencies: newEnabled });
                            } else {
                              toast.error("Al menos una moneda activa");
                            }
                          }}
                        >
                          <span className="font-black text-sm dark:text-white uppercase tracking-tighter">{cur}</span>
                          <Checkbox 
                            checked={settings.enabledCurrencies.includes(cur)} 
                            onCheckedChange={() => {}} 
                            className="rounded-md border-amber-300 data-[state=checked]:bg-amber-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Exchange Rates Grid */}
                <div className="grid gap-6">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 block -mb-4">Tasas de Cambio de Hoy (Vs {settings.mainCurrency})</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {settings.enabledCurrencies.filter(c => c !== settings.mainCurrency).map((cur) => (
                      <div key={cur} className="bg-white dark:bg-stone-900/50 p-6 rounded-[2rem] border-2 border-stone-100 dark:border-stone-800 shadow-sm space-y-4 hover:border-amber-200/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-stone-500">1 {cur} EQUIVALE A</span>
                          <Badge className="bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-none font-black text-[9px] uppercase tracking-widest">Tasa Activa</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <Input 
                            type="number"
                            className="h-16 bg-stone-50 dark:bg-stone-950 border-2 border-stone-100 dark:border-stone-800 rounded-2xl font-black text-3xl text-slate-800 dark:text-white px-6 focus:border-amber-400 focus:bg-white dark:focus:bg-stone-900 transition-all shadow-inner"
                            value={settings.exchangeRates[cur] || 1}
                            onChange={(e) => {
                              const newRates = { ...settings.exchangeRates, [cur]: Number(e.target.value) };
                              setSettings({ ...settings, exchangeRates: newRates });
                            }}
                          />
                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest leading-none">{settings.mainCurrency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Methods Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t-2 border-slate-50 dark:border-slate-800 pt-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-indigo-500" />
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Métodos de Cobro Permitidos</Label>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { id: 'cash' as const, label: 'Efectivo (Cash)', icon: <Wallet className="h-4 w-4" />, desc: 'Pagos presenciales al recibir.' },
                        { id: 'transfer' as const, label: 'Transferencia Bancaria', icon: <CreditCard className="h-4 w-4" />, desc: 'Enzona, Transfermóvil, Zelle o Swift.' }
                      ].map((method) => (
                        <div 
                          key={method.id}
                          className={cn(
                            "flex items-center gap-4 p-5 rounded-3xl border-2 transition-all cursor-pointer",
                            settings.activePaymentMethods.includes(method.id)
                              ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-60"
                          )}
                          onClick={() => {
                            const newMethods = settings.activePaymentMethods.includes(method.id)
                              ? settings.activePaymentMethods.filter(m => m !== method.id)
                              : [...settings.activePaymentMethods, method.id];
                            if (newMethods.length > 0) {
                              setSettings({ ...settings, activePaymentMethods: newMethods });
                            }
                          }}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                            settings.activePaymentMethods.includes(method.id) ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          )}>
                            {method.icon}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-black text-sm uppercase tracking-tight dark:text-white">{method.label}</h5>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{method.desc}</p>
                          </div>
                          <Switch 
                            checked={settings.activePaymentMethods.includes(method.id)}
                            onCheckedChange={() => {}} // Controlled by Div
                            className="data-[state=checked]:bg-indigo-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-indigo-500" />
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Detalles Específicos ZELLE</Label>
                    </div>
                    <div className={cn(
                      "bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/40 space-y-4",
                      !settings.enabledCurrencies.includes('ZELLE') && "opacity-40 grayscale pointer-events-none"
                    )}>
                      <div className="space-y-3">
                        <Label className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 px-1">Explicaciones y Configuración Zelle</Label>
                        <Textarea 
                          rows={4}
                          placeholder="Correo Zelle, Nombre del Titular y pasos adicionales..."
                          className="bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl font-bold focus:shadow-lg transition-all dark:text-white"
                          value={settings.zelleInstructions || ''}
                          onChange={(e) => setSettings({ ...settings, zelleInstructions: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Affiliate System Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t-2 border-slate-50 dark:border-slate-800 pt-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-amber-500" />
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Sistema de Afiliados (Marketplace)</Label>
                    </div>
                    <div className={cn(
                      "flex items-center justify-between p-6 rounded-3xl border-2 transition-all cursor-pointer",
                      settings.affiliateSystemEnabled ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-60"
                    )}
                    onClick={() => setSettings({ ...settings, affiliateSystemEnabled: !settings.affiliateSystemEnabled })}
                    >
                      <div className="flex-1">
                        <h5 className="font-black text-sm uppercase tracking-tight dark:text-white">Habilitar Afiliados</h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Permite que otros vendan o recomienden tus productos.</p>
                      </div>
                      <Switch 
                        checked={settings.affiliateSystemEnabled}
                        onCheckedChange={() => {}} // Controlled by Div
                        className="data-[state=checked]:bg-amber-600"
                      />
                    </div>
                  </div>

                  <div className={cn(
                    "space-y-6 transition-all",
                    !settings.affiliateSystemEnabled && "opacity-40 grayscale pointer-events-none"
                  )}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-amber-500" />
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Modo de Operación</Label>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { id: 'recommendation' as const, label: 'Código de Recomendación', desc: 'El afiliado gana comisión por cada cliente enviado.' },
                        { id: 'direct_sale' as const, label: 'Venta para Terceros', desc: 'El afiliado gestiona la venta y entrega al cliente final.' }
                      ].map((mode) => (
                        <div 
                          key={mode.id}
                          className={cn(
                            "flex items-center gap-4 p-5 rounded-3xl border-2 transition-all cursor-pointer",
                            settings.affiliateMode === mode.id ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 shadow-sm" : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
                          )}
                          onClick={() => setSettings({ ...settings, affiliateMode: mode.id })}
                        >
                          <div className="flex-1">
                            <h5 className="font-black text-[11px] uppercase tracking-tight dark:text-white">{mode.label}</h5>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">{mode.desc}</p>
                          </div>
                          {settings.affiliateMode === mode.id && <CheckCircle2 className="h-5 w-5 text-amber-600" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t-2 border-slate-50 dark:border-slate-800 pt-10">
                  <div className="grid gap-3">
                    <Label htmlFor="payment-cup" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Protocolo CUP (Transfermóvil/Enzona)</Label>
                    <Textarea 
                      id="payment-cup" 
                      rows={4} 
                      className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner dark:text-white"
                      value={settings.cupPaymentInstructions} 
                      onChange={(e) => setSettings({ ...settings, cupPaymentInstructions: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="payment-mlc" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Protocolo Divisas (MLC/USD/EUR)</Label>
                    <Textarea 
                      id="payment-mlc" 
                      rows={4} 
                      className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner dark:text-white"
                      value={settings.mlcPaymentInstructions} 
                      onChange={(e) => setSettings({ ...settings, mlcPaymentInstructions: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-100 dark:border-slate-800 shadow-sm rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 group hover:shadow-xl transition-all duration-500">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2 border-slate-100 dark:border-slate-800 p-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">Entrega a Domicilio (Shipping)</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400 font-medium mt-2">Configura la cobertura territorial y tarifas de envíos de tu negocio.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/25 transition-all">
                  <div className="space-y-1">
                    <h5 className="font-black text-sm uppercase tracking-tight dark:text-white">Ofrecer Entrega a Domicilio</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Habilita el cobro de envío y cobertura de entrega en el catálogo / carrito.</p>
                  </div>
                  <Switch 
                    checked={settings.homeDeliveryEnabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, homeDeliveryEnabled: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {settings.homeDeliveryEnabled && (
                  <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-300">
                    <div className="grid gap-3">
                      <Label htmlFor="delivery-places" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Lugar de Entrega / Cobertura (Zonas de envío)</Label>
                      <Textarea 
                        id="delivery-places" 
                        rows={3}
                        placeholder="Ej: Vedado, Miramar, Centro Habana, Alamar, Habana Vieja, etc."
                        className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner dark:text-white"
                        value={settings.homeDeliveryPlaces || ''} 
                        onChange={(e) => setSettings({ ...settings, homeDeliveryPlaces: e.target.value })}
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase italic px-1">
                        * Especifica todos los repartos, zonas o municipios donde ofreces el servicio.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      {/* Tipo de precio de entrega */}
                      <div className="space-y-3 col-span-full">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Tipo de Tarifa de Envío</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <button
                            type="button"
                            className={cn(
                              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-wider text-center gap-2 h-20",
                              settings.homeDeliveryPriceType === 'fixed'
                                ? "bg-[#F59E0B]/5 border-[#F59E0B] text-[#F59E0B]"
                                : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200"
                            )}
                            onClick={() => setSettings({ ...settings, homeDeliveryPriceType: 'fixed' })}
                          >
                            <DollarSign className="h-5 w-5" />
                            Tarifa Fija
                          </button>

                          <button
                            type="button"
                            className={cn(
                              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-wider text-center gap-2 h-20",
                              settings.homeDeliveryPriceType === 'by_zone'
                                ? "bg-[#F59E0B]/5 border-[#F59E0B] text-[#F59E0B]"
                                : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200"
                            )}
                            onClick={() => setSettings({ ...settings, homeDeliveryPriceType: 'by_zone' })}
                          >
                            <MapPin className="h-5 w-5" />
                            Tarifa por Zonas
                          </button>

                          <button
                            type="button"
                            className={cn(
                              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-wider text-center gap-2 h-20",
                              settings.homeDeliveryPriceType === 'consult'
                                ? "bg-[#F59E0B]/5 border-[#F59E0B] text-[#F59E0B]"
                                : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200"
                            )}
                            onClick={() => setSettings({ ...settings, homeDeliveryPriceType: 'consult' })}
                          >
                            <AlertTriangle className="h-5 w-5" />
                            A Consultar
                          </button>
                        </div>
                      </div>

                      {/* Input de precio fijo */}
                      {settings.homeDeliveryPriceType === 'fixed' && (
                        <div className="grid gap-3 animate-in slide-in-from-left duration-200 col-span-full">
                          <Label htmlFor="delivery-price" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 ml-1">Costo de Entrega / Envío ({settings.mainCurrency || 'CUP'})</Label>
                          <div className="relative">
                            <Input 
                              id="delivery-price" 
                              type="number"
                              min="0"
                              placeholder="Ej: 300"
                              className="h-14 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black text-lg focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner dark:text-white pl-10"
                              value={settings.homeDeliveryPrice || ''} 
                              onChange={(e) => setSettings({ ...settings, homeDeliveryPrice: Number(e.target.value) })}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                              $
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground font-semibold uppercase italic px-1">
                            * Se sumará automáticamente al total en la pasarela de compra para cualquier destino.
                          </p>
                        </div>
                      )}

                      {/* Configuración de Tarifa por Zonas */}
                      {settings.homeDeliveryPriceType === 'by_zone' && (
                        <div className="col-span-full p-6 bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] border-2 border-slate-100 dark:border-slate-850 space-y-4 animate-in slide-in-from-bottom duration-200">
                          <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-2xl">
                            <div>
                              <Label className="text-xs font-black uppercase tracking-widest text-[#F59E0B]">Zonas de Entrega y Sus Tarifas</Label>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 leading-none">Configura cuánto cobras según la distancia o municipio del cliente</p>
                            </div>
                            <Button
                              type="button"
                              className="bg-[#F59E0B] hover:bg-amber-600 text-white font-black uppercase text-[9px] tracking-wider rounded-xl h-8 px-4"
                              onClick={() => {
                                const currentZones = settings.homeDeliveryZones || [];
                                setSettings({
                                  ...settings,
                                  homeDeliveryZones: [...currentZones, { name: '', price: 0 }]
                                });
                              }}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Añadir Zona
                            </Button>
                          </div>

                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {(settings.homeDeliveryZones || []).map((zone: any, idx: number) => (
                              <div key={idx} className="flex gap-3 items-center bg-white dark:bg-slate-950 p-3 rounded-2xl border-2 border-slate-100 dark:border-slate-850 shadow-sm animate-in fade-in duration-200">
                                <Input
                                  placeholder="Ej: MARIANAO o VEDADO"
                                  className="h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 uppercase text-xs font-black flex-1"
                                  value={zone.name || ''}
                                  onChange={(e) => {
                                    const updatedZones = [...(settings.homeDeliveryZones || [])];
                                    updatedZones[idx] = { ...updatedZones[idx], name: e.target.value.toUpperCase() };
                                    setSettings({ ...settings, homeDeliveryZones: updatedZones });
                                  }}
                                />
                                <div className="relative w-36 shrink-0">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="Precio"
                                    className="h-12 pl-8 pr-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-xs font-black"
                                    value={zone.price || ''}
                                    onChange={(e) => {
                                      const updatedZones = [...(settings.homeDeliveryZones || [])];
                                      updatedZones[idx] = { ...updatedZones[idx], price: Number(e.target.value) || 0 };
                                      setSettings({ ...settings, homeDeliveryZones: updatedZones });
                                    }}
                                  />
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0"
                                  onClick={() => {
                                    const updatedZones = (settings.homeDeliveryZones || []).filter((_: any, i: number) => i !== idx);
                                    setSettings({ ...settings, homeDeliveryZones: updatedZones });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}

                            {(settings.homeDeliveryZones || []).length === 0 && (
                              <div className="text-center py-8 bg-white dark:bg-slate-950/40 border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
                                🛵 ¡No hay zonas de entrega creadas aún! Añade una zona para que tus clientes puedan elegirla en el checkout.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* A Consultar */}
                      {settings.homeDeliveryPriceType === 'consult' && (
                        <div className="col-span-full p-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col justify-center text-center animate-in slide-in-from-right duration-200">
                          <span className="font-black text-[11px] text-[#F59E0B] uppercase tracking-widest mb-1">Costo Variable / A consultar</span>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                            El cliente sabrá de la entrega, pero el importe exacto se definirá por consulta / llamada telefónica / WhatsApp a la hora del checkout.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {storeId && (
              <StoreBackupRestore storeId={storeId} />
            )}

            <Card className="border-2 border-rose-100 dark:border-rose-900 shadow-sm rounded-[2rem] overflow-hidden bg-rose-50/30 dark:bg-rose-950/10 group hover:shadow-xl transition-all duration-500">
              <CardHeader className="bg-rose-100/50 dark:bg-rose-900/20 border-b-2 border-rose-200 dark:border-rose-900/40 p-8">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                  <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-rose-900 dark:text-white leading-none">Mantenimiento Crítico</CardTitle>
                </div>
                <CardDescription className="text-rose-700 dark:text-rose-400 font-medium mt-2">Acciones irreversibles que afectan toda la base de datos.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {/* Sanear Inventario Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900 shadow-inner">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase italic">Saneamiento de Catálogo (Fix Negativos)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md">Busca productos con stock por debajo de 0 y los pone en 0 automáticamente.</p>
                  </div>
                  <Button 
                    type="button"
                    onClick={handleFixNegatives}
                    disabled={fixingStock}
                    className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    {fixingStock ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                    Sanear Stocks
                  </Button>
                </div>

                {/* Factory Reset Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-rose-100 dark:border-rose-900/30 shadow-inner">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase italic">Reinicio de Fábrica (Factory Reset)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md">Elimina todos los productos, pedidos, clientes y registros. ¡Cuidado, asere!</p>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button 
                        type="button"
                        variant="destructive" 
                        className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-rose-600 dark:bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-800 text-white shadow-lg shadow-rose-200 dark:shadow-none"
                        disabled={resetting}
                        nativeButton={false}
                      />
                    }>
                      {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                      Reiniciar Tienda
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 shadow-2xl p-0 overflow-hidden">
                      <div className="bg-rose-600 dark:bg-rose-700 p-8 text-white">
                        <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                          <AlertTriangle className="h-10 w-10 text-white" />
                        </div>
                        <AlertDialogTitle className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">¡ALTO AHÍ, MI GENTE!</AlertDialogTitle>
                        <AlertDialogDescription className="text-rose-100 text-sm font-bold uppercase tracking-widest leading-relaxed">
                          Estás a punto de borrar ABSOLUTAMENTE TODO. <br />
                          ¿Seguro que quieres meterle el rebencaso?
                        </AlertDialogDescription>
                      </div>
                      <AlertDialogFooter className="p-8 bg-slate-50 dark:bg-slate-950 flex-col sm:flex-row gap-3">
                        <AlertDialogCancel 
                          variant="outline"
                          size="default"
                          className="h-14 flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-600 hover:bg-slate-700 text-white border-none shadow-none"
                        >
                          No, me arrepentí
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          variant="default"
                          size="default"
                          onClick={handleFactoryReset}
                          className="h-14 flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-rose-600 hover:bg-rose-700 text-white border-none shadow-none"
                        >
                          Sí, Borrar Todo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex justify-end sticky bottom-8 z-10">
          <Button type="submit" className="font-black uppercase tracking-[0.2em] text-xs h-16 px-12 shadow-2xl shadow-indigo-500/40 rounded-[1.5rem] bg-indigo-600 hover:bg-slate-900 dark:hover:bg-slate-800 transition-all active:scale-95" disabled={saving}>
            {saving ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
            {platformMode ? 'Guardar Configuración Plaza' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
