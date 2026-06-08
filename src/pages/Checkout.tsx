import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ShoppingBag, User, Phone, MapPin, ReceiptText, Loader2, Store, Truck, Printer, ExternalLink, DollarSign } from "lucide-react";
import { useCart } from '../hooks/useCart';
import { useState } from 'react';
import { toast } from "sonner";
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, runTransaction, query, where, getDocs, limit, getDoc } from 'firebase/firestore';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

import { cn, getProxyImageUrl, cleanPackagingName } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const checkoutSchema = z.object({
  name: z.string().min(3, 'El nombre es muy corto'),
  phone: z.string().min(8, 'El teléfono no es válido'),
  address: z.string().optional(),
  referralCode: z.string().optional(),
  notes: z.string().optional(),
  finalCustomerName: z.string().optional(),
  finalCustomerPhone: z.string().optional(),
  finalCustomerAddress: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, totalCUP, totalMLC, clearCart } = useCart();
  const currentStoreId = items.length > 0 ? items[0].storeId : undefined;
  const { settings, store, loading: settingsLoading } = useStoreSettings(currentStoreId);
  const catalogPath = store?.slug ? `/store/${store.slug}` : '/';
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [formData, setFormData] = useState<CheckoutForm | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedZone, setSelectedZone] = useState<{ name: string, price: number } | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  });

  const s = settings || {
    name: '',
    whatsappNumber: '',
    homeDeliveryEnabled: false,
    homeDeliveryPlaces: '',
    homeDeliveryPrice: 0,
    homeDeliveryPriceType: 'fixed',
    homeDeliveryZones: [],
    mainCurrency: 'CUP',
    enabledCurrencies: ['CUP'],
    affiliateSystemEnabled: false,
    affiliateMode: 'recommendation'
  };

  const handlesSetDeliveryMethodCustom = (method: 'pickup' | 'delivery') => {
    setDeliveryMethod(method);
    if (method === 'pickup') {
      const currentAddress = getValues('address');
      if (!currentAddress || currentAddress.trim() === '') {
        setValue('address', 'Recogida en tienda');
      }
    } else {
      const currentAddress = getValues('address');
      if (currentAddress === 'Recogida en tienda') {
        setValue('address', '');
      }
    }
  };

  const getDeliveryCost = () => {
    if (deliveryMethod !== 'delivery') return 0;
    if (s.homeDeliveryPriceType === 'fixed') return s.homeDeliveryPrice || 0;
    if (s.homeDeliveryPriceType === 'by_zone') return selectedZone ? selectedZone.price : 0;
    return 0; // 'consult' is 0
  };

  const isMLCPrice = s.mainCurrency !== 'CUP';
  const deliveryCostCUP = (!isMLCPrice) ? getDeliveryCost() : 0;
  const deliveryCostMLC = (isMLCPrice) ? getDeliveryCost() : 0;

  const finalTotalCUP = totalCUP + deliveryCostCUP;
  const finalTotalMLC = totalMLC + deliveryCostMLC;

  const handlePrintInvoice = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor, permite las ventanas emergentes para poder imprimir.');
      return;
    }

    const itemsRows = order.items.map((item: any) => `
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
            <h2>${s.name || 'FACTURA DE COMPRA'}</h2>
            <div class="date">Factura #${order.id.substring(0, 8).toUpperCase()} - ${new Date().toLocaleDateString('es-ES')}</div>
            
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

  const handleSendWhatsAppInvoice = (order: any) => {
    const isDrop = order.affiliateMode === 'direct_sale' && order.managerName;
    
    // Create clean, padded text rows for products
    const itemsText = order.items.map((item: any) => {
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
      `🛒 *Tienda:*    ${s.name}`,
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
    
    // For Checkout (client perspective), send order details to the Store Owner's WhatsApp
    const targetPhone = s.whatsappNumber ? s.whatsappNumber : order.customerPhone;
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const prefixedPhone = cleanPhone.length === 8 ? `53${cleanPhone}` : cleanPhone;
    
    window.open(`https://wa.me/${prefixedPhone}?text=${encodedText}`, '_blank');
  };

  const handleSendWhatsAppCommissionInvoice = (order: any) => {
    const rate = s.commissionRate || 5;
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
      `🛒 *Tienda:*           ${s.name}`,
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

    // Target Phone is the manager's phone, or the customer's phone if there is no specific managerPhone
    const targetPhone = order.managerPhone || order.customerPhone || s.whatsappNumber || '';
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const prefixedPhone = cleanPhone.length === 8 ? `53${cleanPhone}` : cleanPhone;

    window.open(`https://wa.me/${prefixedPhone}?text=${encodedText}`, '_blank');
  };

  const onSubmit = (data: CheckoutForm) => {
    if (items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    const isDrop = s.affiliateSystemEnabled && s.affiliateMode === 'direct_sale';

    if (isDrop) {
      if (!data.referralCode || data.referralCode.trim() === '') {
        toast.error("Por favor, ingrese su Código de Socio / Gestor.");
        return;
      }
      if (!data.finalCustomerName || data.finalCustomerName.trim().length < 3) {
        toast.error("Por favor, ingrese el Nombre Completo del Cliente Final.");
        return;
      }
      if (!data.finalCustomerPhone || data.finalCustomerPhone.trim().length < 8) {
        toast.error("Por favor, ingrese el Teléfono del Cliente Final.");
        return;
      }
      if (deliveryMethod === 'delivery' && (!data.finalCustomerAddress || data.finalCustomerAddress.trim().length < 5)) {
        toast.error("Por favor, ingrese la Dirección de Entrega del Cliente Final.");
        return;
      }
      if (deliveryMethod === 'pickup' && (!data.finalCustomerAddress || data.finalCustomerAddress.trim() === '')) {
        data.finalCustomerAddress = "Recogida en tienda";
      }
      // Populate standard address field with final Customer address to satisfy downstream systems
      data.address = data.finalCustomerAddress;
    } else {
      if (deliveryMethod === 'delivery' && (!data.address || data.address.trim().length < 5)) {
        toast.error("Por favor, ingrese la Dirección de Entrega completa.");
        return;
      }
      if (deliveryMethod === 'pickup') {
        data.address = "Recogida en tienda";
      }
    }

    setFormData(data);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!formData || isSubmitting || !currentStoreId) return;

    setIsSubmitting(true);
    let completedOrderObj: any = null;
    try {
      // Retrieve platform-wide fidelity category thresholds (anti-inflation config)
      let vipThresholdCUP = 15000;
      let vipThresholdMLC = 150;
      let vipThresholdOrders = 10;
      let oroThresholdCUP = 6000;
      let oroThresholdMLC = 60;
      let oroThresholdOrders = 5;
      let plataThresholdCUP = 2000;
      let plataThresholdMLC = 20;
      let plataThresholdOrders = 2;

      try {
        const platDoc = await getDoc(doc(db, 'platform_settings', 'global'));
        if (platDoc.exists()) {
          const pData = platDoc.data();
          vipThresholdCUP = pData.vipMinCUP ?? 15000;
          vipThresholdMLC = pData.vipMinMLC ?? 150;
          vipThresholdOrders = pData.vipMinOrders ?? 10;
          oroThresholdCUP = pData.oroMinCUP ?? 6000;
          oroThresholdMLC = pData.oroMinMLC ?? 60;
          oroThresholdOrders = pData.oroMinOrders ?? 5;
          plataThresholdCUP = pData.plataMinCUP ?? 2000;
          plataThresholdMLC = pData.plataMinMLC ?? 20;
          plataThresholdOrders = pData.plataMinOrders ?? 2;
        }
      } catch (e) {
        console.error("No se pudieron cargar los parámetros globales de fidelidad, asere. Usando por defecto.", e);
      }

      // Support Dropshipping: distinguish between buyer (gestor) and final customer (recipient)
      const isDropshipping = s.affiliateSystemEnabled && s.affiliateMode === 'direct_sale';

      const customerPhone = (isDropshipping && formData.finalCustomerPhone) 
        ? formData.finalCustomerPhone 
        : formData.phone;
        
      const customerName = (isDropshipping && formData.finalCustomerName)
        ? formData.finalCustomerName
        : formData.name;
        
      const customerAddress = (isDropshipping && formData.finalCustomerAddress)
        ? formData.finalCustomerAddress
        : formData.address;

      // Look up client by phone number first
      const clientQuery = query(
        collection(db, 'clients'),
        where('storeId', '==', currentStoreId),
        where('phone', '==', customerPhone),
        limit(1)
      );
      const clientSnapshot = await getDocs(clientQuery);

      await runTransaction(db, async (transaction) => {
        const orderRef = doc(collection(db, 'orders'));
        const orderData = {
          storeId: currentStoreId,
          customerName,
          customerPhone,
          customerAddress,
          notes: formData.notes || '',
          items: items.map(item => ({
            productId: item.productId,
            storeId: item.storeId,
            name: item.name,
            price: item.price,
            currency: item.currency,
            quantity: item.quantity,
            packagingName: item.packagingName || null,
            packagingQuantity: item.packagingQuantity || null
          })),
          totalCUP: finalTotalCUP,
          totalMLC: finalTotalMLC,
          deliveryMethod,
          deliveryCost: deliveryMethod === 'delivery' 
            ? (s.homeDeliveryPriceType === 'fixed' 
                ? (s.homeDeliveryPrice || 0) 
                : (s.homeDeliveryPriceType === 'by_zone'
                    ? (selectedZone ? selectedZone.price : 0)
                    : 'consult'))
            : 0,
          deliveryZoneName: (deliveryMethod === 'delivery' && s.homeDeliveryPriceType === 'by_zone' && selectedZone) ? selectedZone.name : null,
          deliveryCostCurrency: s.mainCurrency || 'CUP',
          status: 'pending',
          createdAt: serverTimestamp(),
          paymentMethod: 'coordinar',
          referralCode: formData.referralCode || null,
          affiliateMode: s.affiliateMode || 'recommendation',
          managerName: isDropshipping ? formData.name : undefined,
          managerPhone: isDropshipping ? formData.phone : undefined,
        };

        completedOrderObj = {
          id: orderRef.id,
          ...orderData,
          createdAt: { seconds: Math.floor(Date.now() / 1000) }
        };

        // 1. Calculate and save/update client info
        let clientRef;
        let nextOrders = 1;
        let nextSpentCUP = finalTotalCUP;
        let nextSpentMLC = finalTotalMLC;
        let isNewClient = true;

        if (!clientSnapshot.empty) {
          const clientDoc = clientSnapshot.docs[0];
          clientRef = doc(db, 'clients', clientDoc.id);
          const clientData = clientDoc.data();
          nextOrders = (clientData.totalOrders || 0) + 1;
          nextSpentCUP = (clientData.totalSpentCUP || 0) + finalTotalCUP;
          nextSpentMLC = (clientData.totalSpentMLC || 0) + finalTotalMLC;
          isNewClient = false;
        } else {
          clientRef = doc(collection(db, 'clients'));
        }

        const calculateTier = (cup: number, mlc: number, count: number) => {
          if (cup > vipThresholdCUP || mlc > vipThresholdMLC || count >= vipThresholdOrders) return 'VIP';
          if (cup > oroThresholdCUP || mlc > oroThresholdMLC || count >= oroThresholdOrders) return 'Oro';
          if (cup > plataThresholdCUP || mlc > plataThresholdMLC || count >= plataThresholdOrders) return 'Plata';
          return 'Bronce';
        };

        const clientTier = calculateTier(nextSpentCUP, nextSpentMLC, nextOrders);

        const clientPayload: any = {
          storeId: currentStoreId,
          name: customerName,
          contactName: customerName,
          phone: customerPhone,
          address: customerAddress,
          active: true,
          totalOrders: nextOrders,
          totalSpentCUP: nextSpentCUP,
          totalSpentMLC: nextSpentMLC,
          tier: clientTier,
          lastPurchaseAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (isNewClient) {
          clientPayload.createdAt = serverTimestamp();
          clientPayload.notes = 'Creado automáticamente al realizar compra';
          clientPayload.categories = [];
          transaction.set(clientRef, clientPayload);
        } else {
          transaction.update(clientRef, clientPayload);
        }

        // 2. Save the order
        transaction.set(orderRef, orderData);
        
        // 2. Update stock for each item
        for (const item of items) {
          const productRef = doc(db, 'products', item.productId);
          const multiplier = Number(item.packagingQuantity || 1);
          const unitsToSubtract = Number(item.quantity) * multiplier;
          
          transaction.update(productRef, {
            stock: increment(-unitsToSubtract),
            lastStockUpdate: serverTimestamp()
          });

          // Also record as an outgoing inventory entry
          const entryRef = doc(collection(db, 'inventory_entries'));
          transaction.set(entryRef, {
            storeId: currentStoreId,
            productId: item.productId,
            productName: item.name,
            type: 'out',
            quantity: Number(item.quantity),
            multiplier: multiplier,
            totalUnits: unitsToSubtract,
            formatName: item.packagingName || 'Unidad',
            notes: `Venta: Pedido automático`,
            createdAt: serverTimestamp(),
            currency: item.currency,
            cost: 0 
          });
        }
      });
      
      setIsConfirmModalOpen(false);
      if (completedOrderObj) {
        setPlacedOrder(completedOrderObj);
      }
      setIsSuccess(true);
      clearCart();
      toast.success("¡Pedido realizado e inventario actualizado!");
    } catch (error) {
      console.error("Checkout Error:", error);
      setIsSubmitting(false);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
      } catch (err) {
        console.error("Firestore error logged:", err);
      }
      toast.error("Hubo un error al procesar tu pedido. Por favor intenta de nuevo.");
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
          <div className="container flex h-20 items-center justify-between px-4 mx-auto">
            <Link to="/" className="flex items-center gap-3 group">
            {s.logo ? (
              <img src={getProxyImageUrl(s.logo)} alt={s.name} className="h-14 w-14 object-contain" referrerPolicy="no-referrer" />
            ) : (
                <div className="bg-primary p-2 rounded-xl">
                  <Store className="h-6 w-6 text-white" />
                </div>
              )}
            </Link>
          </div>
        </header>
        <div className="flex-1 container py-20 px-4 max-w-md mx-auto text-center flex flex-col items-center justify-center">
          <div className="bg-green-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-2 tracking-tighter italic">¡Pedido Recibido!</h1>
          <p className="text-muted-foreground mb-6 font-medium">
            Gracias por tu compra en {s.name}. Nos pondremos en contacto contigo pronto por WhatsApp ({s.whatsappNumber}) o teléfono para coordinar el pago y la entrega.
          </p>

          {placedOrder && (
            <Card className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 mb-8 text-left bg-white dark:bg-slate-950 shadow-sm animate-in fade-in duration-300">
              <div className="flex justify-between items-start border-b pb-4 mb-4 border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest leading-none mb-1">Tu Factura</h3>
                  <span className="font-black text-[10px] text-primary uppercase">Orden #{placedOrder.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <Badge className="bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border-none font-black text-[9px] uppercase tracking-wider py-1 px-2 rounded-lg">RECIBIDO</Badge>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-6 border-b pb-4 border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[9px] font-black tracking-wider">Cliente:</span>
                  <span className="text-slate-900 dark:text-white uppercase font-black">{placedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase text-[9px] font-black tracking-wider">Teléfono:</span>
                  <span className="font-black text-slate-900 dark:text-white">{placedOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between text-right">
                  <span className="text-slate-400 uppercase text-[9px] font-black tracking-wider shrink-0 mr-4">Dirección:</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase italic text-[11px] max-w-[200px] truncate">{placedOrder.customerAddress}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button 
                  onClick={() => handlePrintInvoice(placedOrder)}
                  className="rounded-xl h-11 bg-slate-950 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 shadow"
                >
                  <Printer className="h-4 w-4 text-indigo-405" />
                  Imprimir
                </Button>
                <Button 
                  onClick={() => handleSendWhatsAppInvoice(placedOrder)}
                  className="rounded-xl h-11 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 shadow"
                >
                  <ExternalLink className="h-4 w-4" />
                  Enviar WhatsApp
                </Button>
              </div>

              {placedOrder.referralCode && (
                <div className="mt-3">
                  <Button 
                    onClick={() => handleSendWhatsAppCommissionInvoice(placedOrder)}
                    className="w-full rounded-xl h-11 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 duration-200"
                  >
                    <DollarSign className="h-4 w-4" />
                    Enviar Factura de Comisión a Socio
                  </Button>
                </div>
              )}
            </Card>
          )}

          <Button 
            size="lg" 
            className="w-full font-black h-14 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all mt-6"
            nativeButton={false}
            render={<Link to={catalogPath} />}
          >
            Volver al Catálogo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md mb-8">
        <div className="container flex h-20 items-center justify-between px-4 mx-auto">
          <Link to="/" className="flex items-center gap-3 group">
            {s.logo ? (
              <img src={getProxyImageUrl(s.logo)} alt={s.name} className="h-14 w-14 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="bg-primary p-2 rounded-xl">
                <Store className="h-6 w-6 text-white" />
              </div>
            )}
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary"
              nativeButton={false}
              render={<Link to="/Cart" />}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container px-4 max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-4xl font-black text-foreground tracking-tighter">Finalizar Compra</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <Card className="border-none bg-card shadow-sm rounded-[2rem]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-black">
                  {s.affiliateSystemEnabled && s.affiliateMode === 'direct_sale' ? 'Tus Datos (Gestor / Socio)' : 'Tus Datos'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      {s.affiliateSystemEnabled && s.affiliateMode === 'direct_sale' ? 'Tu Nombre (Gestor)' : 'Nombre Completo'}
                    </Label>
                    <Input 
                      id="name" 
                      placeholder={s.affiliateSystemEnabled && s.affiliateMode === 'direct_sale' ? "Tu nombre o apodo de socio" : "Ej. Juan Pérez"} 
                      {...register('name')}
                      className={cn(
                        "h-12 bg-muted/50 border-border rounded-xl px-4 font-medium",
                        errors.name && 'border-destructive ring-destructive/20'
                      )}
                    />
                    {errors.name && <p className="text-[10px] text-destructive font-bold ml-1">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      {s.affiliateSystemEnabled && s.affiliateMode === 'direct_sale' ? 'Tu Teléfono (Gestor)' : 'Teléfono / WhatsApp'}
                    </Label>
                    <Input 
                      id="phone" 
                      placeholder="Ej. +53 52345678" 
                      {...register('phone')}
                      className={cn(
                        "h-12 bg-muted/50 border-border rounded-xl px-4 font-medium",
                        errors.phone && 'border-destructive ring-destructive/20'
                      )}
                    />
                    {errors.phone && <p className="text-[10px] text-destructive font-bold ml-1">{errors.phone.message}</p>}
                  </div>
                  {!(s.affiliateSystemEnabled && s.affiliateMode === 'direct_sale') && (
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Dirección de Entrega</Label>
                      <Input 
                        id="address" 
                        placeholder="Calle, No, Entre calles, Municipio" 
                        {...register('address')}
                        className={cn(
                          "h-12 bg-muted/50 border-border rounded-xl px-4 font-medium",
                          errors.address && 'border-destructive ring-destructive/20'
                        )}
                      />
                      {errors.address && <p className="text-[10px] text-destructive font-bold ml-1">{errors.address.message}</p>}
                      <p className="text-[10px] text-muted-foreground font-semibold italic ml-1">
                        {deliveryMethod === 'pickup' 
                          ? "* Para recogida en tienda, auto-completamos como 'Recogida en tienda'." 
                          : "* Especifica tu dirección completa para la entrega a domicilio."}
                      </p>
                    </div>
                  )}

                  {s.homeDeliveryEnabled && (
                    <div className="space-y-3 p-5 bg-muted/30 border border-border rounded-2xl">
                      <Label className="text-xs font-black uppercase tracking-widest text-foreground ml-1">Método de Envío / Entrega</Label>
                      
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <button
                          type="button"
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all font-bold text-xs text-center gap-2",
                            deliveryMethod === 'pickup'
                              ? "bg-primary/5 border-primary text-primary"
                              : "bg-background border-border text-muted-foreground hover:border-slate-200"
                          )}
                          onClick={() => handlesSetDeliveryMethodCustom('pickup')}
                        >
                          <MapPin className="h-4 w-4" />
                          <span>Recogida en Tienda</span>
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Gratis</span>
                        </button>
                        
                        <button
                          type="button"
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all font-bold text-xs text-center gap-2",
                            deliveryMethod === 'delivery'
                              ? "bg-[#F59E0B]/5 border-[#F59E0B] text-[#F59E0B]"
                              : "bg-background border-border text-muted-foreground hover:border-slate-200"
                          )}
                          onClick={() => handlesSetDeliveryMethodCustom('delivery')}
                        >
                          <Truck className="h-4 w-4" />
                          <span>A Domicilio</span>
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-80">
                            {s.homeDeliveryPriceType === 'fixed' 
                              ? `$${(s.homeDeliveryPrice || 0).toLocaleString()} ${s.mainCurrency || 'CUP'}` 
                              : (s.homeDeliveryPriceType === 'by_zone' ? 'Varias Zonas' : 'Por Consultar')}
                          </span>
                        </button>
                      </div>

                      {deliveryMethod === 'delivery' && s.homeDeliveryPriceType === 'by_zone' && s.homeDeliveryZones && s.homeDeliveryZones.length > 0 && (
                        <div className="mt-4 space-y-2 p-4 bg-[#F59E0B]/5 rounded-xl border border-[#F59E0B]/15 animate-in slide-in-from-top-2 duration-200">
                          <Label htmlFor="delivery-zone" className="text-[10px] font-black uppercase tracking-widest text-[#F59E0B] ml-1">Elegir Zona / Reparto de Entrega</Label>
                          <select
                            id="delivery-zone"
                            className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-black uppercase text-foreground focus:ring-2 focus:ring-[#F59E0B] outline-none"
                            value={selectedZone?.name || ''}
                            onChange={(e) => {
                              const zone = (s.homeDeliveryZones || []).find((z: any) => z.name === e.target.value);
                              setSelectedZone(zone || null);
                            }}
                          >
                            <option value="">-- Elige tu Zona / Municipio --</option>
                            {(s.homeDeliveryZones || []).map((zone: any) => (
                              <option key={zone.name} value={zone.name}>
                                {zone.name} (+${zone.price.toLocaleString()} {s.mainCurrency || 'CUP'})
                              </option>
                            ))}
                          </select>
                          <p className="text-[9px] text-[#F59E0B] font-bold uppercase italic px-1">
                            * El costo de esta zona se sumará automáticamente al total de tu factura.
                          </p>
                        </div>
                      )}

                      {deliveryMethod === 'delivery' && (
                        <div className="mt-4 p-4 bg-[#F59E0B]/5 rounded-xl text-xs space-y-2 border border-[#F59E0B]/10 animate-in fade-in duration-200">
                          <span className="font-black text-[9px] uppercase tracking-widest text-[#F59E0B] block">Cobertura de Envío:</span>
                          <p className="text-muted-foreground font-medium whitespace-pre-line leading-relaxed italic">
                            {s.homeDeliveryPriceType === 'by_zone' && s.homeDeliveryZones && s.homeDeliveryZones.length > 0
                              ? s.homeDeliveryZones.map((z: any) => `${z.name} ($${z.price})`).join(', ')
                              : `"${s.homeDeliveryPlaces || 'Zonas a consultar con el vendedor'}"`}
                          </p>
                          {s.homeDeliveryPriceType === 'consult' && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase mt-2">
                              * El costo exacto se definirá vía WhatsApp al coordinar la compra.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {s.affiliateSystemEnabled && (
                    <div className="space-y-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                      <div>
                        <Label htmlFor="referralCode" className="text-[10px] font-black uppercase tracking-widest text-amber-600 ml-1">
                          {s.affiliateMode === 'direct_sale' ? 'Código de Socio / Gestor' : 'Código de Invitación (Opcional)'}
                        </Label>
                        <Input 
                          id="referralCode" 
                          placeholder={s.affiliateMode === 'direct_sale' ? "TU CÓDIGO DE GESTOR" : "Socio123..."}
                          {...register('referralCode')}
                          className="h-10 bg-white border-amber-100 rounded-xl px-4 font-bold uppercase text-xs mt-1"
                        />
                        <p className="text-[9px] text-amber-500 font-bold uppercase italic px-1 mt-1">
                          {s.affiliateMode === 'direct_sale' 
                            ? '* Obligatorio si compras para un cliente final' 
                            : '* Introduce el código si alguien te recomendó'}
                        </p>
                      </div>

                      {s.affiliateMode === 'direct_sale' && (
                        <div className="space-y-3 pt-3 border-t border-amber-100/50 dark:border-amber-900/50 animate-in fade-in duration-300">
                          <span className="text-xs font-black uppercase tracking-widest text-[#F59E0B] block">
                            📦 Datos del Cliente Final (Entrega)
                          </span>
                          
                          <div className="space-y-1">
                            <Label htmlFor="finalCustomerName" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                              Nombre Completo del Cliente Final
                            </Label>
                            <Input 
                              id="finalCustomerName" 
                              placeholder="Ej. María Rodríguez" 
                              {...register('finalCustomerName')}
                              className="h-10 bg-white border-slate-200 rounded-xl px-4 font-bold text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="finalCustomerPhone" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                              Teléfono / WhatsApp de Entrega
                            </Label>
                            <Input 
                              id="finalCustomerPhone" 
                              placeholder="Ej. +53 58765432" 
                              {...register('finalCustomerPhone')}
                              className="h-10 bg-white border-slate-200 rounded-xl px-4 font-bold text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="finalCustomerAddress" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                              Dirección de Entrega del Cliente Final
                            </Label>
                            <Input 
                              id="finalCustomerAddress" 
                              placeholder="Calle, No, Entre calles, Municipio (o especifique recogida)" 
                              {...register('finalCustomerAddress')}
                              className="h-10 bg-white border-slate-200 rounded-xl px-4 font-bold text-xs"
                            />
                            <p className="text-[9px] text-slate-400 font-semibold italic ml-1 leading-tight">
                              * Donde la tienda debe entregar. Deja vacío si se recoge directamente.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Notas adicionales (opcional)</Label>
                    <Input 
                      id="notes" 
                      placeholder="Ej. Tocar el timbre fuerte" 
                      {...register('notes')}
                      className="h-12 bg-muted/50 border-border rounded-xl px-4 font-medium"
                    />
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-none bg-accent/5 shadow-sm rounded-[2rem]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black uppercase tracking-tighter text-accent-foreground">Información de Pago</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-4">
                {totalCUP > 0 && (
                  <div className="space-y-2">
                    <p className="font-black text-foreground border-b border-accent/20 pb-1 text-xs uppercase tracking-widest">Pagos en CUP:</p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">{s.cupPaymentInstructions}</p>
                  </div>
                )}
                {totalMLC > 0 && (
                  <div className="space-y-2">
                    <p className="font-black text-foreground border-b border-accent/20 pb-1 text-xs uppercase tracking-widest">Pagos en MLC/USD/EUR:</p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">{s.mlcPaymentInstructions}</p>
                  </div>
                )}
                {s.enabledCurrencies?.includes('ZELLE') && s.zelleInstructions && (
                  <div className="space-y-2">
                    <p className="font-black text-foreground border-b border-accent/20 pb-1 text-xs uppercase tracking-widest">Procedimiento ZELLE:</p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">{s.zelleInstructions}</p>
                  </div>
                )}
                <div className="pt-4 border-t border-accent/10">
                  <p className="font-bold text-foreground mb-2 text-sm uppercase tracking-tighter italic">
                    ¿Cómo funciona el proceso?
                  </p>
                  <p className="text-xs leading-relaxed">
                    Al confirmar, recibiremos tu solicitud. Te contactaremos por <span className="font-bold text-primary">WhatsApp ({s.whatsappNumber})</span> para confirmar la disponibilidad y coordinar la entrega.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none bg-card shadow-xl rounded-[2.5rem] overflow-hidden sticky top-28">
              <div className="bg-primary p-6 text-primary-foreground">
                <CardTitle className="text-2xl font-black tracking-tighter">Resumen del Pedido</CardTitle>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.packagingName || 'base'}`} className="flex justify-between items-start gap-4">
                      <div className="flex flex-col">
                        <span className="text-foreground font-bold text-sm leading-tight">
                          {item.quantity}x {item.name}
                        </span>
                        {item.packagingName && (
                          <span className="text-[9px] text-primary font-black uppercase tracking-widest mt-0.5">
                            {cleanPackagingName(item.packagingName)}
                          </span>
                        )}
                      </div>
                      <span className="font-black text-sm whitespace-nowrap">
                        {(item.price * (item.packagingQuantity || 1) * item.quantity).toLocaleString()} <span className="text-[9px]">{item.currency}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-6 space-y-3">
                  {deliveryMethod === 'delivery' && (
                    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground pb-2 border-b border-dashed border-border/50 animate-in fade-in">
                      <span>Costo de Envío {selectedZone ? `(${selectedZone.name})` : ''}</span>
                      <span>
                        {s.homeDeliveryPriceType === 'fixed' 
                          ? `${(s.homeDeliveryPrice || 0).toLocaleString()} ${s.mainCurrency || 'CUP'}`
                          : (s.homeDeliveryPriceType === 'by_zone'
                              ? (selectedZone 
                                  ? `${selectedZone.price.toLocaleString()} ${s.mainCurrency || 'CUP'}`
                                  : 'Elige una Zona')
                              : 'A consultar')}
                      </span>
                    </div>
                  )}

                  {finalTotalCUP > 0 && (
                    <div className="flex justify-between items-center font-black text-xl">
                      <span className="text-muted-foreground text-xs uppercase tracking-widest">Total CUP</span>
                      <span className="text-foreground">{finalTotalCUP.toLocaleString()} <span className="text-sm">CUP</span></span>
                    </div>
                  )}
                  {finalTotalMLC > 0 && (
                    <div className="flex justify-between items-center font-black text-xl">
                      <span className="text-muted-foreground text-xs uppercase tracking-widest">Total MLC</span>
                      <span className="text-foreground">{finalTotalMLC.toLocaleString()} <span className="text-sm">MLC</span></span>
                    </div>
                  )}
                  {finalTotalCUP === 0 && finalTotalMLC === 0 && (
                    <div className="flex justify-between items-center font-black text-xl">
                      <span className="text-muted-foreground text-xs uppercase tracking-widest">Total</span>
                      <span className="text-foreground">0 <span className="text-sm">CUP</span></span>
                    </div>
                  )}
                </div>
                <Button 
                  form="checkout-form"
                  type="submit"
                  className="w-full h-14 text-lg font-black mt-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
                </Button>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Compra Segura • {s.name}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Resumen de tu Pedido</DialogTitle>
            <DialogDescription>
              Por favor, verifica que toda la información sea correcta antes de finalizar.
            </DialogDescription>
          </DialogHeader>

          {formData && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="h-3 w-3" /> Datos del Cliente y Envío
                  </h4>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{formData.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3 w-3" /> {formData.phone}
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="h-3 w-3 mt-1" /> {formData.address}
                    </div>
                    {s.homeDeliveryEnabled && (
                      <div className="flex items-center gap-2 text-sm text-primary font-bold pt-1 border-t border-slate-250/20 mt-1">
                        <Truck className="h-3 w-3" /> {deliveryMethod === 'delivery' ? `Domicilio: ${selectedZone ? selectedZone.name : ''}` : 'Recogida en Tienda'}
                        {deliveryMethod === 'delivery' && (
                          <span className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded ml-auto">
                            {s.homeDeliveryPriceType === 'fixed' 
                              ? `$${(s.homeDeliveryPrice || 0).toLocaleString()} ${s.mainCurrency || 'CUP'}`
                              : (s.homeDeliveryPriceType === 'by_zone'
                                  ? (selectedZone ? `$${selectedZone.price.toLocaleString()} ${s.mainCurrency || 'CUP'}` : 'Elige Zona')
                                  : 'Por Consultar')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag className="h-3 w-3" /> Productos
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        {item.packagingName && <span className="text-[10px] text-primary/70">{cleanPackagingName(item.packagingName)}</span>}
                      </div>
                      <span className="font-bold">{(item.price * (item.packagingQuantity || 1) * item.quantity).toLocaleString()} {item.currency}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-1">
                {finalTotalCUP > 0 && (
                  <div className="flex justify-between items-center text-lg font-black">
                    <span className="text-slate-900">Total CUP</span>
                    <span className="text-primary">{finalTotalCUP.toLocaleString()} CUP</span>
                  </div>
                )}
                {finalTotalMLC > 0 && (
                  <div className="flex justify-between items-center text-lg font-black">
                    <span className="text-slate-900">Total MLC</span>
                    <span className="text-primary">{finalTotalMLC.toLocaleString()} MLC</span>
                  </div>
                )}
                {finalTotalCUP === 0 && finalTotalMLC === 0 && (
                  <div className="flex justify-between items-center text-lg font-black">
                    <span className="text-slate-900">Total</span>
                    <span className="text-primary">0 CUP</span>
                  </div>
                )}
              </div>

              {formData.notes && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 italic text-xs text-amber-800">
                  <span className="font-bold flex items-center gap-1 mb-1">
                    <ReceiptText className="h-3 w-3" /> Nota:
                  </span>
                  "{formData.notes}"
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={isSubmitting}>
              Corregir Datos
            </Button>
            <Button onClick={handleConfirmOrder} disabled={isSubmitting} className="font-bold bg-primary px-8">
              {isSubmitting ? "Procesando..." : "Finalizar Compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
