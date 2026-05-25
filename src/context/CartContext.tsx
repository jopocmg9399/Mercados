import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrderItem as BaseOrderItem, Product, PackagingOption } from '../types';
import { useStoreSettings } from '../hooks/useStoreSettings';

// Extended OrderItem for cart UI and logic
export interface OrderItem extends BaseOrderItem {
  optionId: string;
  image?: string;
  originalPrice?: number;
  wholesaleTiers?: any[];
}

interface CartContextType {
  items: OrderItem[];
  addToCart: (product: Product, option?: PackagingOption, quantity?: number) => void;
  removeFromCart: (productId: string, optionId?: string) => void;
  updateQuantity: (productId: string, quantity: number, optionId?: string) => void;
  clearCart: () => void;
  totalCUP: number;
  totalMLC: number;
  count: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, option?: PackagingOption, quantity: number = 1) => {
    setItems(prev => {
      // Clear cart if adding from a different store to avoid multi-store checkout complexity
      const isDifferentStore = prev.length > 0 && prev[0].storeId !== product.storeId;
      const currentItems = isDifferentStore ? [] : prev;
      
      const packagingId = option?.id || 'base';
      const existing = currentItems.find(i => i.productId === product.id && i.optionId === packagingId);
      
      const unitsPerPkg = option?.quantity || 1;
      let unitPrice = product.price;

      const totalQuantity = existing ? existing.quantity + quantity : quantity;

      const tiersToUse = (option && option.wholesaleTiers && option.wholesaleTiers.length > 0)
        ? option.wholesaleTiers
        : (packagingId === 'base' && product.wholesaleTiers && product.wholesaleTiers.length > 0 ? product.wholesaleTiers : []);

      if (tiersToUse.length > 0) {
        const sortedTiers = [...tiersToUse].sort((a, b) => b.minPackages - a.minPackages);
        const reachedTier = sortedTiers.find(t => totalQuantity >= t.minPackages);
        unitPrice = reachedTier ? reachedTier.pricePerUnit : product.price;
      }

      if (existing) {
        return currentItems.map(i => i.productId === product.id && i.optionId === packagingId
          ? { ...i, quantity: totalQuantity, price: unitPrice }
          : i
        );
      }
      
      return [...currentItems, {
        productId: product.id,
        storeId: product.storeId,
        name: product.name,
        price: unitPrice,
        currency: product.currency,
        quantity,
        optionId: packagingId,
        packagingName: option?.name,
        packagingQuantity: unitsPerPkg,
        image: product.image,
        originalPrice: product.price,
        wholesaleTiers: tiersToUse
      }];
    });
  };

  const removeFromCart = (productId: string, optionId?: string) => {
    setItems(prev => prev.filter(i => !(i.productId === productId && i.optionId === (optionId || 'base'))));
  };

  const updateQuantity = (productId: string, quantity: number, optionId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, optionId);
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.productId === productId && i.optionId === (optionId || 'base')) {
        let unitPrice = i.originalPrice ?? i.price;
        const tiersToUse = i.wholesaleTiers || [];
        if (tiersToUse.length > 0) {
          const sortedTiers = [...tiersToUse].sort((a, b) => b.minPackages - a.minPackages);
          const reachedTier = sortedTiers.find(t => quantity >= t.minPackages);
          unitPrice = reachedTier ? reachedTier.pricePerUnit : (i.originalPrice ?? i.price);
        }
        return { ...i, quantity, price: unitPrice };
      }
      return i;
    }));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('cart');
  };

  const { settings } = useStoreSettings();

  const totalCUP = items
    .reduce((sum, i) => {
      const itemSubtotal = i.price * (i.packagingQuantity || 1) * i.quantity;
      if (i.currency === 'CUP') return sum + itemSubtotal;
      
      // If item is in another currency, convert it to CUP using exchange rates
      if (settings?.exchangeRates && settings.exchangeRates[i.currency]) {
        return sum + (itemSubtotal * settings.exchangeRates[i.currency]);
      }
      return sum;
    }, 0);

  const totalMLC = items
    .reduce((sum, i) => {
      const itemSubtotal = i.price * (i.packagingQuantity || 1) * i.quantity;
      if (i.currency === 'MLC' || i.currency === 'USD' || i.currency === 'EUR' || i.currency === 'ZELLE') {
        // If the item is already in one of these, we keep it as is for the "MLC" total 
        // (which is really a non-CUP total in this app's logic)
        return sum + itemSubtotal;
      }
      // If item is in CUP, we might want to show its MLC equivalent? 
      // For now, let's keep the current logic where totalMLC only sums non-CUP items
      return sum;
    }, 0);

  const count = items.length;

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalCUP,
      totalMLC,
      count
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
