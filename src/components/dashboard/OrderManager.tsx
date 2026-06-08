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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, CheckCircle, XCircle, Loader2, Search, MapPin, Phone, User as UserIcon, Truck, Printer, ExternalLink, DollarSign } from "lucide-react";
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, where } from 'firebase/firestore';
import { Order, OrderStatus } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cleanPackagingName } from '../../lib/utils';

function safeToDate(val: any): Date {
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

export default function OrderManager({ storeId }: { storeId?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [store, setStore] = useState<any | null>(null);

  useEffect(() => {
    if (!storeId) return;
    const unsubscribe = onSnapshot(doc(db, 'stores', storeId), (docSnap) => {
      if (docSnap.exists()) {
        setStore({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsubscribe();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    const q = query(
      collection(db, 'orders'), 
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      } catch (e) {}
    });

    return () => unsubscribe();
  }, [storeId]);

  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor, permite las ventanas emergentes para poder imprimir.');
      return;
    }

    const itemsRows = order.items.map(item => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-transform: uppercase; font-size: 11px; font-weight: bold;">
          ${item.quantity}x ${item.name}
          ${item.packagingName ? `<br/><span style="font-size: 10px; color: #666; font-weight: normal;">EMPAQUE: ${cleanPackagingName(item.packagingName).toUpperCase()}</span>` : ''}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-size: 11px; font-weight: bold; font-family: monospace;">
          $${(item.price * (item.packagingQuantity || 1) * item.quantity).toLocaleString()} ${item.currency}
        </td>
      </tr>
    `).join('');

    const deliveryCostText = order.deliveryMethod === 'delivery'
      ? (typeof order.deliveryCost === 'number' 
          ? `$${order.deliveryCost.toLocaleString()}` 
          : 'A Consultar')
      : 'Gratis (Recogida)';

    const totalCUPText = order.totalCUP > 0 ? `
              <div class="totals-row" style="font-size: 18px; color: #000; font-weight: 950; margin-top: 10px; display: flex; justify-content: space-between;">
                <span>TOTAL CUP:</span>
                <span>$${order.totalCUP.toLocaleString()} CUP</span>
              </div>` : '';

    const totalMLCText = order.totalMLC > 0 ? `
              <div class="totals-row" style="font-size: 18px; color: #10b981; font-weight: 950; margin-top: 5px; display: flex; justify-content: space-between;">
                <span>TOTAL MLC:</span>
                <span>$${order.totalMLC.toLocaleString()} MLC</span>
              </div>` : '';

    const content = `
      <html>
        <head>
          <title>Factura #${order.id.substring(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 30px; margin: 0; }
            .invoice-box { max-width: 420px; margin: auto; border: 2px solid #f1f5f9; padding: 25px; border-radius: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
            h2 { text-transform: uppercase; font-style: italic; font-weight: 900; letter-spacing: -0.05em; margin: 0 0 5px 0; font-size: 22px; }
            .date { font-size: 11px; color: #64748b; margin-bottom: 25px; font-weight: bold; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .totals { margin-top: 25px; padding-top: 15px; border-top: 2px solid #e2e8f0; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; font-size: 12px; }
            .footer { margin-top: 35px; text-align: center; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 900; letter-spacing: 0.15em; border-top: 1px dashed #e2e8f0; pt-20px; padding-top: 15px; }
            @media print {
              body { padding: 0; }
              .invoice-box { border: none; box-shadow: none; padding: 10px; max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <h2>${order.customerName}</h2>
            <div class="date">Factura #${order.id.substring(0, 8).toUpperCase()} - ${new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now()).toLocaleDateString('es-ES')}</div>
            
            <div style="margin-bottom: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; background: #f8fafc; padding: 12px; border-radius: 16px; border: 1px solid #f1f5f9; line-height: 1.6;">
              <div style="color: #64748b;">MÉTODO: ${order.deliveryMethod === 'delivery' ? 'ENTREGA A DOMICILIO' : 'RECOGIDA EN TIENDA'}</div>
              <div style="color: #64748b;">TELÉFONO: ${order.customerPhone}</div>
              <div style="color: #64748b;">DIRECCIÓN: ${order.customerAddress}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="text-align: left; font-size: 9px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; font-weight: 900;">Producto</th>
                  <th style="text-align: right; font-size: 9px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; font-weight: 900;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row" style="color: #64748b;">
                <span>ENVÍO:</span>
                <span>${deliveryCostText}</span>
              </div>
              ${totalCUPText}
              ${totalMLCText}
            </div>

            <div class="footer">*** ¡GRACIAS POR SU COMPRA! ***</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleSendWhatsAppInvoice = (order: Order) => {
    const isDrop = order.affiliateMode === 'direct_sale' && order.managerName;
    
    // Create clean, padded text rows for products
    const itemsText = order.items.map(item => {
      const pkg = item.packagingName ? ` [EMPAQUE: ${cleanPackagingName(item.packagingName).toUpperCase()}]` : '';
      return `🔹 *${item.quantity}x ${item.name}*${pkg}\n   └─ Subtotal: $${(item.price * (item.packagingQuantity || 1) * item.quantity).toLocaleString()} ${item.currency}`;
    }).join('\n\n');

    const deliveryCostText = order.deliveryMethod === 'delivery'
      ? (typeof order.deliveryCost === 'number' 
          ? `$${order.deliveryCost.toLocaleString()}` 
          : 'A Consultar')
      : 'Gratis (Recogida)';

    const totalCUPText = order.totalCUP > 0 ? `💵 *TOTAL CUP:*  $${order.totalCUP.toLocaleString()} CUP` : '';
    const totalMLCText = order.totalMLC > 0 ? `💳 *TOTAL MLC:*  $${order.totalMLC.toLocaleString()} MLC` : '';

    const lines = [
      `🧾 *FACTURA DE COMPRA*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📄 *Órden:*     #${order.id.substring(0, 8).toUpperCase()}`,
      `────────────────────────`,
      isDrop ? `👤 *Cliente Final:* ${order.customerName}` : `👤 *Cliente:*    ${order.customerName}`,
      `📞 *Teléfono:*   ${order.customerPhone}`,
      `📍 *Dirección:*  ${order.customerAddress}`,
      `🚚 *Entrega:*    ${order.deliveryMethod === 'delivery' ? 'Domicilio' : 'Recogida en tienda'} (${deliveryCostText})`,
    ];

    if (isDrop) {
      lines.push(
        `────────────────────────`,
        `💼 *Gestor / Socio:* ${order.managerName} (${order.referralCode || 'Sin código'})`,
        `📞 *Teléfono Gestor:* ${order.managerPhone}`
      );
    }

    lines.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *DETALLE DE PRODUCTOS:*`,
      `────────────────────────`,
      itemsText,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *LIQUIDACIÓN:*`,
      `────────────────────────`
    );

    if (totalCUPText) lines.push(totalCUPText);
    if (totalMLCText) lines.push(totalMLCText);

    lines.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🙏 ¡Muchas gracias por su compra!`
    );

    const text = lines.filter(Boolean).join('\n');
    const encodedText = encodeURIComponent(text);
    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    const prefixedPhone = cleanPhone.length === 8 ? `53${cleanPhone}` : cleanPhone;
    
    window.open(`https://wa.me/${prefixedPhone}?text=${encodedText}`, '_blank');
  };

  const handleSendWhatsAppCommissionInvoice = (order: Order) => {
    const rate = store?.commissionRate || 5;
    const cupCommission = (order.totalCUP || 0) * rate / 100;
    const mlcCommission = (order.totalMLC || 0) * rate / 100;

    const totalCUPText = order.totalCUP > 0 ? `💵 *COMISIÓN CUP:*  $${cupCommission.toLocaleString()} CUP` : '';
    const totalMLCText = order.totalMLC > 0 ? `💳 *COMISIÓN MLC:*  $${mlcCommission.toLocaleString()} MLC` : '';

    const managerNameText = order.managerName || order.customerName;

    const lines = [
      `🧾 *FACTURA DE COMISIÓN (SOCIO)*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💼 *Socio / Gestor:*  ${managerNameText}`,
      `🔑 *Código Socio:*     ${order.referralCode || 'Sin código'}`,
      `🛒 *Tienda:*           ${store?.name || 'Nuestra Tienda'}`,
      `────────────────────────`,
      `📄 *Órden:*           #${order.id.substring(0, 8).toUpperCase()}`,
      `👤 *Cliente Final:*   ${order.customerName}`,
      `🚚 *Tipo Entrega:*    ${order.deliveryMethod === 'delivery' ? 'Domicilio' : 'Recogida'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *RESUMEN DE VENTA:*`,
      `────────────────────────`,
      order.totalCUP > 0 ? `🔹 Total Venta CUP: $${order.totalCUP.toLocaleString()} CUP` : '',
      order.totalMLC > 0 ? `🔹 Total Venta MLC: $${order.totalMLC.toLocaleString()} MLC` : '',
      `🔹 Porcentaje:      ${rate}%`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💵 *LIQUIDAR COMISIÓN:*`,
      `────────────────────────`,
    ];

    if (totalCUPText) lines.push(totalCUPText);
    if (totalMLCText) lines.push(totalMLCText);

    lines.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🙏 ¡Gracias por tu tremenda gestión, asere!`,
      `🚀 PaTí - Tu negocio en tus manos`
    );

    const text = lines.filter(Boolean).join('\n');
    const encodedText = encodeURIComponent(text);

    // Send to partner/manager if they have a phone, otherwise use client's phone number as fallback or store number
    const targetPhone = order.managerPhone || order.customerPhone || store?.whatsappNumber || '';
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const prefixedPhone = cleanPhone.length === 8 ? `53${cleanPhone}` : cleanPhone;

    window.open(`https://wa.me/${prefixedPhone}?text=${encodedText}`, '_blank');
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
      toast.success(`Pedido actualizado a ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
      toast.error('Error al actualizar pedido');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider shadow-sm">Pendiente</Badge>;
      case 'confirmed': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider shadow-sm">Confirmado</Badge>;
      case 'shipped': return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider shadow-sm">Despachado</Badge>;
      case 'delivered': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider shadow-sm">Entregado</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider shadow-sm">Cancelado</Badge>;
      default: return <Badge variant="secondary" className="font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => 
    order.customerName.toLowerCase().includes(search.toLowerCase()) || 
    order.customerPhone.includes(search)
  );

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white italic uppercase">Gestión de Pedidos</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Registro histórico y procesamiento de ventas</p>
      </div>

      <div className="flex items-center gap-4 max-w-md bg-white dark:bg-slate-900 p-2 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
          <Input 
            placeholder="Buscar por cliente o teléfono..." 
            className="pl-12 h-14 bg-slate-50/50 dark:bg-slate-800/50 border-none rounded-xl font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border-2 rounded-[2rem] bg-white dark:bg-slate-950 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/40 border-slate-100 dark:border-slate-800">
        <div className="overflow-x-auto pretty-scrollbar-x w-full">
          {loading ? (
            <div className="p-20 flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
          ) : (
            <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent border-b-2 border-slate-100 dark:border-slate-800">
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em] p-6 text-center">Ref</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em]">Cliente / Contacto</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em]">Cronología</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em]">Liquidación Total</TableHead>
                <TableHead className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em] text-center">Estado de Flujo</TableHead>
                <TableHead className="text-right font-black text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-[0.2em] p-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all duration-300">
                  <TableCell className="p-6 text-center">
                    <span className="font-black font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-colors">#{order.id.substring(0, 8).toUpperCase()}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-lg text-slate-800 dark:text-slate-200 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase italic">{order.customerName}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-indigo-400 dark:text-indigo-500" />
                        {order.customerPhone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{format(safeToDate(order.createdAt), 'dd MMM', { locale: es })}</span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{format(safeToDate(order.createdAt), 'HH:mm')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {order.totalCUP > 0 && (
                        <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1 rounded-xl border border-indigo-100 w-fit">
                          <span className="font-black text-indigo-700 text-sm">{order.totalCUP.toLocaleString()}</span>
                          <span className="text-[9px] font-black text-indigo-400 uppercase">CUP</span>
                        </div>
                      )}
                      {order.totalMLC > 0 && (
                        <div className="flex items-center gap-2 bg-emerald-50/50 px-3 py-1 rounded-xl border border-emerald-100 w-fit">
                          <span className="font-black text-emerald-700 text-sm">{order.totalMLC.toLocaleString()}</span>
                          <span className="text-[9px] font-black text-emerald-400 uppercase">MLC</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right p-6">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all" onClick={() => handleViewDetails(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status === 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 hover:shadow-lg transition-all" 
                          onClick={() => updateStatus(order.id, 'confirmed')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {order.status === 'confirmed' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 hover:shadow-lg transition-all" 
                          onClick={() => updateStatus(order.id, 'shipped')}
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      {order.status === 'shipped' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 hover:shadow-lg transition-all" 
                          onClick={() => updateStatus(order.id, 'delivered')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-500 hover:shadow-lg transition-all" 
                          onClick={() => updateStatus(order.id, 'cancelled')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 bg-slate-50/30">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white p-6 rounded-full shadow-inner border-2 border-slate-100 text-slate-200">
                        <Search className="h-12 w-12" />
                      </div>
                      <p className="font-black text-slate-400 uppercase tracking-widest text-xs italic">{search ? "Búsqueda sin resultados" : "Historial de ventas vacío"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          {selectedOrder && (
            <div className="flex flex-col">
              <div className="bg-indigo-600 p-8 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Truck className="h-32 w-32 -mr-10 -mt-10" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md uppercase font-black text-[10px] tracking-widest px-3 py-1">Factura #{selectedOrder.id.substring(0, 8).toUpperCase()}</Badge>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter leading-none">{selectedOrder.customerName}</h3>
                  <p className="text-indigo-100 text-sm mt-3 font-medium opacity-80">Registrado el {format(safeToDate(selectedOrder.createdAt), 'EEEE, dd MMMM yyyy HH:mm', { locale: es })}</p>
                </div>
              </div>

              <div className="p-8 space-y-8 bg-white">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2 border-slate-100">Datos de Entrega</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-indigo-600">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span className="font-black text-slate-700 tracking-tight text-sm">{selectedOrder.customerPhone}</span>
                      </div>
                      <div className="flex items-start gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-indigo-600 flex-shrink-0">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black text-slate-600 uppercase italic leading-relaxed">{selectedOrder.customerAddress}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2 border-slate-100">Productos del Pedido</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-xs">{item.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Cant: {item.quantity}</span>
                              {item.packagingName && (
                                <Badge variant="secondary" className="text-[8px] h-4 px-1.5 uppercase font-black bg-indigo-50 text-indigo-600 border-none rounded">
                                  {cleanPackagingName(item.packagingName)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 text-xs tracking-tight">{ (item.price * item.quantity).toLocaleString() } {item.currency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                     <CheckCircle className="h-32 w-32 -mr-10 -mt-10" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em]">Liquidación Final</span>
                    <span className="text-sm font-medium text-slate-400">Impuestos y logística incluidos</span>
                  </div>
                  <div className="relative z-10 text-right flex flex-col gap-2">
                    {selectedOrder.totalCUP > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-3xl font-black tracking-tighter text-white">{selectedOrder.totalCUP.toLocaleString()}</span>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Pesos (CUP)</span>
                      </div>
                    )}
                    {selectedOrder.totalMLC > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-3xl font-black tracking-tighter text-emerald-400">{selectedOrder.totalMLC.toLocaleString()}</span>
                        <span className="text-[10px] font-black text-emerald-900 bg-emerald-400 px-2 rounded-full uppercase tracking-[0.3em] mt-1">Tarjeta (MLC)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <Button 
                    onClick={() => handlePrintInvoice(selectedOrder)}
                    className="rounded-[1.25rem] h-14 bg-slate-950 hover:bg-slate-900 text-white font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                  >
                    <Printer className="h-5 w-5 text-indigo-400" />
                    Imprimir Factura
                  </Button>
                  <Button 
                    onClick={() => handleSendWhatsAppInvoice(selectedOrder)}
                    className="rounded-[1.25rem] h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-95"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Enviar WhatsApp
                  </Button>
                </div>

                {selectedOrder.referralCode && (
                  <div className="mt-4">
                    <Button 
                      onClick={() => handleSendWhatsAppCommissionInvoice(selectedOrder)}
                      className="w-full rounded-[1.25rem] h-14 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 animate-in fade-in duration-300"
                    >
                      <DollarSign className="h-5 w-5" />
                      Enviar Factura de Comisión a Socio
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
