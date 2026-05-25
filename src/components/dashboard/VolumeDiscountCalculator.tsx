import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Percent, ShieldCheck, HelpCircle, ArrowRight, CornerDownRight, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface VolumeDiscountCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  productContext: {
    name: string;
    cost: number;
    price: number;
    currency: string;
    packagingOptions?: any[];
  };
  onApplyTiers: (tiers: any[], packagingOptionId?: string) => void;
}

export default function VolumeDiscountCalculator({ 
  isOpen, 
  onClose, 
  productContext, 
  onApplyTiers 
}: VolumeDiscountCalculatorProps) {
  
  // Choose format context: first packaging option ID
  const [selectedFormatId, setSelectedFormatId] = useState<string>(() => {
    const opts = productContext.packagingOptions || [];
    return opts.length > 0 ? opts[0].id : '';
  });

  // Input States
  const [costoUnitario, setCostoUnitario] = useState<number>(productContext.cost || 0);
  const [precioVentaTope, setPrecioVentaTope] = useState<number>(productContext.price || 0);
  const [porcentajeProteccion, setPorcentajeProteccion] = useState<number>(85); // ej. 85 para 85%
  const [rawEscalasDeseadas, setRawEscalasDeseadas] = useState<number>(5);
  const [useIntegers, setUseIntegers] = useState<boolean>(productContext.currency === 'CUP');

  // Settings for real-time checkout simulation
  const [cantidadComprada, setCantidadComprada] = useState<number>(120);
  const [umbralUnidades, setUmbralUnidades] = useState<number>(50);

  // Synchronize when dialog opens or selected format changes
  useEffect(() => {
    const opt = productContext.packagingOptions?.find(o => o.id === selectedFormatId);
    if (opt) {
      // Usaremos valores calculados por unidad para el empaque
      // De esta forma la escala se asigna correctamente al precio unitario del empaque
      setCostoUnitario(Number(productContext.cost) || 0);

      // Obtenemos el precio unitario del empaque (desde su primer nivel mayorista o del precio base)
      const firstTierPrice = (opt.wholesaleTiers && opt.wholesaleTiers[0]) 
        ? Number(opt.wholesaleTiers[0].pricePerUnit) 
        : 0;

      const fallbackUnitValue = productContext.price * 0.95;
      setPrecioVentaTope(firstTierPrice > 0 ? firstTierPrice : fallbackUnitValue);

      // Sincronizar escala activa y margen conservado
      const numTiers = (opt.wholesaleTiers && opt.wholesaleTiers.length > 0)
        ? opt.wholesaleTiers.length
        : 5; // Mínimo de 5 por defecto o lo que corresponda

      setRawEscalasDeseadas(numTiers);

      if (opt.targetProfitMargin) {
        setPorcentajeProteccion(opt.targetProfitMargin);
      } else {
        setPorcentajeProteccion(85);
      }
    }
  }, [selectedFormatId, productContext, isOpen]);

  // Calculations Core (Backend Logic)
  const marginTotal = Math.max(0, precioVentaTope - costoUnitario);
  
  // Si tu margen protegido es del 85%, tu ganancia mínima asegurada es el 85% del margen bruto.
  const gananciaMinima = marginTotal * (porcentajeProteccion / 100);
  
  // El presupuesto de descuento máximo permitido es del 15% (100% - 85% = 15%) de ese de margen.
  const descuentoMaximoAbsoluto = marginTotal - gananciaMinima;

  const escalasDeseadas = Math.max(1, rawEscalasDeseadas);
  const actualIncremento = useIntegers 
    ? Math.round(descuentoMaximoAbsoluto / escalasDeseadas) 
    : (descuentoMaximoAbsoluto / escalasDeseadas);

  const descuentoMaximoReal = descuentoMaximoAbsoluto;

  // Generación de Tabla de Escalas (Paso 4)
  const resultTable = [];
  for (let i = 1; i <= escalasDeseadas; i++) {
    // Distribuimos el descuento de forma equitativa (i / escalasDeseadas) del descuento máximo absoluto
    let descuentoAplicado = (i / escalasDeseadas) * descuentoMaximoAbsoluto;
    if (useIntegers) {
      descuentoAplicado = Math.round(descuentoAplicado);
    }
    
    const precioFinal = useIntegers ? Math.round(precioVentaTope - descuentoAplicado) : (precioVentaTope - descuentoAplicado);
    const gananciaReal = precioFinal - costoUnitario;
    const porcentajeProteccionReal = marginTotal > 0 ? (gananciaReal / marginTotal) * 100 : 0;

    resultTable.push({
      nivel: i,
      descuento: descuentoAplicado,
      precioFinal: precioFinal,
      ganancia: gananciaReal,
      proteccion: porcentajeProteccionReal,
      isCushion: false
    });
  }

  // Fórmula en tiempo real para Checkout (Paso 5)
  const escalaAlcanzadaRaw = Math.floor(cantidadComprada / umbralUnidades);
  const escalaAlcanzada = escalaAlcanzadaRaw > resultTable.length 
    ? resultTable.length 
    : (escalaAlcanzadaRaw < 1 ? 0 : escalaAlcanzadaRaw);

  const activeRow = escalaAlcanzada > 0 ? resultTable[escalaAlcanzada - 1] : null;
  const descuentoFinalCliente = activeRow ? activeRow.descuento : 0;
  const precioACobrar = activeRow ? activeRow.precioFinal : precioVentaTope;
  const ahorroTotalSimulado = descuentoFinalCliente * cantidadComprada;

  const handleApply = () => {
    if (resultTable.length === 0) {
      toast.error("No hay escalas calculadas válidas para aplicar.");
      return;
    }

    // Convertir el resultado de la escala a la estructura de wholesaleTiers del producto
    // En las escalas de PaTí, minPackages corresponde al número de paquetes para activar ese precio
    // Mapeamos minPackages = i * umbralUnidades
    const mappedTiers = resultTable.map(row => ({
      id: Math.random().toString(36).substring(2, 9),
      minPackages: row.nivel * umbralUnidades,
      pricePerUnit: row.precioFinal
    }));

    onApplyTiers(mappedTiers, selectedFormatId);
    toast.success(`🎉 ¡Escalas de margen protegido aplicadas con éxito al formato seleccionado!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-slate-200 dark:border-slate-850 p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/20 rounded-2xl flex items-center justify-center">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Asistente de Escalas con Margen Protegido
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider">
                Motor financiero para garantizar beneficios ante revendedores o compras masivas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Format Selection Selector */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Paso A: Seleccionar Formato a Simular (Empaques)</span>
            <select
              value={selectedFormatId}
              onChange={(e) => setSelectedFormatId(e.target.value)}
              className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest rounded-xl p-2.5 w-full text-slate-850 dark:text-white"
            >
              {productContext.packagingOptions?.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.quantity} unids.)
                </option>
              ))}
              {(productContext.packagingOptions || []).length === 0 && (
                <option value="">No hay formatos configurados</option>
              )}
            </select>
          </div>
          <div className="text-xs text-slate-450 dark:text-slate-400 italic">
            * Cada formato calcula su costo y precio tope dependiendo de la jerarquía elegida. ¡Los cambios se aplicarán justamente a este formato!
          </div>
        </div>

        {/* Config and Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          
          {/* Inputs Section */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-850">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-black">1</span> Inputs del Modelo Financiero
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Costo Unitario ($)</Label>
                <Input 
                  type="number"
                  step="any"
                  value={costoUnitario}
                  onChange={(e) => setCostoUnitario(Number(e.target.value) || 0)}
                  className="rounded-xl h-10 font-bold bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Precio de Venta Tope ($)</Label>
                <Input 
                  type="number"
                  step="any"
                  value={precioVentaTope}
                  onChange={(e) => setPrecioVentaTope(Number(e.target.value) || 0)}
                  className="rounded-xl h-10 font-bold bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Porcentaje de Protección (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={porcentajeProteccion}
                  onChange={(e) => setPorcentajeProteccion(Number(e.target.value) || 0)}
                  className="rounded-xl h-10 font-bold bg-white dark:bg-slate-800 text-xs text-center"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Escalas Deseadas</Label>
                <Input 
                  type="number"
                  min="1"
                  value={rawEscalasDeseadas}
                  onChange={(e) => setRawEscalasDeseadas(Number(e.target.value) || 1)}
                  className="rounded-xl h-10 font-bold bg-white dark:bg-slate-800 text-xs text-center"
                />
              </div>
            </div>

            {/* Selector de valores enteros */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 dark:bg-slate-800/40 rounded-2xl border border-emerald-150/60 dark:border-emerald-900/40">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase text-emerald-950 dark:text-emerald-400">Precios y Descuentos Enteros (Recomendado para CUP)</span>
                <span className="text-[8px] text-slate-400 leading-tight select-none">Redondea todo a números enteros (sin centavos) para facilitar operaciones de caja. ¡Ideal para el peso cubano!</span>
              </div>
              <input 
                type="checkbox"
                checked={useIntegers}
                onChange={(e) => setUseIntegers(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-350 cursor-pointer text-emerald-555"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold font-bold">Diferencia Precio-Costo:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">${marginTotal.toFixed(2)} {productContext.currency}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-500 font-bold">Ganancia Mínima Protegida ({porcentajeProteccion}%):</span>
                <span className="font-extrabold text-emerald-600">${gananciaMinima.toFixed(2)} {productContext.currency}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-500 font-bold">Presupuesto Descuento Máximo ({100 - porcentajeProteccion}%):</span>
                <span className="font-extrabold text-rose-500">${descuentoMaximoAbsoluto.toFixed(2)} {productContext.currency}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-550 font-bold">Distribución Equitativa:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">
                  {escalasDeseadas} Escalas de Mayoreo
                </span>
              </div>

              {/* Barra de Margen Conservado o Protegido */}
              <div className="p-3.5 bg-emerald-555/10 dark:bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400">
                  <span>Margen Conservado / Protegido</span>
                  <span>{porcentajeProteccion}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden relative border border-slate-300 dark:border-slate-700">
                  <div 
                    className="bg-emerald-550 dark:bg-emerald-600 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2 text-[8px] font-bold text-white uppercase tracking-wider font-mono" 
                    style={{ width: `${porcentajeProteccion}%`, backgroundColor: '#10b981' }}
                  >
                    {porcentajeProteccion >= 30 && "Margen Protegido"}
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal">
                  * Se reserva un {porcentajeProteccion}% de tu margen bruto como límite inviolable ante revendedores.
                </div>
              </div>
            </div>
          </div>

          {/* Alert Banner and Visual Data Display */}
          <div className="space-y-4 flex flex-col justify-between col-span-1">
            <div className="space-y-3">
              {/* Step 4 Escalas Table */}
              <div className="rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm max-h-[260px] overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-50 dark:bg-slate-950">
                    <TableRow>
                      <TableHead className="py-2.5 font-bold text-[9px] uppercase">Rango / Rol</TableHead>
                      <TableHead className="py-2.5 font-bold text-[9px] uppercase text-center">Descuento</TableHead>
                      <TableHead className="py-2.5 font-bold text-[9px] uppercase text-center">P. Final</TableHead>
                      <TableHead className="py-2.5 font-bold text-[9px] uppercase text-center">Ganancia</TableHead>
                      <TableHead className="py-2.5 font-bold text-[9px] uppercase text-right">% Protec.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultTable.map((row) => (
                      <TableRow key={row.nivel} className="hover:bg-slate-50 dark:hover:bg-slate-855">
                        <TableCell className="font-extrabold py-2 text-indigo-750 dark:text-indigo-400">
                          <span className="flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 text-indigo-600 animate-pulse" /> Escala {row.nivel}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2 text-rose-500 font-extrabold">-${row.descuento.toFixed(2)}</TableCell>
                        <TableCell className="text-center py-2 font-black text-slate-850 dark:text-slate-100">${row.precioFinal.toFixed(2)}</TableCell>
                        <TableCell className="text-center py-2 text-emerald-600 font-extrabold">${row.ganancia.toFixed(2)}</TableCell>
                        <TableCell className="text-right py-2 font-mono font-bold text-emerald-600">{row.proteccion.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                    {resultTable.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-400 italic">
                          Calcula el margen para generar escalas de volumen válidas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Applies configuration instructions */}
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Paso B: Definir Umbral Cliente</span>
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Unids. por Escala</Label>
                  <Input 
                    type="number" 
                    value={umbralUnidades} 
                    onChange={(e) => setUmbralUnidades(Number(e.target.value) || 1)}
                    className="h-8 max-w-[100px] text-xs font-black rounded-lg"
                  />
                </div>
                <div className="text-[10px] text-indigo-650 dark:text-slate-400 leading-tight">
                  Cada incremento de esta cantidad en el pedido activará el siguiente escalón de descuento simétricamente.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Simulator Preview (Step 5) */}
        <div className="border-t pt-5 mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-[9px] font-black">2</span> Simulador Descuento de Compra (Checkout de Cliente)
            </h4>
            <span className="text-[10.5px] text-slate-400 font-mono">Modo: Mayoreo Automático</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Cantidad Comprada</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number"
                  value={cantidadComprada}
                  onChange={(e) => setCantidadComprada(Number(e.target.value) || 0)}
                  className="rounded-xl h-10 font-black bg-white dark:bg-slate-800 text-xs text-center"
                />
                <span className="text-xs text-slate-400 font-bold">Unids.</span>
              </div>
            </div>

            <div className="space-y-1 flex flex-col justify-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Escala Alcanzada:</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-primary">{escalaAlcanzada}</span>
                <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                  {escalaAlcanzada > 0 ? `Precio Nivel ${escalaAlcanzada}` : "Precio regular"}
                </span>
              </div>
              <span className="text-[8px] text-slate-400">De un máximo de {escalasDeseadas} escalas.</span>
            </div>

            <div className="space-y-1 flex flex-col justify-center border-l dark:border-slate-800 pl-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Precio por form:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">${precioACobrar.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium font-bold text-rose-500">Descuento Final:</span>
                <span className="font-extrabold text-rose-500">-${descuentoFinalCliente.toFixed(2)} c/u</span>
              </div>
              <div className="flex items-center justify-between text-sm font-black text-indigo-650 dark:text-indigo-400 pt-1 border-t dark:border-slate-800">
                <span>Cobro Total:</span>
                <span>${(precioACobrar * cantidadComprada).toLocaleString()} {productContext.currency}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0 mt-6 pt-4 border-t border-slate-100 dark:border-slate-855">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="rounded-xl h-11 font-black uppercase text-[10px] tracking-widest border-slate-200"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleApply}
            disabled={resultTable.length === 0}
            className="rounded-xl h-11 font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/95 text-white flex items-center gap-2 px-6"
          >
            <Sparkles className="h-4 w-4" /> Aplicar y Guardar Escalas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
