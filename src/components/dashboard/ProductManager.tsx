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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical,
  Loader2,
  Save,
  History,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  Calendar,
  CheckCircle2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, getProxyImageUrl } from "../../lib/utils";
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, getDoc, serverTimestamp, runTransaction, where, getDocs, writeBatch, increment } from 'firebase/firestore';
import { Product, Category, PriceHistory } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import VolumeDiscountCalculator from './VolumeDiscountCalculator';
import { ImageFileUploader } from '../ImageFileUploader';

const PACKAGING_PRESETS = [
  { name: 'Caja x24', quantity: 24, targetProfitMargin: 70 },
  { name: 'Caja x12', quantity: 12, targetProfitMargin: 75 },
  { name: 'Paquete x6', quantity: 6, targetProfitMargin: 80 },
  { name: 'Display x12', quantity: 12, targetProfitMargin: 75 },
  { name: 'Saco 50lb', quantity: 50, targetProfitMargin: 65 },
  { name: 'Saco 100lb', quantity: 100, targetProfitMargin: 60 },
  { name: 'Bolsa x10', quantity: 10, targetProfitMargin: 80 },
];

export default function ProductManager({ storeId }: { storeId?: string }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // Custom states for Volume Discount Calculator
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorProductContext, setCalculatorProductContext] = useState<any>(null);
  const [calculatorTarget, setCalculatorTarget] = useState<'edit' | 'new'>('edit');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('base');

  const handleApplyCalculatedTiers = (tiers: any[], packagingOptionId?: string) => {
    if (calculatorTarget === 'edit' && editingProduct) {
      if (packagingOptionId === 'base') {
        setEditingProduct({
          ...editingProduct,
          wholesaleTiers: tiers
        });
        toast.info("Escalas comerciales del producto actualizadas con el margen protegido.");
      } else {
        const options = [...(editingProduct.packagingOptions || [])];
        const optIdx = options.findIndex(o => o.id === packagingOptionId);
        if (optIdx > -1) {
          options[optIdx] = {
            ...options[optIdx],
            wholesaleTiers: tiers
          };
          setEditingProduct({
            ...editingProduct,
            packagingOptions: options
          });
          toast.info(`Escalas aplicadas al formato '${options[optIdx].name}'.`);
        }
      }
    } else if (calculatorTarget === 'new' && newProduct) {
      if (packagingOptionId === 'base') {
        setNewProduct({
          ...newProduct,
          wholesaleTiers: tiers
        });
        toast.info("Escala calculada asignada al nuevo producto.");
      } else {
        const options = [...(newProduct.packagingOptions || [])];
        const optIdx = options.findIndex(o => o.id === packagingOptionId);
        if (optIdx > -1) {
          options[optIdx] = {
            ...options[optIdx],
            wholesaleTiers: tiers
          };
          setNewProduct({
            ...newProduct,
            packagingOptions: options
          });
          toast.info(`Escalas aplicadas al formato '${options[optIdx].name}'.`);
        }
      }
    }
  };
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    currency: 'CUP',
    category: '',
    stock: 0,
    active: true,
    image: '',
    expiryDate: '',
    packagingOptions: []
  });

  const getExpiryStatus = (date?: string) => {
    if (!date) return null;
    const expiry = new Date(date);
    const today = new Date();
    const diff = expiry.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { label: 'Vencido', color: 'bg-rose-500', icon: AlertTriangle };
    if (days <= 7) return { label: 'Próximo', color: 'bg-amber-500', icon: Calendar };
    return { label: 'Al Día', color: 'bg-emerald-500', icon: CheckCircle2 };
  };

  const toggleActive = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), { active: !product.active });
      toast.success(product.active ? 'Producto pausado' : 'Producto reactivado');
    } catch (e) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar este producto?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Producto eliminado');
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Borrar categoría? Solo funcionará si no tiene productos asociados.')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      toast.success('Categoría eliminada');
    } catch (e) {
      toast.error('Error al eliminar categoría');
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategory({ name: cat.name, description: cat.description });
    setIsCategoryModalOpen(true);
  };

  const calculateSuggestedPrices = (costParam: number, currentPriceParam: number, tiers: any[], marginParam: number, maxPriceParam: number, parentBestPriceParam?: number) => {
    const costoUnitario = Number(costParam) || 0;
    const currentPrice = Number(currentPriceParam) || 0;
    const parentBestPrice = parentBestPriceParam ? Number(parentBestPriceParam) : 0;

    // 1. Definir el Precio de Venta Tope (precioVentaTope) para este empaque
    // Debe ser menor o igual al mejor precio del empaque padre, o al precio base individual
    const precioVentaTope = parentBestPrice > 0 ? Math.min(currentPrice, parentBestPrice) : currentPrice;

    // Diferencia entre el costo y el precio tope (Diferencia de margen bruto)
    const marginTotal = Math.max(0, precioVentaTope - costoUnitario);

    // Margen de ganancia protegido (%)
    const porcentajeProteccion = Number(marginParam) || 70;

    // Ganancia mínima protegida ($)
    const gananciaMinima = marginTotal * (porcentajeProteccion / 100);

    // Presupuesto de descuento máximo permitido para distribuir entre las escalas ($)
    const descuentoMaximoAbsoluto = marginTotal - gananciaMinima;

    // Vamos a evaluar la cantidad de escalas solicitadas
    const N_solicitada = Math.max(1, tiers.length);

    // Necesitamos que el descuento máximo (entero) permita las N escalas + un colchón de 2 escalas adicionales
    // Cada escala debe tener un descuento entero estrictamente creciente (por ejemplo, descuento en escala i >= i)
    // El nivel N+2 (las N solicitadas + 2 de colchón) tendría un descuento mínimo acumulado de N+2
    // Por lo tanto, el presupuesto entero de descuento debe ser de al menos N + 2
    const presupuestoEnteroMaximo = Math.floor(descuentoMaximoAbsoluto);
    const cushion = 2;
    const N_requerido_con_colchon = N_solicitada + cushion;

    let N_compliant = N_solicitada;
    let isAdjusted = false;

    if (presupuestoEnteroMaximo < N_requerido_con_colchon) {
      // No alcanza para las N escalas solicitadas más el colchón de 2 escalas con descuentos enteros incrementales.
      // Proponemos la cantidad de escalas que sí garanticen el cumplimiento del modelo.
      N_compliant = Math.max(1, presupuestoEnteroMaximo - cushion);
      isAdjusted = true;
    }

    // Ahora creamos o recortamos el arreglo de tiers para reflejar la cantidad propuesta
    let finalTiers = [...tiers];
    if (finalTiers.length !== N_compliant) {
      if (finalTiers.length > N_compliant) {
        // Recortamos a la cantidad que garantiza cumplimiento
        finalTiers = finalTiers.slice(0, N_compliant);
      } else {
        // Expandimos hasta N_compliant agregando nuevos tiers
        const lastMin = finalTiers.length > 0 ? finalTiers[finalTiers.length - 1].minPackages : 0;
        const diffCount = N_compliant - finalTiers.length;
        for (let i = 1; i <= diffCount; i++) {
          finalTiers.push({
            id: Math.random().toString(36).substring(2, 9),
            minPackages: lastMin + i * 5,
            pricePerUnit: precioVentaTope
          });
        }
      }
    }

    // Distribuimos el descuento garantizando que sean enteros y escalonados
    const result = finalTiers.map((tier, idx) => {
      const level = idx + 1;
      const totalSteps = N_compliant + cushion;
      
      let descuentoAplicador = Math.round((level / totalSteps) * presupuestoEnteroMaximo);
      
      // Aseguramos crecimiento estricto (al menos 1 unidad más de descuento que el nivel anterior)
      if (idx > 0) {
        const prevDiscount = precioVentaTope - finalTiers[idx - 1].pricePerUnit;
        descuentoAplicador = Math.max(prevDiscount + 1, descuentoAplicador);
      } else {
        descuentoAplicador = Math.max(1, descuentoAplicador);
      }

      // El descuento no puede comerse el presupuesto para este nivel, y de todos modos
      // debe dejar suficiente espacio de colchón para los niveles siguientes.
      const maxDescuentoParaEsteNivel = presupuestoEnteroMaximo - (totalSteps - level);
      if (descuentoAplicador > maxDescuentoParaEsteNivel) {
        descuentoAplicador = maxDescuentoParaEsteNivel;
      }

      // Precio final para este tier de volumen (vendedores/mayoreo)
      let precioFinal = Math.max(costoUnitario, Math.round(precioVentaTope - descuentoAplicador));

      return {
        ...tier,
        pricePerUnit: precioFinal
      };
    });

    // Avisamos al usuario con cuban chispa si se ajustaron las escalas
    if (isAdjusted) {
      toast.warning(`⚠️ ¡Oye, asere! Para garantizar tu colchón de +2 escalas y proteger tu ${porcentajeProteccion}% de ganancia, ajustamos tus escalas de ${N_solicitada} a ${N_compliant}.`);
    } else {
      toast.success(`✅ Escalas de mayoreo calculadas dejando un colchón libre de +2 niveles.`);
    }

    return result;
  };

  const getUnits = (p: any, all: any[]): number => {
    if (!p) return 1;
    let units = Number(p.quantity) || 1;
    let curr = p;
    let safety = 0;
    while (curr.parentPackId && curr.parentPackId !== 'none' && safety < 10) {
      const parent = all.find((x: any) => x.id === curr.parentPackId);
      if (!parent) break;
      units *= (Number(parent.quantity) || 1);
      curr = parent;
      safety++;
    }
    return units;
  };

  const suggestPricesWithAI = async (optIdx?: number) => {
    if (optIdx === undefined) return;
    
    // Identificamos el producto activo y la opción de empaque correspondiente
    const isEditing = !!editingProduct && isEditModalOpen;
    const activeProduct = isEditing ? editingProduct : newProduct;
    
    if (!activeProduct || !activeProduct.packagingOptions || !activeProduct.packagingOptions[optIdx]) {
      toast.error("No se encontraron datos del formato de empaque para analizar con IA.");
      return;
    }
    
    const opt = activeProduct.packagingOptions[optIdx];
    const currentTiers = opt.wholesaleTiers && opt.wholesaleTiers.length > 0 ? opt.wholesaleTiers : [
      { id: Math.random().toString(36).substring(2,9), minPackages: 5, pricePerUnit: activeProduct.price || 0 },
      { id: Math.random().toString(36).substring(2,9), minPackages: 10, pricePerUnit: activeProduct.price || 0 },
    ];
    
    setIsAiSuggesting(true);
    try {
      const response = await fetch("/api/gemini/suggest-wholesale-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productData: {
            name: activeProduct.name || "Producto Muestra",
            cost: activeProduct.cost || 0,
            price: activeProduct.price || 0,
            currency: activeProduct.currency || "CUP",
            margin: opt.targetProfitMargin || 70,
            individualWholesaleTiers: activeProduct.wholesaleTiers || [],
            packagingName: opt.name || "Embalaje",
            packagingQuantity: opt.quantity || 1,
          },
          tiers: currentTiers.map(t => ({
            minPackages: t.minPackages,
            pricePerUnit: t.pricePerUnit,
          })),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Respuesta del servidor no válida.");
      }
      
      const data = await response.json();
      
      if (data && data.suggestedTiers) {
        // Mapeamos de vuelta las sugerencias
        const updatedTiers = currentTiers.map((t, index) => {
          const suggested = data.suggestedTiers[index];
          if (!suggested) return null;
          return {
            ...t,
            pricePerUnit: Number(suggested.pricePerUnit) || t.pricePerUnit,
          };
        }).filter((t): t is any => t !== null);
        
        let finalTiers = updatedTiers;
        if (data.proposedCount && data.proposedCount < currentTiers.length) {
          finalTiers = updatedTiers.slice(0, data.proposedCount);
        }
        
        // Actualizamos el estado del producto correspondiente
        if (isEditing) {
          const options = [...(editingProduct.packagingOptions || [])];
          options[optIdx].wholesaleTiers = finalTiers;
          setEditingProduct({ ...editingProduct, packagingOptions: options });
        } else {
          const options = [...(newProduct.packagingOptions || [])];
          options[optIdx].wholesaleTiers = finalTiers;
          setNewProduct({ ...newProduct, packagingOptions: options });
        }
        
        // Mostrar justificación de la IA
        if (data.cubanExplanation) {
          toast.success(`🤖 IA dice: "${data.cubanExplanation}"`, { duration: 8000 });
        } else {
          toast.success("🎉 Escalas configuradas por IA con total precisión y colchón garantizado.");
        }
      }
    } catch (error) {
      console.error("Error al consultar sugerencias de precio con IA:", error);
      // Fallback matemático impecable
      toast.info("¡Asere, la IA está ocupada cocinando, pero te activamos nuestro modelo matemático preciso para no dejarte embarcado!");
      
      const options = [...(activeProduct.packagingOptions || [])];
      let maxBasePrice = activeProduct.price || 0;
      let parentBestPrice = 0;
      
      // Obtener mejor precio del padre para herencia
      if (opt.parentPackId && opt.parentPackId !== 'none') {
        const parent = options.find(o => o.id === opt.parentPackId);
        if (parent && parent.wholesaleTiers && parent.wholesaleTiers.length > 0) {
          parentBestPrice = Math.min(...parent.wholesaleTiers.map((t: any) => t.pricePerUnit));
        } else if (parent) {
          parentBestPrice = activeProduct.price || 0;
        }
      } else {
        if (activeProduct.wholesaleTiers && activeProduct.wholesaleTiers.length > 0) {
          parentBestPrice = Math.min(...activeProduct.wholesaleTiers.map((t: any) => t.pricePerUnit));
        } else {
          parentBestPrice = activeProduct.price || 0;
        }
      }
      
      const mathTiers = calculateSuggestedPrices(
        activeProduct.cost || 0,
        activeProduct.price || 0,
        currentTiers,
        opt.targetProfitMargin || 70,
        maxBasePrice,
        parentBestPrice
      );
      
      if (isEditing) {
        const opts = [...(editingProduct.packagingOptions || [])];
        opts[optIdx].wholesaleTiers = mathTiers;
        setEditingProduct({ ...editingProduct, packagingOptions: opts });
      } else {
        const opts = [...(newProduct.packagingOptions || [])];
        opts[optIdx].wholesaleTiers = mathTiers;
        setNewProduct({ ...newProduct, packagingOptions: opts });
      }
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const applyAiSuggestions = () => {
    if (aiSuggestions) {
      setNewProduct({ ...newProduct, price: aiSuggestions.suggestedPrice });
      setAiSuggestions(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    
    // Validación de stock vs escalas (Aviso, no bloqueo)
    const stock = Number(editingProduct.stock) || 0;
    let hasStockIssues = false;
    for (const opt of (editingProduct.packagingOptions || [])) {
      const unitsPerPack = Number(opt.quantity) || 1;
      for (const tier of (opt.wholesaleTiers || [])) {
        const totalUnits = (Number(tier.minPackages) || 1) * unitsPerPack;
        if (totalUnits > stock) {
          hasStockIssues = true;
          break;
        }
      }
    }

    if (hasStockIssues) {
      toast.warning('Aviso: Algunas escalas de mayoreo superan el stock actual. No se mostrarán a los clientes hasta que el stock sea suficiente.', { duration: 5000 });
    }

    setIsSaving(true);
    try {
      const updatedProductData = {
        name: (editingProduct.name || '').trim(),
        description: (editingProduct.description || '').trim(),
        price: Number(editingProduct.price) || 0,
        cost: Number(editingProduct.cost) || 0,
        currency: editingProduct.currency || 'CUP',
        category: editingProduct.category || 'General',
        stock: stock,
        active: editingProduct.active !== false,
        image: (editingProduct.image || '').trim(),
        expiryDate: editingProduct.expiryDate || '',
        storeId: editingProduct.storeId || storeId,
        wholesaleTiers: (editingProduct.wholesaleTiers || []).map(tier => ({
          id: tier.id || Math.random().toString(36).substring(2, 9),
          minPackages: Number(tier.minPackages) || 1,
          pricePerUnit: Number(tier.pricePerUnit) || 0
        })),
        packagingOptions: (editingProduct.packagingOptions || []).map(opt => ({
          id: opt.id || Math.random().toString(36).substring(2, 9),
          name: opt.name || 'Empaque',
          quantity: Number(opt.quantity) || 1,
          active: opt.active !== false,
          targetProfitMargin: Number(opt.targetProfitMargin) || 70,
          wholesaleTiers: (opt.wholesaleTiers || []).map(tier => ({
            id: tier.id || Math.random().toString(36).substring(2, 9),
            minPackages: Number(tier.minPackages) || 1,
            pricePerUnit: Number(tier.pricePerUnit) || 0
          })),
          ...(opt.parentPackId && opt.parentPackId !== 'none' ? { parentPackId: opt.parentPackId } : {})
        })),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'products', editingProduct.id), updatedProductData);
      setIsEditModalOpen(false);
      toast.success('Producto actualizado con éxito');
    } catch (e: any) {
      console.error('Error al guardar cambios del producto:', e);
      toast.error(`Error al guardar cambios: ${e?.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ... (rest of the component)

  useEffect(() => {
    if (!storeId) return;

    // Escuchamos productos de la tienda específica
    const qProducts = query(
      collection(db, 'products'), 
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setLoading(false);
    });

    // Escuchamos categorías de la tienda específica
    const qCats = query(
      collection(db, 'categories'), 
      where('storeId', '==', storeId),
      orderBy('name', 'asc')
    );
    const unsubscribeCats = onSnapshot(qCats, (snapshot) => {
      const catsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(catsData);

      if (catsData.length === 0 && !loading) {
        initializeDefaultCategories();
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCats();
    };
  }, [storeId, loading]);

  const initializeDefaultCategories = async () => {
    if (!storeId) return;
    const defaults = [
      { name: 'Alimentos', description: 'Productos básicos de alimentación como arroz, azúcar, aceite, pastas.' },
      { name: 'Lácteos', description: 'Leche, quesos, mantequillas, yogures y derivados lácteos.' },
      { name: 'Aseo', description: 'Productos de limpieza del hogar, detergentes y aseo personal.' },
      { name: 'Bebidas', description: 'Refrescos, jugos, aguas, maltas, cervezas y licores.' }
    ];

    for (const cat of defaults) {
      await addDoc(collection(db, 'categories'), {
        ...cat,
        storeId,
        createdAt: Date.now()
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || !storeId) return;
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          ...newCategory,
          updatedAt: serverTimestamp()
        });
        toast.success('Categoría actualizada');
      } else {
        await addDoc(collection(db, 'categories'), {
          ...newCategory,
          storeId,
          createdAt: serverTimestamp()
        });
        toast.success('Categoría creada');
      }
      setNewCategory({ name: '', description: '' });
      setEditingCategory(null);
      setIsCategoryModalOpen(false);
    } catch (error) {
      toast.error('Error al guardar categoría');
    }
  };

  // ... (keep delete/toggle functions)

  const handleAddProduct = async () => {
    if (isSaving) return;
    
    console.log("🚀 Iniciando handleAddProduct...");
    console.log("Configuración de tienda (storeId):", storeId);
    console.log("Datos del nuevo producto:", newProduct);

    if (!newProduct.name?.trim() || !storeId) {
      console.error("❌ Validación fallida: faltan datos críticos", { name: newProduct.name, storeId });
      toast.error('Faltan datos o tienda no identificada.');
      return;
    }

    setIsSaving(true);
    try {
      const stock = Number(newProduct.stock) || 0;
      let hasStockIssues = false;
      
      // Validación de escala vs stock (Aviso)
      for (const opt of (newProduct.packagingOptions || [])) {
        const unitsPerPack = Number(opt.quantity) || 1;
        for (const tier of (opt.wholesaleTiers || [])) {
          const totalUnits = (Number(tier.minPackages) || 1) * unitsPerPack;
          if (totalUnits > stock) {
            hasStockIssues = true;
            break;
          }
        }
      }

      if (hasStockIssues) {
        toast.warning('Aviso: El stock inicial es insuficiente para algunas escalas de mayoreo definidas.');
      }
      
      console.log("🛠️ Ejecutando transacción de Firestore...");
      await runTransaction(db, async (transaction) => {
        const productRef = doc(collection(db, 'products'));
        
        // Limpiamos los datos para asegurar que no viajen undefined y cumplir con reglas
        const productData = {
          name: (newProduct.name || 'Nuevo Producto').trim(),
          description: (newProduct.description || '').trim(),
          price: Number(newProduct.price) || 0,
          cost: Number(newProduct.cost) || 0,
          currency: newProduct.currency || 'CUP',
          category: newProduct.category || 'General',
          stock: stock,
          active: newProduct.active !== false,
          image: (newProduct.image || '').trim(),
          expiryDate: newProduct.expiryDate || '',
          storeId: storeId,
          wholesaleTiers: (newProduct.wholesaleTiers || []).map(tier => ({
            id: tier.id || Math.random().toString(36).substring(2, 9),
            minPackages: Number(tier.minPackages) || 1,
            pricePerUnit: Number(tier.pricePerUnit) || 0
          })),
          packagingOptions: (newProduct.packagingOptions || []).map(opt => ({
            id: opt.id || Math.random().toString(36).substring(2, 9),
            name: opt.name || 'Empaque',
            quantity: Number(opt.quantity) || 1,
            active: true,
            targetProfitMargin: Number(opt.targetProfitMargin) || 70,
            wholesaleTiers: (opt.wholesaleTiers || []).map(tier => ({
              id: tier.id || Math.random().toString(36).substring(2, 9),
              minPackages: Number(tier.minPackages) || 1,
              pricePerUnit: Number(tier.pricePerUnit) || 0
            })),
            ...(opt.parentPackId && opt.parentPackId !== 'none' ? { parentPackId: opt.parentPackId } : {})
          })),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        console.log("📝 Transaction: Escribiendo producto...", productData);
        transaction.set(productRef, productData);
        
        // Registro inicial de precio
        const historyRef = doc(collection(db, 'price_history'));
        const historyData = {
          productId: productRef.id,
          storeId: storeId,
          oldPrice: 0,
          newPrice: productData.price,
          oldCost: 0,
          newCost: productData.cost,
          currency: productData.currency,
          reason: 'Carga inicial',
          createdAt: serverTimestamp()
        };
        console.log("📝 Transaction: Escribiendo historial de precio...", historyData);
        transaction.set(historyRef, historyData);

        // Si hay stock inicial, registramos la entrada
        if (stock > 0) {
          const entryRef = doc(collection(db, 'inventory_entries'));
          const inventoryData = {
            productId: productRef.id,
            storeId: storeId,
            productName: productData.name,
            type: 'in',
            quantity: stock,
            multiplier: 1,
            totalUnits: stock,
            formatName: 'Unidad',
            notes: 'Carga inicial',
            createdAt: serverTimestamp(),
            currency: productData.currency,
            cost: productData.cost
          };
          console.log("📝 Transaction: Escribiendo inventario...", inventoryData);
          transaction.set(entryRef, inventoryData);
        }
      });

      console.log("✅ Transacción completada con éxito");
      toast.success(stock > 0 ? '¡Listo! Producto creado y stock cargado.' : '¡Vaya! Producto creado sin stock inicial.');
      
      // Cerramos el modal inmediatamente para evitar "pantalla en negro" por estados inconsistentes
      setIsAddModalOpen(false);
      
      // Reset de estados después de cerrar
      setTimeout(() => {
        setNewProduct({
          name: '',
          description: '',
          price: 0,
          cost: 0,
          currency: 'CUP',
          category: '',
          stock: 0,
          active: true,
          image: '',
          expiryDate: '',
          packagingOptions: []
        });
      }, 300);
    } catch (error: any) {
      console.error("❌ Error fatal al crear producto:", error);
      toast.error('No se pudo crear el producto. Revisa la consola o intenta de nuevo.');
      try {
        handleFirestoreError(error, OperationType.CREATE, 'products');
      } catch (e) {}
    } finally {
      setIsSaving(false);
    }
  };

  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'near-expiry' | 'expired'>('all');

  const stats = {
    totalProducts: products.length,
    totalValue: products.reduce((acc, p) => acc + ((Number(p.stock) || 0) * (Number(p.cost) || 0)), 0),
    lowStock: products.filter(p => (Number(p.stock) || 0) <= 10).length,
    vencidos: products.filter(p => {
      if (!p.expiryDate) return false;
      try {
        return new Date(p.expiryDate) < new Date();
      } catch(e) { return false; }
    }).length,
    nearExpiry: products.filter(p => {
      if (!p.expiryDate) return false;
      try {
        const diff = new Date(p.expiryDate).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days >= 0 && days <= 30;
      } catch(e) { return false; }
    }).length
  };

  const filteredProducts = products.filter(p => {
    const searchLower = (search || '').toLowerCase();
    const cat = categories.find(c => c.id === p.category || c.name === p.category);
    const catName = cat ? cat.name : (p.category || 'General');
    
    // Search filter
    const matchesSearch = (p.name || '').toLowerCase().includes(searchLower) || 
                          (catName || '').toLowerCase().includes(searchLower);
    
    if (!matchesSearch) return false;

    // Status filter
    const stock = Number(p.stock) || 0;
    if (filterType === 'low-stock') return stock <= 10;
    if (filterType === 'expired') {
      if (!p.expiryDate) return false;
      try { return new Date(p.expiryDate) < new Date(); } catch(e) { return false; }
    }
    if (filterType === 'near-expiry') {
      if (!p.expiryDate) return false;
      try {
        const diff = new Date(p.expiryDate).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days >= 0 && days <= 30;
      } catch(e) { return false; }
    }
    
    return true;
  });

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const analyzeInventoryWithAI = async () => {
    setIsAIAnalyzing(true);
    try {
      const inventoryData = products.map(p => ({
        name: p.name,
        stock: p.stock,
        expiry: p.expiryDate,
        price: p.price,
        cost: p.cost
      }));

      const response = await fetch('/api/gemini/inventory-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          inventory: inventoryData,
          storeId: storeId 
        })
      });
      
      const data = await response.json();
      setAiReport(data.analysis);
      toast.success('¡Análisis de la IA completado, asere!');
    } catch (error) {
      toast.error('La IA está de vacaciones, intenta luego.');
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="products" className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-sans">Catálogo</h2>
            <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl">
              <TabsTrigger value="products" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">Productos</TabsTrigger>
              <TabsTrigger value="categories" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">Categorías</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64 lg:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input 
                 placeholder="Busca por nombre o categoría..." 
                 className="pl-11 h-12 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans font-medium"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button className="w-full sm:w-auto font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200 rounded-2xl h-12 px-6 bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </Button>
          </div>
        </div>

        <TabsContent value="products" className="space-y-6 outline-none">
          
          {/* Dashboard de Inventario Limpio */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className={cn(
                "border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02]",
                filterType === 'all' ? "bg-indigo-600 text-white shadow-indigo-100 dark:shadow-indigo-900/40" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              )}
              onClick={() => setFilterType('all')}
            >
              <CardHeader className="pb-2">
                <CardDescription className={filterType === 'all' ? "text-indigo-100 px-0" : ""}>Total Variedades</CardDescription>
                <CardTitle className="text-3xl font-black">{stats.totalProducts}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-white/20 text-[10px] font-bold border-none uppercase text-inherit">Valor Estimado</Badge>
                  <span className="text-xs font-black">${stats.totalValue.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={cn(
                "border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02]",
                filterType === 'low-stock' ? "bg-amber-500 text-white shadow-amber-100 dark:shadow-amber-900/40" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              )}
              onClick={() => setFilterType('low-stock')}
            >
              <CardHeader className="pb-2">
                <CardDescription className={filterType === 'low-stock' ? "text-amber-50 px-0" : ""}>Bajo Stock (≤10)</CardDescription>
                <CardTitle className="text-3xl font-black">{stats.lowStock}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                   <AlertTriangle className={cn("h-4 w-4", filterType === 'low-stock' ? "text-white" : "text-amber-500")} />
                   <span className="text-xs font-bold uppercase tracking-tighter">Requiere pedido pronto</span>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={cn(
                "border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02]",
                filterType === 'near-expiry' ? "bg-orange-500 text-white shadow-orange-100 dark:shadow-orange-900/40" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              )}
              onClick={() => setFilterType('near-expiry')}
            >
              <CardHeader className="pb-2">
                <CardDescription className={filterType === 'near-expiry' ? "text-orange-50 px-0" : ""}>Por Vencer (30 días)</CardDescription>
                <CardTitle className="text-3xl font-black">{stats.nearExpiry}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                   <Calendar className={cn("h-4 w-4", filterType === 'near-expiry' ? "text-white" : "text-orange-500")} />
                   <span className="text-xs font-bold uppercase tracking-tighter">Evaluar ofertas relámpago</span>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={cn(
                "border-none shadow-sm cursor-pointer transition-all hover:scale-[1.02]",
                filterType === 'expired' ? "bg-rose-600 text-white shadow-rose-100 dark:shadow-rose-900/40" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              )}
              onClick={() => setFilterType('expired')}
            >
              <CardHeader className="pb-2">
                <CardDescription className={filterType === 'expired' ? "text-rose-50 px-0" : ""}>Vencidos / Merma</CardDescription>
                <CardTitle className="text-3xl font-black">{stats.vencidos}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                   <AlertTriangle className={cn("h-4 w-4", filterType === 'expired' ? "text-white" : "text-rose-600")} />
                   <span className="text-xs font-bold uppercase tracking-tighter">Pérdida en inventario</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border-2 rounded-[2rem] bg-white dark:bg-slate-950 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-950/40 border-slate-100 dark:border-slate-800">
            <div className="overflow-x-auto pretty-scrollbar-x w-full">
              {loading ? (
                <div className="p-20 flex justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                </div>
              ) : (
                <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent border-b-2 border-slate-100 dark:border-slate-800">
                <TableHead className="w-[100px] font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-widest p-6 whitespace-nowrap">Visual</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-widest whitespace-nowrap">Identidad del Producto</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-widest whitespace-nowrap">Categoría</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-widest whitespace-nowrap">Precio Venta</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-widest whitespace-nowrap">Stock Real</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-widest text-center whitespace-nowrap">Estado</TableHead>
                <TableHead className="text-right font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-widest p-6 whitespace-nowrap">Gestión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="group hover:bg-indigo-50/30 transition-all duration-300">
                  <TableCell className="p-6">
                    <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden border-2 border-slate-100 group-hover:border-indigo-400 group-hover:shadow-lg transition-all duration-500">
                      <img 
                        src={getProxyImageUrl(product.image) || `https://picsum.photos/seed/${product.id}/150/150`} 
                        alt={product.name}
                        className="h-full w-full object-cover transform scale-110 group-hover:scale-125 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-lg text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{product.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-tighter">ID: #{(product.id || '').substring(0, 8).toUpperCase()}</span>
                        {(() => {
                           const status = getExpiryStatus(product.expiryDate);
                           if (!status) return null;
                           const StatusIcon = status.icon;
                           return (
                            <Badge className={cn("text-white font-black border-none rounded-lg px-2 py-0.5 text-[8px] uppercase tracking-wider flex items-center gap-1", status.color)}>
                               <StatusIcon className="h-3 w-3" /> {status.label}
                            </Badge>
                           );
                        })()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 font-black uppercase text-[10px] tracking-widest px-3 py-1 shadow-sm">
                      {categories.find(c => c.id === product.category)?.name || product.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900">{product.price.toLocaleString()}</span>
                      <span className="text-[11px] font-black text-indigo-600 uppercase italic">{product.currency}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "inline-flex flex-col items-center justify-center min-w-[60px] p-2 rounded-2xl font-black transition-all shadow-inner",
                      product.stock <= 5 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    )}>
                      <span className="text-lg leading-none">{product.stock}</span>
                      <span className="text-[8px] uppercase mt-1 opacity-60">unidades</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={product.active ? "default" : "secondary"}
                      className={cn(
                        "cursor-pointer font-black uppercase text-[10px] tracking-[0.2em] px-4 py-1.5 rounded-full shadow-md transition-all active:scale-90",
                        product.active ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                      )}
                      onClick={() => toggleActive(product)}
                    >
                      {product.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right p-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all"
                        onClick={() => handleEditClick(product)}
                        title="Editar Producto"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-md transition-all" />
                        }>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl shadow-2xl border-slate-100 p-2 min-w-[200px]">
                          <DropdownMenuItem className="gap-3 rounded-xl font-black text-slate-700 py-3 text-xs uppercase tracking-widest" onClick={() => handleEditClick(product)}>
                            <Edit2 className="h-4 w-4 text-indigo-500" /> Gestionar Datos
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-50 my-1" />
                          <DropdownMenuItem className="gap-3 text-rose-600 rounded-xl font-black py-3 text-xs uppercase tracking-widest hover:bg-rose-50 focus:bg-rose-50" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4" /> Eliminar del Catálogo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
            </div>
          </div>
      </TabsContent>

      <TabsContent value="categories">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/30 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-center p-8 rounded-2xl" onClick={() => setIsCategoryModalOpen(true)}>
            <div className="text-center">
              <Plus className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-400">Crear Nueva Categoría</p>
            </div>
          </Card>

          {filteredCategories.map(cat => (
            <Card key={cat.id} className="border-slate-100 shadow-sm relative group rounded-2xl hover:border-primary/20 transition-all flex flex-col">
              <CardHeader className="pb-2 flex-grow">
                <CardTitle className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors">{cat.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-3 min-h-[48px] text-slate-500">{cat.description || 'Sin descripción.'}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-2 flex justify-end gap-2 border-t border-slate-50 mt-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg" onClick={() => handleEditCategory(cat)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => handleDeleteCategory(cat.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          {filteredCategories.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
              No se encontraron categorías que coincidan
            </div>
          )}
        </div>
      </TabsContent>
      </Tabs>

      {/* Modal para Crear Categoría */}
      <Dialog open={isCategoryModalOpen} onOpenChange={(open) => {
        setIsCategoryModalOpen(open);
        if (!open) {
          setNewCategory({ name: '', description: '' });
          setEditingCategory(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
            <DialogDescription>
              Define una categoría para organizar tus productos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name" className="font-bold">Nombre</Label>
              <Input 
                id="cat-name" 
                placeholder="Ej: Lácteos" 
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-desc" className="font-bold">Descripción</Label>
              <Textarea 
                id="cat-desc" 
                placeholder="¿Qué incluye esta categoría?" 
                value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleAddCategory} className="font-bold px-8 shadow-lg shadow-primary/20 rounded-xl">
              {editingCategory ? 'Actualizar' : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>
              Modifica la información básica, precios y opciones de venta.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b">
              <TabsList className="bg-transparent h-12 p-0 gap-8">
                <TabsTrigger 
                  value="general" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent shadow-none font-bold uppercase text-[10px] tracking-widest h-full"
                >
                  Información General
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent shadow-none font-bold uppercase text-[10px] tracking-widest h-full"
                >
                  Historial de Precios
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="general" className="m-0 outline-none">
                {editingProduct && (
                  <div className="grid gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name" className="font-bold">Nombre del Producto</Label>
                        <Input 
                          id="name" 
                          className="h-11"
                          value={editingProduct.name} 
                          onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category" className="font-bold">Categoría</Label>
                        <Select 
                          value={editingProduct.category || ""} 
                          onValueChange={(value) => setEditingProduct({...editingProduct, category: value})}
                        >
                          <SelectTrigger className="h-11 border-slate-200">
                            <SelectValue placeholder="Selecciona categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea 
                        id="description" 
                        value={editingProduct.description} 
                        onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cost">Costo Unidad</Label>
                        <Input 
                          id="cost" 
                          type="number"
                          value={editingProduct.cost || 0} 
                          onChange={(e) => setEditingProduct({...editingProduct, cost: Number(e.target.value)})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="price">Precio Venta Unid.</Label>
                        <Input 
                          id="price" 
                          type="number"
                          value={editingProduct.price} 
                          onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                        />
                      </div>
                      <div className="grid gap-2 col-span-2 sm:col-span-1">
                        <Label htmlFor="stock" className="text-slate-400">Stock Actual (Solo lectura)</Label>
                        <Input 
                          id="stock" 
                          type="number"
                          disabled
                          className="bg-slate-50 border-slate-100 text-slate-400"
                          value={editingProduct.stock} 
                        />
                        <p className="text-[10px] text-indigo-500 font-bold italic">Cambia el stock en la pestaña Inventario</p>
                      </div>
                      <div className="grid gap-2 col-span-2 sm:col-span-1">
                        <Label htmlFor="expiryDate" className="font-bold">Fecha de Vencimiento (Opcional)</Label>
                        <Input 
                          id="expiryDate" 
                          type="date"
                          className="h-11"
                          value={editingProduct.expiryDate || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, expiryDate: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="currency" className="font-bold">Moneda</Label>
                        <Select 
                          value={editingProduct.currency || 'CUP'} 
                          onValueChange={(value) => setEditingProduct({...editingProduct, currency: value as 'CUP' | 'MLC'})}
                        >
                          <SelectTrigger id="currency" className="h-11">
                            <SelectValue placeholder="Moneda" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CUP">CUP</SelectItem>
                            <SelectItem value="MLC">MLC</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="edit-image" className="font-bold">Imagen del Producto (Subida Física o URL)</Label>
                      <ImageFileUploader 
                        value={editingProduct.image || ""} 
                        onChange={(url) => setEditingProduct({...editingProduct, image: url})} 
                        placeholder="Arrastra la foto del producto o haz clic"
                      />
                      <Input 
                        id="edit-image" 
                        placeholder="O pega una URL de internet para actualizar de forma remota (opcional)"
                        value={editingProduct.image || ""} 
                        onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    {/* Wholesale Tiers for Units */}
                    <div className="space-y-4 border-2 border-dashed border-indigo-100 dark:border-indigo-900/30 p-6 rounded-[2rem] bg-indigo-50/20 dark:bg-indigo-950/10">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-5 w-5 text-indigo-600" />
                          <h4 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-400">Mayoreo por Unidades Individuales</h4>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 rounded-xl font-bold text-[10px] uppercase text-indigo-600 hover:bg-indigo-100"
                          onClick={() => {
                            const tiers = editingProduct.wholesaleTiers || [];
                            const lastMin = tiers.length > 0 ? tiers[tiers.length-1].minPackages : 1;
                            const lastPrice = tiers.length > 0 ? tiers[tiers.length-1].pricePerUnit : editingProduct.price;
                            
                            setEditingProduct({
                              ...editingProduct,
                              wholesaleTiers: [
                                ...tiers,
                                { 
                                  id: Math.random().toString(36).substr(2, 9), 
                                  minPackages: lastMin + 11, 
                                  pricePerUnit: Math.round(lastPrice * 0.9) 
                                }
                              ]
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Añadir Escala
                        </Button>
                      </div>

                      <div className="grid gap-3">
                        {(editingProduct.wholesaleTiers || []).length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic text-center py-4 bg-white/50 dark:bg-black/20 rounded-xl border border-dashed">
                            No hay escalas definidas para venta por unidades.
                          </p>
                        ) : (
                          (editingProduct.wholesaleTiers || []).map((tier, idx) => (
                            <div key={tier.id} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border shadow-sm">
                              <div className="col-span-5 flex items-center gap-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Desde</Label>
                                <Input 
                                  type="number" 
                                  className="h-10 text-xs font-black rounded-xl"
                                  value={tier.minPackages}
                                  onChange={(e) => {
                                    const tiers = [...(editingProduct.wholesaleTiers || [])];
                                    tiers[idx].minPackages = Number(e.target.value);
                                    setEditingProduct({...editingProduct, wholesaleTiers: tiers});
                                  }}
                                />
                                <span className="text-[10px] font-bold text-slate-500">unids.</span>
                              </div>
                              <div className="col-span-5 flex items-center gap-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Precio</Label>
                                <Input 
                                  type="number" 
                                  className="h-10 text-xs font-black rounded-xl"
                                  value={tier.pricePerUnit}
                                  onChange={(e) => {
                                    const tiers = [...(editingProduct.wholesaleTiers || [])];
                                    tiers[idx].pricePerUnit = Number(e.target.value);
                                    setEditingProduct({...editingProduct, wholesaleTiers: tiers});
                                  }}
                                />
                              </div>
                              <div className="col-span-2 flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                                  onClick={() => {
                                    const tiers = (editingProduct.wholesaleTiers || []).filter((_, i) => i !== idx);
                                    setEditingProduct({...editingProduct, wholesaleTiers: tiers});
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                        
                        {(editingProduct.wholesaleTiers || []).length > 0 && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              variant="outline" 
                              type="button"
                              className="flex-1 h-9 rounded-xl font-black uppercase text-[9px] border-indigo-200 text-indigo-600 bg-white"
                              onClick={() => {
                                const tiers = editingProduct.wholesaleTiers || [];
                                const cost = editingProduct.cost || 0;
                                const price = editingProduct.price;
                                const updatedTiers = calculateSuggestedPrices(cost, price, tiers, 85, price, 0);
                                setEditingProduct({...editingProduct, wholesaleTiers: updatedTiers});
                                toast.success('Escalas sugeridas');
                              }}
                            >
                                Sugerir Precios
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Configuración de Empaque</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="outline" size="sm" />
                          }>
                            <Plus className="h-4 w-4 mr-1" /> Usar Plantilla
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 rounded-xl font-bold max-h-[400px] overflow-y-auto">
                            <div className="px-2 py-1.5 text-[10px] text-slate-400 uppercase tracking-widest">Plantillas Estándar</div>
                            {PACKAGING_PRESETS.map((preset) => (
                              <DropdownMenuItem 
                                key={preset.name}
                                onClick={() => {
                                  const newPackaging = { 
                                    id: Math.random().toString(36).substr(2, 9), 
                                    name: preset.name, 
                                    quantity: preset.quantity, 
                                    active: true,
                                    targetProfitMargin: preset.targetProfitMargin,
                                    wholesaleTiers: [{ id: 't1', minPackages: 1, pricePerUnit: editingProduct.price }]
                                  };
                                  setEditingProduct({
                                    ...editingProduct,
                                    packagingOptions: [
                                      ...(editingProduct.packagingOptions || []),
                                      newPackaging
                                    ]
                                  });
                                }}
                              >
                                {preset.name} ({preset.quantity}u)
                              </DropdownMenuItem>
                            ))}
                            
                            {/* Buscar en otros productos */}
                            {products.some(p => p.packagingOptions && p.packagingOptions.length > 0) && (
                              <>
                                <div className="h-px bg-slate-100 my-1" />
                                <div className="px-2 py-1.5 text-[10px] text-slate-400 uppercase tracking-widest">De otros productos</div>
                                {Array.from(new Set(products
                                  .flatMap(p => p.packagingOptions || [])
                                  .map(opt => JSON.stringify({ name: opt.name, quantity: opt.quantity, margin: opt.targetProfitMargin }))))
                                  .slice(0, 10)
                                  .map((optStr: string) => {
                                    const opt = JSON.parse(optStr) as { name: string, quantity: number, margin: number };
                                    return (
                                      <DropdownMenuItem 
                                        key={`${opt.name}-${opt.quantity}`}
                                        onClick={() => {
                                          const newPackaging = { 
                                            id: Math.random().toString(36).substr(2, 9), 
                                            name: opt.name, 
                                            quantity: opt.quantity, 
                                            active: true,
                                            targetProfitMargin: opt.margin || 70,
                                            wholesaleTiers: [{ id: 't1', minPackages: 1, pricePerUnit: editingProduct.price }]
                                          };
                                          setEditingProduct({
                                            ...editingProduct,
                                            packagingOptions: [
                                              ...(editingProduct.packagingOptions || []),
                                              newPackaging
                                            ]
                                          });
                                        }}
                                      >
                                        {opt.name} ({opt.quantity}u)
                                      </DropdownMenuItem>
                                    );
                                  })
                                }
                              </>
                            )}

                            <div className="h-px bg-slate-100 my-1" />
                            <DropdownMenuItem 
                              onClick={() => {
                                const newPackaging = { 
                                  id: Math.random().toString(36).substr(2, 9), 
                                  name: 'Nuevo Formato', 
                                  quantity: 1, 
                                  active: true,
                                  targetProfitMargin: 70,
                                  wholesaleTiers: [{ id: 't1', minPackages: 1, pricePerUnit: editingProduct.price }]
                                };
                                setEditingProduct({
                                  ...editingProduct,
                                  packagingOptions: [
                                    ...(editingProduct.packagingOptions || []),
                                    newPackaging
                                  ]
                                });
                              }}
                            >
                              Personalizado...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-6">
                        {(editingProduct.packagingOptions || []).map((opt, optIdx) => (
                          <div key={opt.id} className="space-y-4 bg-slate-50 p-4 rounded-xl border">
                            <div className="grid grid-cols-12 gap-4 items-end">
                              <div className="col-span-5 grid gap-1.5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500">Nombre del Formato</Label>
                                <Input 
                                  value={opt.name} 
                                  onChange={(e) => {
                                    const options = [...(editingProduct.packagingOptions || [])];
                                    if (options[optIdx]) {
                                      options[optIdx].name = e.target.value;
                                      setEditingProduct({...editingProduct, packagingOptions: options});
                                    }
                                  }}
                                  placeholder="Ej: Caja, Saco, Display"
                                />
                              </div>
                              <div className="col-span-4 grid gap-1.5">
                                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Basado en (Herencia)</Label>
                                <Select 
                                  value={opt.parentPackId || 'none'} 
                                  onValueChange={(val) => {
                                    const options = [...(editingProduct.packagingOptions || [])];
                                    options[optIdx].parentPackId = val === 'none' ? undefined : val;
                                    setEditingProduct({...editingProduct, packagingOptions: options});
                                  }}
                                >
                                  <SelectTrigger className="h-10 text-[11px] font-black uppercase tracking-tight border-2">
                                    <SelectValue>
                                      {opt.parentPackId ? editingProduct.packagingOptions?.find(p => p.id === opt.parentPackId)?.name : 'Unidad Individual'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl border-2">
                                    <SelectItem value="none" className="font-bold text-[11px] uppercase tracking-widest">Unidad Individual</SelectItem>
                                    {editingProduct.packagingOptions?.filter(p => p.id !== opt.id).map(p => (
                                      <SelectItem key={p.id} value={p.id} className="font-bold text-[11px] uppercase tracking-widest">{p.name || 'Formato s/n'}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-3 grid gap-1.5">
                                <Label className="text-[10px] uppercase font-bold text-slate-500">
                                  {opt.parentPackId ? `Cant. por ${editingProduct.packagingOptions?.find(p => p.id === opt.parentPackId)?.name}` : 'Unid. por Formato'}
                                </Label>
                                <Input 
                                  type="number"
                                  value={opt.quantity} 
                                  onChange={(e) => {
                                     const options = [...(editingProduct.packagingOptions || [])];
                                     if (options[optIdx]) {
                                       options[optIdx].quantity = Number(e.target.value);
                                       setEditingProduct({...editingProduct, packagingOptions: options});
                                     }
                                  }}
                                />
                              </div>
                              <div className="col-span-12 flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive font-bold text-xs h-6"
                                  onClick={() => {
                                    const options = (editingProduct.packagingOptions || []).filter((_, i) => i !== optIdx);
                                    setEditingProduct({...editingProduct, packagingOptions: options});
                                  }}
                                >
                                  Eliminar Formato
                                </Button>
                              </div>
                              <div className="col-span-12 grid gap-1.5 bg-white p-3 rounded-lg border border-dashed">
                                <div className="flex justify-between items-center">
                                  <Label className="text-[10px] uppercase font-bold text-slate-500">
                                    Margen de Ganancia Conservado (Modelo 70/30)
                                  </Label>
                                  <span className="text-xs font-black text-primary">{(opt.targetProfitMargin || 70)}%</span>
                                </div>
                                <Input 
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={opt.targetProfitMargin || 70}
                                  onChange={(e) => {
                                    const options = [...(editingProduct.packagingOptions || [])];
                                    options[optIdx].targetProfitMargin = Number(e.target.value);
                                    setEditingProduct({...editingProduct, packagingOptions: options});
                                  }}
                                  className="h-4"
                                />
                                <p className="text-[9px] text-slate-400 italic">
                                  Define cuánto de la ganancia total (Escandallo) quieres proteger. 
                                  {(100 - (opt.targetProfitMargin || 70))}% restante se usará para descuentos en el mayoreo.
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                              <div className="flex flex-col gap-2">
                                <Label className="text-[10px] uppercase font-black text-indigo-600 dark:text-indigo-400 tracking-widest">Escalas de Mayoreo</Label>
                                <div className="grid grid-cols-1 gap-2">
                                  <Button 
                                    variant="outline" 
                                    type="button"
                                    size="sm" 
                                    className="h-10 w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-[1px] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-[0.98]"
                                    onClick={() => {
                                      const options = [...(editingProduct.packagingOptions || [])];
                                      const tiers = options[optIdx].wholesaleTiers || [];
                                      const lastMin = tiers.length > 0 ? tiers[tiers.length-1].minPackages : 0;
                                      const lastPrice = tiers.length > 0 ? tiers[tiers.length-1].pricePerUnit : editingProduct.price;
                                      
                                      options[optIdx].wholesaleTiers = [
                                        ...tiers,
                                        { 
                                          id: Math.random().toString(36).substr(2, 9), 
                                          minPackages: lastMin + 5, 
                                          pricePerUnit: lastPrice 
                                        }
                                      ];
                                      setEditingProduct({...editingProduct, packagingOptions: options});
                                    }}
                                  >
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Añadir Escala
                                  </Button>
                                </div>
                              </div>

                              <div className="grid gap-2">
                                {(opt.wholesaleTiers || []).map((tier, tierIdx) => (
                                  <div key={tier.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
                                    <div className="col-span-5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                      <Label className="text-[10px] text-slate-500 font-bold shrink-0">Desde</Label>
                                      <Input 
                                        type="number" 
                                        className="h-8 text-xs font-bold w-full"
                                        value={tier.minPackages}
                                        onChange={(e) => {
                                          const options = [...(editingProduct.packagingOptions || [])];
                                          if (options[optIdx] && options[optIdx].wholesaleTiers && options[optIdx].wholesaleTiers[tierIdx]) {
                                            options[optIdx].wholesaleTiers![tierIdx].minPackages = Number(e.target.value);
                                            setEditingProduct({...editingProduct, packagingOptions: options});
                                          }
                                        }}
                                      />
                                    </div>
                                    <div className="col-span-5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                      <Label className="text-[10px] text-slate-500 font-bold shrink-0">P. Unit</Label>
                                      <Input 
                                        type="number" 
                                        className="h-8 text-xs font-bold w-full"
                                        value={tier.pricePerUnit}
                                        onChange={(e) => {
                                          const options = [...(editingProduct.packagingOptions || [])];
                                          if (options[optIdx] && options[optIdx].wholesaleTiers && options[optIdx].wholesaleTiers[tierIdx]) {
                                            options[optIdx].wholesaleTiers![tierIdx].pricePerUnit = Number(e.target.value);
                                            setEditingProduct({...editingProduct, packagingOptions: options});
                                          }
                                        }}
                                      />
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => {
                                          const options = [...(editingProduct.packagingOptions || [])];
                                          options[optIdx].wholesaleTiers = options[optIdx].wholesaleTiers.filter((_, i) => i !== tierIdx);
                                          setEditingProduct({...editingProduct, packagingOptions: options});
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="col-span-12 px-2 pb-1 border-t border-slate-50 mt-1 pt-1">
                                      <p className="text-[9px] font-bold text-indigo-600 italic">
                                        Precio del {opt.name}: <span className="text-slate-900">${(tier.pricePerUnit * getUnits(opt, editingProduct.packagingOptions || [])).toLocaleString()} {editingProduct.currency}</span>
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {opt.wholesaleTiers.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  <Button 
                                    className="w-full h-8 text-[10px] uppercase font-black bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200"
                                    variant="outline"
                                    onClick={() => {
                                      const options = [...(editingProduct.packagingOptions || [])];
                                      const opt = options[optIdx];
                                      const margin = opt.targetProfitMargin || 70;
                                      
                                      // Usamos las escalas definidas si existen, sino volvemos a una base de 3
                                      const currentTiers = opt.wholesaleTiers && opt.wholesaleTiers.length > 0 ? opt.wholesaleTiers : [
                                        { id: Math.random().toString(36).substring(2,9), minPackages: 1, pricePerUnit: 0 },
                                        { id: Math.random().toString(36).substring(2,9), minPackages: 5, pricePerUnit: 0 },
                                        { id: Math.random().toString(36).substring(2,9), minPackages: 10, pricePerUnit: 0 },
                                      ];
                                      


                                      const currentUnits = getUnits(opt, options);
                                      const smallerFormats = options.filter(o => o.id !== opt.id && getUnits(o, options) < currentUnits);
                                      
                                      let maxBasePrice = editingProduct.price;
                                      if (smallerFormats.length > 0) {
                                          const prices = smallerFormats.flatMap(f => (f.wholesaleTiers || []).map((t: any) => t.pricePerUnit));
                                          if (prices.length > 0) {
                                              maxBasePrice = Math.min(...prices, editingProduct.price);
                                          }
                                      }

                                      // Obtener mejor precio del padre para herencia
                                      let parentBestPrice = 0;
                                      if (opt.parentPackId && opt.parentPackId !== 'none') {
                                          const parent = options.find(o => o.id === opt.parentPackId);
                                          if (parent && parent.wholesaleTiers && parent.wholesaleTiers.length > 0) {
                                              parentBestPrice = Math.min(...parent.wholesaleTiers.map((t: any) => t.pricePerUnit));
                                          } else if (parent) {
                                              // Si no tiene tiers, usamos su precio base
                                              parentBestPrice = editingProduct.price;
                                          }
                                      } else {
                                          // Si no tiene empaque padre, su padre es la Unidad Individual
                                          if (editingProduct.wholesaleTiers && editingProduct.wholesaleTiers.length > 0) {
                                              parentBestPrice = Math.min(...editingProduct.wholesaleTiers.map((t: any) => t.pricePerUnit));
                                          } else {
                                              parentBestPrice = editingProduct.price;
                                          }
                                      }

                                      const updatedTiers = calculateSuggestedPrices(editingProduct.cost || 0, editingProduct.price, currentTiers, margin, maxBasePrice, parentBestPrice);
                                      options[optIdx].wholesaleTiers = updatedTiers;
                                      setEditingProduct({...editingProduct, packagingOptions: options});
                                      toast.success('Escala de precios regenerada para ' + opt.wholesaleTiers.length + ' niveles');
                                    }}
                                  >
                                    <TrendingDown className="mr-2 h-3 w-3" /> Regenerar Cálculo
                                  </Button>
                                  <Button 
                                    className="w-full h-8 text-[10px] uppercase font-black bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => suggestPricesWithAI(optIdx)}
                                    disabled={isAiSuggesting}
                                  >
                                    {isAiSuggesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 rotate-45 mr-1" />}
                                    Analizar con IA
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {(editingProduct.packagingOptions || []).length === 0 && (
                          <p className="text-xs text-center text-muted-foreground py-2 italic bg-slate-50 rounded-lg border border-dashed">
                            Sin configuración de empaque. Venta solo por unidades individuales.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 border-t pt-4">
                      <Checkbox 
                        id="active" 
                        checked={editingProduct.active}
                        onCheckedChange={(checked) => setEditingProduct({...editingProduct, active: checked as boolean})}
                      />
                      <Label htmlFor="active" className="cursor-pointer font-medium">Producto activo (visible en catálogo)</Label>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="m-0 outline-none">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Consultando el historial...</p>
                  </div>
                ) : priceHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed">
                    <History className="h-12 w-12 text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400 italic">No hay cambios de precio registrados todavía.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {priceHistory.map((h, idx) => {
                      const priceDiff = h.newPrice - h.oldPrice;
                      const costDiff = h.newCost - h.oldCost;
                      const date = h.createdAt?.toDate ? h.createdAt.toDate() : new Date();

                      return (
                        <div key={h.id} className="relative pl-8 pb-4 last:pb-0 group">
                          {/* Timeline Line */}
                          {idx !== priceHistory.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-100 group-hover:bg-indigo-100 transition-colors" />
                          )}
                          {/* Dot */}
                          <div className={cn(
                            "absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10",
                            priceDiff > 0 ? "bg-rose-500" : priceDiff < 0 ? "bg-emerald-500" : "bg-slate-300"
                          )}>
                            {priceDiff > 0 ? <TrendingUp className="h-3 w-3 text-white" /> : 
                             priceDiff < 0 ? <TrendingDown className="h-3 w-3 text-white" /> : 
                             <Minus className="h-3 w-3 text-white" />}
                          </div>

                          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {format(date, 'dd/MM/yyyy • HH:mm')}
                              </span>
                              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-100 italic bg-slate-50">
                                {h.reason || 'Actualización'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Precio Venta</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 line-through">${h.oldPrice.toLocaleString()}</span>
                                  <div className="h-3 w-px bg-slate-100" />
                                  <span className="text-sm font-black text-slate-900">${h.newPrice.toLocaleString()} {h.currency}</span>
                                  {priceDiff !== 0 && (
                                    <span className={cn(
                                      "text-[10px] font-black",
                                      priceDiff > 0 ? "text-rose-500" : "text-emerald-500"
                                    )}>
                                      ({priceDiff > 0 ? '+' : ''}{priceDiff.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Costo Unidad</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 line-through">${h.oldCost.toLocaleString()}</span>
                                  <div className="h-3 w-px bg-slate-100" />
                                  <span className="text-sm font-black text-slate-900">${h.newCost.toLocaleString()} {h.currency}</span>
                                  {costDiff !== 0 && (
                                    <span className={cn(
                                      "text-[10px] font-black",
                                      costDiff > 0 ? "text-rose-500" : "text-emerald-500"
                                    )}>
                                      ({costDiff > 0 ? '+' : ''}{costDiff.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>

            <DialogFooter className="p-6 pt-0">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={isSaving} className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
            <DialogDescription>
              Registra un producto y su stock inicial. Esto creará un movimiento de entrada automáticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="add-name" className="font-bold">Nombre del Producto</Label>
                <Input 
                  id="add-name" 
                  className="h-11"
                  placeholder="Ej: Aceite de Girasol 1L"
                  value={newProduct.name} 
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-category" className="font-bold">Categoría</Label>
                        <Select 
                          value={newProduct.category} 
                          onValueChange={(value) => setNewProduct({...newProduct, category: value})}
                        >
                          <SelectTrigger className="h-11 border-slate-200">
                            <SelectValue placeholder="Selecciona categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="add-description">Descripción</Label>
              <Textarea 
                id="add-description" 
                placeholder="Detalles del producto..."
                value={newProduct.description} 
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-cost">Costo</Label>
                <Input 
                  id="add-cost" 
                  type="number"
                  value={newProduct.cost || 0} 
                  onChange={(e) => {
                    const cost = Number(e.target.value);
                    setNewProduct({...newProduct, cost, price: Number((cost * 1.3).toFixed(0))});
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-price">Venta</Label>
                <Input 
                  id="add-price" 
                  type="number"
                  value={newProduct.price} 
                  onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-stock">Stock</Label>
                <Input 
                  id="add-stock" 
                  type="number"
                  value={newProduct.stock} 
                  onChange={(e) => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-currency">Moneda</Label>
                <Select 
                  value={newProduct.currency} 
                  onValueChange={(value) => setNewProduct({...newProduct, currency: value as 'CUP' | 'MLC'})}
                >
                  <SelectTrigger id="add-currency">
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUP">CUP</SelectItem>
                    <SelectItem value="MLC">MLC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 col-span-2 sm:col-span-1">
                <Label htmlFor="add-expiry" className="font-bold">Fecha de Vencimiento</Label>
                <Input 
                  id="add-expiry" 
                  type="date"
                  className="h-11"
                  value={newProduct.expiryDate || ''} 
                  onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                />
              </div>
            </div>

            {/* Wholesale Tiers for Units in New Product */}
            <div className="space-y-4 border-2 border-dashed border-indigo-100 dark:border-indigo-900/30 p-6 rounded-[2rem] bg-indigo-50/20 dark:bg-indigo-950/10">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-400">Mayoreo por Unidades Individuales</h4>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  type="button"
                  className="h-8 rounded-xl font-bold text-[10px] uppercase text-indigo-600 hover:bg-indigo-100"
                  onClick={() => {
                    const tiers = newProduct.wholesaleTiers || [];
                    const lastMin = tiers.length > 0 ? tiers[tiers.length-1].minPackages : 1;
                    const lastPrice = tiers.length > 0 ? tiers[tiers.length-1].pricePerUnit : (newProduct.price || 0);
                    
                    setNewProduct({
                      ...newProduct,
                      wholesaleTiers: [
                        ...tiers,
                        { 
                          id: Math.random().toString(36).substr(2, 9), 
                          minPackages: lastMin + 11, 
                          pricePerUnit: Math.round(lastPrice * 0.9) 
                        }
                      ]
                    });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Añadir Escala
                </Button>
              </div>

              <div className="grid gap-3">
                {(newProduct.wholesaleTiers || []).length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-4 bg-white/50 dark:bg-black/20 rounded-xl border border-dashed">
                    No hay escalas definidas para venta por unidades.
                  </p>
                ) : (
                  (newProduct.wholesaleTiers || []).map((tier, idx) => (
                    <div key={tier.id} className="grid grid-cols-12 gap-3 items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border shadow-sm">
                      <div className="col-span-5 flex items-center gap-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Desde</Label>
                        <Input 
                          type="number" 
                          className="h-10 text-xs font-black rounded-xl"
                          value={tier.minPackages}
                          onChange={(e) => {
                            const tiers = [...(newProduct.wholesaleTiers || [])];
                            tiers[idx].minPackages = Number(e.target.value);
                            setNewProduct({...newProduct, wholesaleTiers: tiers});
                          }}
                        />
                        <span className="text-[10px] font-bold text-slate-500">unids.</span>
                      </div>
                      <div className="col-span-5 flex items-center gap-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Precio</Label>
                        <Input 
                          type="number" 
                          className="h-10 text-xs font-black rounded-xl"
                          value={tier.pricePerUnit}
                          onChange={(e) => {
                            const tiers = [...(newProduct.wholesaleTiers || [])];
                            tiers[idx].pricePerUnit = Number(e.target.value);
                            setNewProduct({...newProduct, wholesaleTiers: tiers});
                          }}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          type="button"
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                          onClick={() => {
                            const tiers = (newProduct.wholesaleTiers || []).filter((_, i) => i !== idx);
                            setNewProduct({...newProduct, wholesaleTiers: tiers});
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                

              </div>
            </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Configuración de Empaque</h4>
                  
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl font-bold uppercase text-[9px] tracking-widest h-10 px-4"
                        />
                      }>
                        <Plus className="h-4 w-4 mr-1" /> Usar Plantilla
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 rounded-xl font-bold max-h-[400px] overflow-y-auto">
                        <div className="px-2 py-1.5 text-[10px] text-slate-400 uppercase tracking-widest">Plantillas Estándar</div>
                        {PACKAGING_PRESETS.map((preset) => (
                          <DropdownMenuItem 
                            key={preset.name}
                            onClick={() => {
                              const options = [...(newProduct.packagingOptions || [])];
                              options.push({ 
                                id: Math.random().toString(36).substring(2, 9), 
                                name: preset.name, 
                                quantity: preset.quantity, 
                                active: true,
                                targetProfitMargin: preset.targetProfitMargin,
                                wholesaleTiers: [{ id: Math.random().toString(36).substring(2, 9), minPackages: 1, pricePerUnit: newProduct.price || 0 }]
                              });
                              setNewProduct({ ...newProduct, packagingOptions: options });
                              toast.success(`Añadido: ${preset.name}`);
                            }}
                          >
                            <Plus className="mr-2 h-3 w-3" /> {preset.name} ({preset.quantity} uds)
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const options = [...(newProduct.packagingOptions || [])];
                        options.push({
                          id: Math.random().toString(36).substring(2, 9),
                          name: '',
                          quantity: 1,
                          active: true,
                          wholesaleTiers: [{ id: Math.random().toString(36).substring(2, 9), minPackages: 1, pricePerUnit: newProduct.price || 0 }]
                        });
                        setNewProduct({ ...newProduct, packagingOptions: options });
                      }}
                      className="rounded-xl font-bold uppercase text-[9px] tracking-widest h-10 px-4 border-2 border-dashed border-slate-200"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Formato Libre
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {(newProduct.packagingOptions || []).map((opt, optIdx) => (
                  <div key={opt.id} className="space-y-4 bg-slate-50 p-4 rounded-xl border">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-5 grid gap-1.5">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Nombre del Formato</Label>
                        <Input 
                          value={opt.name} 
                          className="font-bold h-10 rounded-xl border-2"
                          onChange={(e) => {
                            const options = [...(newProduct.packagingOptions || [])];
                            if (options[optIdx]) {
                              options[optIdx].name = e.target.value;
                              setNewProduct({...newProduct, packagingOptions: options});
                            }
                          }}
                          placeholder="Ej: Caja, Bolsa"
                        />
                      </div>
                      <div className="col-span-4 grid gap-1.5">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Basado en (Herencia)</Label>
                        <Select 
                          value={opt.parentPackId || 'none'} 
                          onValueChange={(val) => {
                            const options = [...(newProduct.packagingOptions || [])];
                            if (options[optIdx]) {
                              options[optIdx].parentPackId = val === 'none' ? undefined : val;
                              setNewProduct({...newProduct, packagingOptions: options});
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 text-[11px] font-black uppercase tracking-tight border-2">
                            <SelectValue>
                              {opt.parentPackId ? newProduct.packagingOptions?.find(p => p.id === opt.parentPackId)?.name : 'Unidad Individual'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-2">
                            <SelectItem value="none" className="font-bold text-[11px] uppercase tracking-widest">Unidad Individual</SelectItem>
                            {newProduct.packagingOptions?.filter(p => p.id !== opt.id).map(p => (
                              <SelectItem key={p.id} value={p.id} className="font-bold text-[11px] uppercase tracking-widest">{p.name || 'Formato s/n'}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 grid gap-1.5">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Unid. por Formato</Label>
                        <Input 
                          type="number"
                          className="font-bold h-10 rounded-xl border-2"
                          value={opt.quantity} 
                          onChange={(e) => {
                            const options = [...(newProduct.packagingOptions || [])];
                            if (options[optIdx]) {
                              options[optIdx].quantity = Number(e.target.value);
                              setNewProduct({...newProduct, packagingOptions: options});
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-4 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive font-bold text-xs"
                          onClick={() => {
                            const options = [...(newProduct.packagingOptions || [])];
                            options.splice(optIdx, 1);
                            setNewProduct({...newProduct, packagingOptions: options});
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                      <div className="col-span-12 grid gap-1.5 bg-white p-3 rounded-lg border border-dashed">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">
                            Margen de Ganancia Conservado (Modelo Variable)
                          </Label>
                          <span className="text-xs font-black text-primary">{(opt.targetProfitMargin || 70)}%</span>
                        </div>
                        <Input 
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={opt.targetProfitMargin || 70}
                          onChange={(e) => {
                            const options = [...(newProduct.packagingOptions || [])];
                            options[optIdx].targetProfitMargin = Number(e.target.value);
                            setNewProduct({...newProduct, packagingOptions: options});
                          }}
                          className="h-4"
                        />
                        <p className="text-[9px] text-slate-400 italic">
                          {(opt.targetProfitMargin || 70)}% del escandallo se protege como ganancia. El resto faculta los descuentos.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <div className="flex flex-col gap-2">
                        <Label className="text-[10px] uppercase font-black text-indigo-600 dark:text-indigo-400 tracking-widest">Escalas de Mayoreo</Label>
                        <div className="grid grid-cols-1 gap-2">
                          <Button 
                            variant="outline" 
                            type="button"
                            size="sm" 
                            className="h-10 w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-[1px] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-[0.98]"
                            onClick={() => {
                              const options = [...(newProduct.packagingOptions || [])];
                              const tiers = options[optIdx].wholesaleTiers || [];
                              const lastMin = tiers.length > 0 ? tiers[tiers.length-1].minPackages : 0;
                              const lastPrice = tiers.length > 0 ? tiers[tiers.length-1].pricePerUnit : (newProduct.price || 0);
                              
                              options[optIdx].wholesaleTiers = [
                                ...tiers,
                                { 
                                  id: Math.random().toString(36).substr(2, 9), 
                                  minPackages: lastMin + 5, 
                                  pricePerUnit: lastPrice 
                                }
                              ];
                              setNewProduct({...newProduct, packagingOptions: options});
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" /> Añadir Escala
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        {(opt.wholesaleTiers || []).map((tier, tierIdx) => (
                          <div key={tier.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
                            <div className="col-span-12 sm:col-span-5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <Label className="text-[10px] sm:whitespace-nowrap font-black uppercase text-slate-400 tracking-widest leading-none">Mínimo</Label>
                              <Input 
                                type="number" 
                                className="h-10 text-[12px] font-black rounded-xl border-2 bg-white w-full"
                                value={tier.minPackages}
                                onChange={(e) => {
                                  const options = [...(newProduct.packagingOptions || [])];
                                  if (options[optIdx] && options[optIdx].wholesaleTiers[tierIdx]) {
                                    options[optIdx].wholesaleTiers[tierIdx].minPackages = Number(e.target.value);
                                    setNewProduct({...newProduct, packagingOptions: options});
                                  }
                                }}
                              />
                            </div>
                            <div className="col-span-12 sm:col-span-5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <Label className="text-[10px] sm:whitespace-nowrap font-black uppercase text-slate-400 tracking-widest leading-none">P. Unit</Label>
                              <Input 
                                type="number" 
                                className="h-10 text-[12px] font-black rounded-xl border-2 bg-white w-full"
                                value={tier.pricePerUnit}
                                onChange={(e) => {
                                  const options = [...(newProduct.packagingOptions || [])];
                                  if (options[optIdx] && options[optIdx].wholesaleTiers[tierIdx]) {
                                    options[optIdx].wholesaleTiers[tierIdx].pricePerUnit = Number(e.target.value);
                                    setNewProduct({...newProduct, packagingOptions: options});
                                  }
                                }}
                              />
                            </div>
                            <div className="col-span-12 sm:col-span-2 flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  const options = [...(newProduct.packagingOptions || [])];
                                  options[optIdx].wholesaleTiers = options[optIdx].wholesaleTiers.filter((_, i) => i !== tierIdx);
                                  setNewProduct({...newProduct, packagingOptions: options});
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="col-span-12 px-2 pb-1 border-t border-slate-50 mt-1 pt-1">
                              <p className="text-[9px] font-bold text-indigo-600 italic">
                                Precio del {opt.name}: <span className="text-slate-900">${(tier.pricePerUnit * getUnits(opt, newProduct.packagingOptions || [])).toLocaleString()} {newProduct.currency || 'CUP'}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {opt.wholesaleTiers.length > 0 && (
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 h-9 text-[10px] uppercase font-black bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200"
                            variant="outline"
                            onClick={() => {
                              const options = [...(newProduct.packagingOptions || [])];
                              const margin = options[optIdx].targetProfitMargin || 70;
                              
                              // Usamos las escalas definidas si existen, sino base de 3
                              const currentTiers = options[optIdx].wholesaleTiers && options[optIdx].wholesaleTiers.length > 0 
                                ? options[optIdx].wholesaleTiers 
                                : [
                                    { id: Math.random().toString(36).substring(2,9), minPackages: 1, pricePerUnit: 0 },
                                    { id: Math.random().toString(36).substring(2,9), minPackages: 5, pricePerUnit: 0 },
                                    { id: Math.random().toString(36).substring(2,9), minPackages: 15, pricePerUnit: 0 },
                                  ];

                              const currentUnits = getUnits(options[optIdx], options);
                              const smallerFormats = options.filter(o => o.id !== options[optIdx].id && getUnits(o, options) < currentUnits);
                              
                              let maxBasePrice = newProduct.price || 0;
                              if (smallerFormats.length > 0) {
                                const prices = smallerFormats.flatMap(f => (f.wholesaleTiers || []).map((t: any) => t.pricePerUnit));
                                if (prices.length > 0) {
                                  maxBasePrice = Math.min(...prices, newProduct.price || 0);
                                }
                              }

                              // Obtener mejor precio del padre para herencia
                              let parentBestPrice = 0;
                              if (options[optIdx].parentPackId && options[optIdx].parentPackId !== 'none') {
                                  const parent = options.find(o => o.id === options[optIdx].parentPackId);
                                  if (parent && parent.wholesaleTiers && parent.wholesaleTiers.length > 0) {
                                      parentBestPrice = Math.min(...parent.wholesaleTiers.map((t: any) => t.pricePerUnit));
                                  } else if (parent) {
                                      parentBestPrice = newProduct.price || 0;
                                  }
                              } else {
                                  // Si no tiene empaque padre, su padre es la Unidad Individual
                                  if (newProduct.wholesaleTiers && newProduct.wholesaleTiers.length > 0) {
                                      parentBestPrice = Math.min(...newProduct.wholesaleTiers.map((t: any) => t.pricePerUnit));
                                  } else {
                                      parentBestPrice = newProduct.price || 0;
                                  }
                              }

                              const updatedTiers = calculateSuggestedPrices(newProduct.cost || 0, newProduct.price || 0, currentTiers, margin, maxBasePrice, parentBestPrice);
                              options[optIdx].wholesaleTiers = updatedTiers;
                              setNewProduct({...newProduct, packagingOptions: options});
                              toast.success('Escalas de mayoreo calculadas para ' + options[optIdx].wholesaleTiers.length + ' niveles');
                            }}
                          >
                            <TrendingDown className="mr-2 h-4 w-4" /> Regenerar Cálculo
                          </Button>
                          <Button 
                            className="flex-1 h-9 text-[10px] uppercase font-black bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => suggestPricesWithAI(optIdx)}
                            disabled={isAiSuggesting}
                          >
                            {isAiSuggesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 rotate-45 mr-1" />}
                            Refinar con IA
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(newProduct.packagingOptions || []).length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-2 italic bg-slate-50 rounded-lg border border-dashed">
                    Sin configuración de empaque.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-image" className="font-bold">Imagen del Producto (Subida Física o URL)</Label>
                <ImageFileUploader 
                  value={newProduct.image || ""} 
                  onChange={(url) => setNewProduct({...newProduct, image: url})} 
                  placeholder="Arrastra la foto del producto o haz clic"
                />
                <Input 
                  id="add-image" 
                  placeholder="O pega una URL de internet para actualizar de forma remota (opcional)"
                  value={newProduct.image} 
                  onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                  className="mt-1 h-9 text-xs"
                />
              </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddProduct} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Crear Producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Botón Flotante IA Asistente */}
      <div className="fixed bottom-10 right-10 z-[100]">
        <Button 
          onClick={analyzeInventoryWithAI}
          disabled={isAIAnalyzing}
          className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 shadow-[0_0_50px_rgba(79,70,229,0.4)] border-4 border-white group hover:scale-110 active:scale-95 transition-all p-0 flex items-center justify-center overflow-hidden hover:shadow-indigo-500/50"
        >
          {isAIAnalyzing ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="text-[10px] font-black text-white mt-1 uppercase tracking-tighter">Pensando...</span>
            </div>
          ) : (
            <div className="relative flex flex-col items-center">
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
              </div>
              <Plus className="h-8 w-8 text-white rotate-45 mb-0.5" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">IA Socio</span>
            </div>
          )}
        </Button>
      </div>

      {aiReport && (
        <Dialog open={!!aiReport} onOpenChange={() => setAiReport(null)}>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] rounded-[3rem] bg-indigo-50 border-none p-0 overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-indigo-600 p-8 text-white shrink-0">
              <DialogHeader>
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-white rotate-45" />
                </div>
                <DialogTitle className="text-3xl font-black tracking-tight leading-none italic uppercase">
                  Consejos de tu Socio IA
                </DialogTitle>
                <DialogDescription className="text-indigo-100 font-bold mt-2">
                  He analizado tu inventario a fondo. Mira lo que encontré:
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              <div className="bg-white p-6 rounded-[2rem] border-2 border-indigo-100 shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                <p className="text-slate-700 leading-relaxed font-bold whitespace-pre-wrap text-sm">{aiReport}</p>
              </div>
              <DialogFooter className="mt-6">
                <Button onClick={() => setAiReport(null)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] h-14 shadow-xl shadow-indigo-100 transition-all active:scale-95">
                  ¡Oído cocina, asere!
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de Revisión de Sugerencias AI */}
      <Dialog open={!!aiSuggestions} onOpenChange={() => setAiSuggestions(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] rounded-[2.5rem] bg-indigo-50 border-none p-0 flex flex-col overflow-hidden shadow-2xl">
          <div className="bg-indigo-600 p-6 text-white flex items-center gap-4 shrink-0">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="h-6 w-6 text-white rotate-45" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight italic">Estrategia Mayorista IA</DialogTitle>
              <DialogDescription className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-1">
                Precios calculados para maximizar rotación y margen
              </DialogDescription>
            </div>
          </div>
          
          <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            <div className="space-y-3">
              {aiSuggestions?.map((s, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[9px] uppercase">Escala {i + 1}</Badge>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde {s.minPackages} unid.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Sugerido</span>
                      <Input 
                        type="number"
                        value={s.pricePerUnit}
                        onChange={(e) => {
                          const updated = [...aiSuggestions];
                          updated[i].pricePerUnit = Number(e.target.value);
                          setAiSuggestions(updated);
                        }}
                        className="h-10 text-lg font-black text-indigo-600 border-indigo-100 focus:ring-indigo-500 w-28 md:w-32"
                      />
                    </div>
                    <div className="bg-indigo-50/50 p-2 rounded-xl flex-1">
                      <p className="text-[10px] font-bold text-indigo-600 leading-tight italic">
                        "{s.reasoning}"
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 pt-0 shrink-0">
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setAiSuggestions(null)}
                className="flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                Descartar
              </Button>
              <Button 
                onClick={applyAiSuggestions}
                className="flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 text-white"
              >
                Aplicar Precios Sugeridos
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Volume Discount Calculator with Protected Margin */}
      {isCalculatorOpen && calculatorProductContext && (
        <VolumeDiscountCalculator
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          productContext={calculatorProductContext}
          onApplyTiers={handleApplyCalculatedTiers}
        />
      )}
    </div>
  );
}
