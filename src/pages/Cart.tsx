import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Store } from "lucide-react";
import { useCart } from '../hooks/useCart';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStoreSettings } from '../hooks/useStoreSettings';
import { cn, getProxyImageUrl, cleanPackagingName } from '../lib/utils';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { toast } from "sonner";
import { Loader2, Moon, Sun } from 'lucide-react';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, totalCUP, totalMLC, count, clearCart } = useCart();
  const currentStoreId = items.length > 0 ? items[0].storeId : undefined;
  const { settings, loading: settingsLoading } = useStoreSettings(currentStoreId);
  const { theme } = useTheme();

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const s = settings!;

  if (count === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground">
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
          <div className="container flex h-20 items-center justify-between px-4 mx-auto">
            <Link to="/" className="flex items-center gap-3 group">
              {s.logo ? (
                <img src={getProxyImageUrl(s.logo)} alt={s.name} className="h-14 w-14 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                  <Store className="h-6 w-6 text-white" />
                </div>
              )}
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 container py-20 px-4 max-w-2xl mx-auto text-center flex flex-col items-center justify-center">
          <div className="bg-card h-32 w-32 rounded-[2rem] shadow-2xl shadow-primary/10 flex items-center justify-center mb-8 rotate-3">
            <ShoppingBag className="h-16 w-16 text-primary/40" />
          </div>
          <h1 className="text-4xl font-black text-foreground mb-4 tracking-tighter">Tu carrito está vacío</h1>
          <p className="text-muted-foreground mb-10 text-lg font-medium">Parece que aún no has añadido nada a tu carrito. <br/>¡Explora nuestras ofertas locales!</p>
          <Button 
            size="lg" 
            className="font-black px-10 h-14 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
            render={<Link to="/Catalog" />}
            nativeButton={false}
          >
            Explorar Catálogo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between px-4 mx-auto">
          <Link to="/" className="flex items-center gap-3 group">
            {s.logo ? (
              <img src={getProxyImageUrl(s.logo)} alt={s.name} className="h-14 w-14 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                <Store className="h-6 w-6 text-white" />
              </div>
            )}
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              className="rounded-full font-bold text-muted-foreground hover:text-primary"
              render={<Link to="/Catalog" />}
              nativeButton={false}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Seguir Comprando</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-12 px-4 max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center text-center gap-4 mb-12 px-4 focus:outline-none">
            <h1 className="text-4xl sm:text-7xl font-black text-foreground tracking-tighter leading-tight w-full">Tu Carrito</h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Badge className="px-6 py-2 rounded-full text-sm font-black bg-primary/10 text-primary border-none whitespace-nowrap shadow-sm min-w-[120px] justify-center">
                {count} {count === 1 ? 'artículo' : 'artículos'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-[11px] sm:text-xs font-black text-muted-foreground hover:text-destructive hover:bg-destructive/5 border-dashed border-muted-foreground/40 gap-2 uppercase tracking-widest px-6 h-11 rounded-2xl transition-all active:scale-95 bg-card/50 w-full sm:w-auto"
                onClick={() => {
                  if (window.confirm("¿Seguro que quieres vaciar todo el carrito, asere?")) {
                    clearCart();
                    toast.success("Carrito vaciado correctamente", {
                      description: "Se han eliminado todos los productos del carrito.",
                      icon: <Trash2 className="h-4 w-4 text-destructive" />
                    });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Vaciar Carrito
              </Button>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <Card key={`${item.productId}-${item.optionId}`} className="overflow-hidden border-none bg-card rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
                  <div className="h-24 w-24 rounded-2xl bg-muted overflow-hidden flex-shrink-0 border border-border">
                    <img 
                      src={item.image || `https://picsum.photos/seed/${item.productId}/200/200`} 
                      alt={item.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-lg text-foreground leading-tight">{item.name}</h3>
                        {item.packagingName ? (
                          <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary border-none font-bold text-[10px] uppercase tracking-widest">
                            {cleanPackagingName(item.packagingName)}
                          </Badge>
                        ) : (
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Unidad Individual</p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        onClick={() => removeFromCart(item.productId, item.optionId)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-foreground">
                          {(item.price * (item.packagingQuantity || 1) * item.quantity).toLocaleString()} <span className="text-xs uppercase">{item.currency}</span>
                        </span>
                        <div className="flex flex-col mt-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {item.quantity} {cleanPackagingName(item.packagingName) || 'unid.'} x {item.price * (item.packagingQuantity || 1)} {item.currency}
                          </span>
                          <span className="text-[10px] font-black text-indigo-500 italic mt-0.5">
                            ({item.price.toLocaleString()} {item.currency} por unidad individual física)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-muted rounded-2xl p-1.5 border border-border">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-xl bg-card shadow-sm hover:bg-primary hover:text-white transition-all"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.optionId)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-black text-base">{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-xl bg-card shadow-sm hover:bg-primary hover:text-white transition-all"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.optionId)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-28 border-none bg-card rounded-[2.5rem] shadow-xl shadow-primary/5 overflow-hidden">
              <div className="bg-primary p-6 text-primary-foreground">
                <h2 className="text-2xl font-black tracking-tighter">Resumen</h2>
                <p className="opacity-70 text-sm font-medium">Finaliza tu compra local</p>
              </div>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {totalCUP > 0 && (
                    <div className="flex justify-between items-end">
                      <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Total en CUP</span>
                      <span className="font-black text-2xl text-foreground">{totalCUP.toLocaleString()} <span className="text-xs">CUP</span></span>
                    </div>
                  )}
                  {totalMLC > 0 && (
                    <div className="flex justify-between items-end">
                      <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Total en MLC</span>
                      <span className="font-black text-2xl text-foreground">{totalMLC.toLocaleString()} <span className="text-xs">MLC</span></span>
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <div className="bg-accent/10 border border-accent/20 p-4 rounded-2xl mb-8">
                      <p className="text-[11px] text-accent-foreground font-bold leading-relaxed">
                        💡 Los pagos se coordinarán directamente con el vendedor vía WhatsApp o teléfono después de realizar el pedido.
                      </p>
                    </div>
                    <Button 
                      className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                      nativeButton={false}
                      render={<Link to="/Checkout" />}
                    >
                      Finalizar Pedido
                    </Button>
                    <p className="text-center text-[10px] text-muted-foreground mt-6 font-bold uppercase tracking-widest">
                      Compra Segura • {s.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
