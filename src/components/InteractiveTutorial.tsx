import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, BookOpen, ShoppingCart, User, Store, ArrowRight, ArrowLeft, 
  Check, CheckCircle2, Percent, Sparkles, Phone, Package, Info,
  DollarSign, TrendingUp, HelpCircle, Laptop, Settings, Compass, Share2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InteractiveTutorial({ isOpen, onClose }: InteractiveTutorialProps) {
  const [selectedRole, setSelectedRole] = useState<'client' | 'admin'>('client');
  const [clientStep, setClientStep] = useState(0);
  const [adminStep, setAdminStep] = useState(0);

  // Client Simulation State
  const [simQuantity, setSimQuantity] = useState(1);
  const [simCart, setSimCart] = useState<any[]>([]);
  const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);

  // Admin Simulation State
  const [simProdName, setSimProdName] = useState('Caja de Cerveza Cristal x24');
  const [simProdPrice, setSimProdPrice] = useState(25);
  const [simMinWholesale, setSimMinWholesale] = useState(5);
  const [simWholesalePrice, setSimWholesalePrice] = useState(21);
  const [simCommission, setSimCommission] = useState(5);
  const [simSalesCount, setSimSalesCount] = useState(0);
  const [simTotalRevenue, setSimTotalRevenue] = useState(0);

  // Reset simulation states when role or open changes
  useEffect(() => {
    if (isOpen) {
      setClientStep(0);
      setAdminStep(0);
      setSimQuantity(1);
      setSimCart([]);
      setIsOrderSubmitted(false);
      setSimProdName('Caja de Cerveza Cristal x24');
      setSimProdPrice(25);
      setSimMinWholesale(5);
      setSimWholesalePrice(21);
      setSimSalesCount(0);
      setSimTotalRevenue(0);
    }
  }, [isOpen, selectedRole]);

  // Client step content
  const clientSteps = [
    {
      title: "Explora la Gran Plaza",
      desc: "Navega entre decenas de tiendas locales de tu provincia en Cuba. Utiliza el buscador para localizar frutas, cárnicos, cervezas o combos elaborados de forma directa y sin filtros ocultos.",
      icon: Compass,
      tip: "¡Oye asere, puedes filtrar por tu provincia y municipio para ahorrar en los envíos!"
    },
    {
      title: "Consigue el Precio de Mayorista (Wholesale)",
      desc: "Nuestros comerciantes configuran escalas automáticas. Compra por unidades para tu consumo del día, o aumenta la cantidad a cajas, sacos o bultos para que se active automáticamente el descuento por volumen.",
      icon: Percent,
      tip: "Muestra la ficha del producto y verás las tablas de descuento exactas."
    },
    {
      title: "Combina Empaques en el Carrito",
      desc: "Sube tu pedido al carrito. Verás un cálculo exacto de cuánto estás comprando, en qué empaque lo pediste y, si alcanzaste una cantidad mayorista, el ahorro se desglosará de inmediato.",
      icon: ShoppingCart,
      tip: "¡El carrito de PaTí te dice en tiempo real cuánto te estás ahorrando!"
    },
    {
      title: "Sistema de Fidelidad y WhatsApp",
      desc: "Al confirmar tu compra, se calcula tu acumulado. Escalas automáticamente en categorías (Bronce, Plata, Oro, VIP) que los administradores configuran globalmente. Envía el pedido impecable por WhatsApp directo al dueño, ¡sin intermediarios!",
      icon: Phone,
      tip: "¡Las tarjetas de clientes recurrentes reflejan tu categoría VIP, Oro o Plata al instante para darte un trato preferencial!"
    }
  ];

  // Admin step content
  const adminSteps = [
    {
      title: "Registra tu Negocio de Película",
      desc: "Da de alta tu tienda en segundos con nombre, descripción, tu logo y tus datos de contacto. Recibirás un enlace público personalizado tipo '/store/tu-nombre' listo para compartir en redes.",
      icon: Store,
      tip: "Sube un logo cuadrado bien nítido para que los clientes te recuerden."
    },
    {
      title: "Sube tus Productos y Empaques",
      desc: "Olvídate de la rigidez. En PaTí puedes vender un producto por Libras, Cajas o Sacos, y asignarle escalas al por mayor a cada opción para captar compras de revendedores y familias organizadas.",
      icon: Package,
      tip: "¡Configurar empaques y escalas atrae pedidos 3 veces más grandes!"
    },
    {
      title: "Parámetros de Fidelidad y Finanzas",
      desc: "Configura tus métodos de cobro detallando tus tarjetas CUP (Transfermóvil) o cuentas MLC/Zelle. Define los umbrales de fidelidad (VIP, Oro, Plata) para combatir la alta inflación y proteger tus escalas de clientes.",
      icon: DollarSign,
      tip: "¡Control total! Ajusta los valores de las categorías si ves que cumplen muy fácil."
    },
    {
      title: "Zonas de Envíos y Mensajería",
      desc: "Define los municipios que cubres y las tarifas de envíos. Tus repartidores sabrán exactamente a dónde ir, y los clientes verán el costo de traslado calculado de forma automática antes de ordenar.",
      icon: TrendingUp,
      tip: "Controla el boletín de novedades integrado para enterarte del sistema de actualizaciones."
    }
  ];

  // Client Simulation calculations
  const simUnitPrice = simQuantity >= 5 ? 28 : 35; // 35 base, 28 wholesale starting at 5
  const simTotal = simQuantity * simUnitPrice;
  const simSavings = simQuantity >= 5 ? simQuantity * (35 - 28) : 0;

  const handleAddSimCart = () => {
    toast.success("¡Listo asere! Agregamos el ítem al carrito simulado.");
    setSimCart([{
      name: "Saco de Cebolla Morada (80 Lbs)",
      quantity: simQuantity,
      unitPrice: simUnitPrice,
      total: simTotal,
      savings: simSavings,
      unitName: simQuantity >= 5 ? "Sacos" : "Libras (Detalle)"
    }]);
  };

  const handleSimOrderSubmit = () => {
    setIsOrderSubmitted(true);
    toast.success("¡Pedido simulado con éxito! Así es como viajaría a WhatsApp.");
  };

  // Admin Simulation calculations
  const simWholesaleUnits = 8; // Simulated client quantity
  const simWholesaleUnitAppliedPrice = simWholesalePrice;
  const simGrossSale = simWholesaleUnits * simWholesaleUnitAppliedPrice;
  const simFeeAmount = (simGrossSale * simCommission) / 100;
  const simNetProfit = simGrossSale - simFeeAmount;

  const handleSimulateSale = () => {
    setSimSalesCount(prev => prev + 1);
    setSimTotalRevenue(prev => prev + simNetProfit);
    toast.success(`¡Venta procesada con éxito! Has ganado $${simNetProfit.toFixed(2)} netos.`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:h-[85vh] max-h-[900px]"
          >
            {/* Header Modal */}
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                    Centro de Aprendizaje e Interactivo
                  </h3>
                  <p className="text-[10px] text-slate-405 font-black uppercase tracking-widest mt-1.5 text-slate-400">
                    Aprende cómo funciona PaTí con simuladores en tiempo real
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Select Role Tabs */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50/50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 flex flex-wrap gap-2 justify-center sm:justify-start">
              <Button
                onClick={() => setSelectedRole('client')}
                className={`rounded-2xl font-black text-[10px] uppercase tracking-widest px-6 h-11 transition-all ${
                  selectedRole === 'client' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
                nativeButton={false}
              >
                <User className="mr-2 h-4 w-4" /> Rol Comprador (Cliente)
              </Button>
              <Button
                onClick={() => setSelectedRole('admin')}
                className={`rounded-2xl font-black text-[10px] uppercase tracking-widest px-6 h-11 transition-all ${
                  selectedRole === 'admin' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
                nativeButton={false}
              >
                <Store className="mr-2 h-4 w-4" /> Rol Dueño de Tienda (Admin)
              </Button>
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col lg:flex-row gap-8">
              
              {/* Left Column: Educational Step-by-Step */}
              <div className="flex-1 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 pb-8 lg:pb-0 lg:pr-8 min-w-0">
                <div>
                  <div className="flex flex-col gap-2 mb-6">
                    <Badge className="bg-primary/10 text-primary border-none rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest self-start">
                      Paso {(selectedRole === 'client' ? clientStep : adminStep) + 1} de 4
                    </Badge>
                    <div className="flex gap-1.5 w-full max-w-[160px] mt-2">
                      {[0, 1, 2, 3].map((sIdx) => {
                        const activeStep = selectedRole === 'client' ? clientStep : adminStep;
                        return (
                          <div 
                            key={sIdx}
                            className={cn(
                              "h-2 rounded-full transition-all duration-500",
                              sIdx === activeStep 
                                ? "w-8 bg-primary" 
                                : sIdx < activeStep 
                                  ? "w-4 bg-primary/60" 
                                  : "w-4 bg-slate-200 dark:bg-slate-850"
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedRole + '_' + (selectedRole === 'client' ? clientStep : adminStep)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {(() => {
                        const stepData = selectedRole === 'client' ? clientSteps[clientStep] : adminSteps[adminStep];
                        const StepIcon = stepData.icon;
                        return (
                          <>
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 bg-primary/10 dark:bg-primary/20 rounded-3xl flex items-center justify-center shrink-0">
                                <StepIcon className="h-7 w-7 text-primary" />
                              </div>
                              <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                                {stepData.title}
                              </h4>
                            </div>

                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed pt-2">
                              {stepData.desc}
                            </p>

                            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-3">
                              <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-0.5">Consejo Guajiro:</span>
                                <p className="text-xs text-amber-650 dark:text-slate-350 italic font-medium">
                                  "{stepData.tip}"
                                </p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Left Side Controls (Next/Prev) */}
                <div className="flex items-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedRole === 'client') {
                        setClientStep(prev => Math.max(0, prev - 1));
                      } else {
                        setAdminStep(prev => Math.max(0, prev - 1));
                      }
                    }}
                    disabled={selectedRole === 'client' ? clientStep === 0 : adminStep === 0}
                    className="h-11 rounded-xl bg-white dark:bg-slate-800 text-[10px] uppercase font-black tracking-widest flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedRole === 'client') {
                        setClientStep(prev => Math.min(3, prev + 1));
                      } else {
                        setAdminStep(prev => Math.min(3, prev + 1));
                      }
                    }}
                    disabled={selectedRole === 'client' ? clientStep === 3 : adminStep === 3}
                    className="h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] uppercase font-black tracking-widest flex items-center gap-2"
                  >
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Right Column: Interaction Sandbox */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-850 flex flex-col justify-between shrink-0 min-w-0 lg:max-w-md">
                
                {selectedRole === 'client' ? (
                  /* CLIENT SANDBOX PLAYGROUND */
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] text-primary font-black uppercase tracking-widest block">Simulador de Pedido</span>
                        <Badge className="bg-amber-500/10 text-amber-600 border-none rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                          Wholesale Demo
                        </Badge>
                      </div>

                      {/* Simulated Product Card */}
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-150 dark:border-slate-850 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-lime-500/10 text-lime-600 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-sm">
                            🧅
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Saco a Granel</span>
                            <h5 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white truncate">Saco de Cebolla Morada (80 Lbs)</h5>
                            <span className="text-xs font-bold text-slate-450 dark:text-slate-400 mt-0.5 block">
                              $35.00 USD <span className="text-[10px] font-medium text-slate-400">/ saco</span>
                            </span>
                          </div>
                        </div>

                        {/* Wholesale Tier Notice */}
                        <div className="mt-3 py-1.5 px-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between text-[9px]">
                          <span className="text-primary font-black uppercase tracking-widest">Escala Mayorista:</span>
                          <span className="text-slate-600 dark:text-slate-300 font-extrabold">5 o más sacos → <span className="text-primary">$28.00 USD</span></span>
                        </div>

                        {/* Quantity controls */}
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Cantidad:</span>
                          <div className="flex items-center gap-3">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setSimQuantity(prev => Math.max(1, prev - 1))}
                              className="h-8 w-8 rounded-lg font-black text-slate-900"
                            >
                              -
                            </Button>
                            <span className="text-sm font-black text-slate-900 dark:text-white w-5 text-center">{simQuantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setSimQuantity(prev => prev + 1)}
                              className="h-8 w-8 rounded-lg font-black text-slate-900"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Calculations Visual Dynamic */}
                      <div className="mt-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-bold">Precio Unitario:</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">${simUnitPrice.toFixed(2)} USD</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-bold">Subtotal ({simQuantity} sacos):</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">${(simQuantity * 35).toFixed(2)} USD</span>
                        </div>
                        {simSavings > 0 && (
                          <div className="flex items-center justify-between text-xs bg-emerald-500/10 text-emerald-600 p-2 rounded-xl border border-emerald-500/15">
                            <span className="font-black text-[9px] uppercase tracking-widest flex items-center gap-1">
                              <Badge className="bg-emerald-600 text-white rounded-full p-0.5"><Check className="h-2 w-2" /></Badge> Ahorro Mayorista:
                            </span>
                            <span className="font-black text-xs">-${simSavings.toFixed(2)} USD</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Total a Pagar:</span>
                          <span className="text-base font-black text-primary">${simTotal.toFixed(2)} USD</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulation Cart state and CTA */}
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                      {simCart.length > 0 ? (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500/20 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-600">
                            <span>📦 Carrito Demo Activo</span>
                            <span>1 Producto</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {simCart[0].quantity}x {simCart[0].name} pautados a <span className="font-bold text-slate-950 dark:text-white">${simCart[0].unitPrice} USD</span>.
                          </div>
                          {!isOrderSubmitted ? (
                            <Button
                              onClick={handleSimOrderSubmit}
                              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] uppercase font-black tracking-widest shadow-lg shadow-emerald-550/20 mt-1 flex items-center justify-center gap-1.5"
                            >
                              <Phone className="h-4 w-4" /> Simular Enviar Pedido a WhatsApp
                            </Button>
                          ) : (
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-center text-[10px] font-extrabold uppercase">
                              🎉 ¡MENSAJE ENVIADO A WHATSAPP!
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={handleAddSimCart}
                          className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl text-[9px] uppercase font-black tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart className="h-4 w-4" /> Añadir al Carrito de Prueba
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ADMIN SANDBOX PLAYGROUND */
                  <div className="space-y-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-primary font-black uppercase tracking-widest block mb-3">Simulador de Configuración</span>
                      
                      {/* Form Inputs for Product Config */}
                      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-150 dark:border-slate-850 shadow-sm">
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-1">Nombre del ítem</label>
                          <Input 
                            value={simProdName}
                            onChange={(e) => setSimProdName(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-855 border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl h-9 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-1">Precio Detalle ($)</label>
                            <Input 
                              type="number" 
                              value={simProdPrice}
                              onChange={(e) => setSimProdPrice(parseInt(e.target.value) || 0)}
                              className="bg-slate-50 border-slate-200 text-xs font-bold rounded-xl h-9 text-center text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-1">Mínimo Mayorista</label>
                            <Input 
                              type="number" 
                              value={simMinWholesale}
                              onChange={(e) => setSimMinWholesale(parseInt(e.target.value) || 0)}
                              className="bg-slate-50 border-slate-200 text-xs font-bold rounded-xl h-9 text-center text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-1">Precio Mayorista ($)</label>
                          <Input 
                            type="number" 
                            value={simWholesalePrice}
                            onChange={(e) => setSimWholesalePrice(parseInt(e.target.value) || 0)}
                            className="bg-slate-50 border-slate-200 text-xs font-bold rounded-xl h-9 text-center text-slate-950 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Math Result Analysis */}
                      <div className="mt-3 p-4 rounded-3xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 space-y-2">
                        <div className="text-[9px] font-black uppercase tracking-wider text-primary">Simulemos una Compra de ({simWholesaleUnits} unids):</div>
                        
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-400 font-medium">Precio Detalle regular o Mayorista:</span>
                          <span className="font-bold text-amber-400">${simWholesaleUnitAppliedPrice} c/u</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Venta Bruta:</span>
                          <span className="font-bold text-white">${simGrossSale.toFixed(2)} USD</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Comisión de la Plaza ({simCommission}%):</span>
                          <span className="font-bold text-rose-450 text-rose-400">-${simFeeAmount.toFixed(2)} USD</span>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wide">Ganancia Limpia para Ti:</span>
                          <span className="text-sm font-black text-emerald-500">${simNetProfit.toFixed(2)} USD</span>
                        </div>
                      </div>
                    </div>

                    {/* Fake Sale Simulator Counter */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150">
                        <div className="text-[9px] font-black uppercase text-slate-400">
                          Panel Ganancias Demo
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 dark:text-white block">{simSalesCount} Ventas</span>
                          <span className="text-[10px] font-extrabold text-emerald-600 block">+${simTotalRevenue.toFixed(2)} USD</span>
                        </div>
                      </div>
                      
                      <Button
                        onClick={simWholesalePrice >= simProdPrice ? () => toast.error('Oye asere, el precio de mayorista debe ser menor que el precio de detalle.') : handleSimulateSale}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] uppercase font-black tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                      >
                        <TrendingUp className="h-4 w-4" /> Lanzar Compra Simulada de Prueba
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Footer Credits with Cuban Flare */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              ¡No te quedes con la duda asere! Todo está diseñado para ser directo, transparente y facilísimo. 🤝
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
