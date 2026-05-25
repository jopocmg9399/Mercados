import * as React from 'react';
import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  MessageSquare, 
  Mail, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Clock, 
  BookOpen, 
  Sparkles,
  RefreshCw,
  MessageCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  email: string;
  status: 'Nuevo' | 'En Proceso' | 'Resuelto';
  createdAt: any;
  userId: string;
  storeId?: string;
}

export default function PlatformSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Support Contacts from settings
  const [platformEmail, setPlatformEmail] = useState('soporte@pati.plaza.cu');
  const [platformWhatsapp, setPlatformWhatsapp] = useState('5350000000');

  // FAQ Accordion State (stores opened ID indexes)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // New Ticket Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Técnico');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [submitting, setSubmitting] = useState(false);

  // Listen to platform settings globally for support contacts
  useEffect(() => {
    const settingsRef = doc(db, 'platform_settings', 'global');
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.contactEmail) {
          setPlatformEmail(data.contactEmail);
        }
        if (data.contactWhatsapp) {
          setPlatformWhatsapp(data.contactWhatsapp);
        }
      }
    }, (error) => {
      console.error("Error loading platform contact settings:", error);
    });

    return () => unsubscribeSettings();
  }, []);

  // Load user support tickets
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    // Realtime query for tickets belonging strictly to current user's UID (supports rules validation)
    const q = query(
      collection(db, 'support_tickets'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      // Client-side sort descending by createdAt
      ticketList.sort((a, b) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || 0);
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || 0);
        return dateB - dateA;
      });

      setTickets(ticketList);
      setLoading(false);
    }, (error) => {
      console.error("Error loading tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Submit handler
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      toast.error('Oye asere, debes estar autenticado para enviar reportes.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        category,
        email,
        status: 'Nuevo',
        userId: user.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'support_tickets'), payload);
      toast.success('¡Reporte enviado asere! Nuestro equipo de PaTí te responderá volando.');
      
      // Reset form
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error(error);
      toast.error('Rayos, no se pudo registrar tu ticket en este momento.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancelling ticket handler
  const handleDeleteTicket = async (id: string) => {
    const confirmation = window.confirm('¿Quieres cerrar o retirar este reporte de soporte?');
    if (!confirmation) return;

    try {
      await deleteDoc(doc(db, 'support_tickets', id));
      toast.success('Reporte retirado del historial.');
    } catch (error) {
      console.error(error);
      toast.error('Error al retirar el ticket.');
    }
  };

  // FAQs mock dataset tailored for Cuban merchants
  const faqs = [
    {
      q: "¿Cómo funciona la salva y restauración en el panel de PaTí?",
      a: "¡Es súper fácil pipo! Puedes ir a Configuración o Gestión de Tiendas en tu panel y crear salvaguardas de tu base de datos instantáneamente presionando un botón. Esto respalda tus categorías, productos, proveedores, afiliados y clientes. Además, con la opción Exportar, puedes descargar un archivo JSON local en tu computadora o teléfono que puedes volver a importar cuando quieras para restaurar tu negocio."
    },
    {
      q: "¿Cómo configuro el envío dinámico y las tarifas por Kilómetro?",
      a: "En la sección de Despacho (DispatchManager), puedes estipular el costo base de envío y un precio variable adicional por kilómetro recorrido. Cuando el cliente configure su dirección usando mapas interactivos, el sistema calculará al vuelo la distancia hasta tu local y cargará el costo del envío automáticamente al carrito de compras."
    },
    {
      q: "¿El carrito de compras de PaTí se conecta automatizado con WhatsApp?",
      a: "Sí asere. Una vez que tu cliente selecciona los productos en tu catálogo web inteligente, presiona 'Enviar Pedido'. Esto genera un resumen impecable con precios, cantidades, total general y dirección, que de manera automatizada se le envía a tu número de WhatsApp de soporte empresarial para que cierres el trato."
    },
    {
      q: "¿Cómo aplico los descuentos por cantidad para mayoristas cubanos?",
      a: "En tu panel cuentas con la calculadora de descuentos por volumen. Puedes definir reglas (ej: a partir de 10 camisas baja un 15%, o más de 50 camisas baja un 30%). Esto motiva a compras en volumen y se calcula automáticamente en la web sin que tú interfieras."
    },
    {
      q: "¿Puedo operar de forma segura con mala cobertura de redes (E / 3G) en Cuba?",
      a: "¡Por supuesto! PaTí y Firestore utilizan persistencia local en caché. Si pierdes la cobertura momentáneamente, puedes seguir viendo tus pedidos de manera offline, y una vez que el móvil capture una señal estable, tus actualizaciones se sincronizan de inmediato con la nube sin pérdida alguna de datos."
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Support Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-200/30 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 dark:from-amber-950/20 dark:to-primary/10 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <HelpCircle className="h-5 w-5" />
            </span>
            <span className="font-black text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Centro de Ayuda PaTí
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
            SOPORTE DE ALTA GAMA
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed font-semibold">
            ¿Tienes alguna duda con los almacenes, pedidos o configuración de tu tienda? Consulta nuestras guías rápidas de Plaza Digital o abre un ticket de asistencia directa con el equipo técnico.
          </p>
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap md:flex-nowrap">
          {/* Cuban styled direct WhatsApp API trigger */}
          <a 
            href={`https://wa.me/${platformWhatsapp.replace(/\D/g, '')}?text=Hola%20equipo%20de%20PaT%C3%AD.%20Necesito%20asistencia%20en%20mi%20tienda%20online.`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-wider shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" /> SOPORTE WHATSAPP
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: FAQ (6 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-900 shadow-sm overflow-hidden pb-4">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Preguntas Frecuentes (FAQ)</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Manuales rápidos y saberes indispensables de PaTí.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div 
                    key={index} 
                    className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-4 flex items-center justify-between text-left gap-4 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/40 transition-colors"
                    >
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                        {faq.q}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Contacts Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-sm p-6 flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0 mt-0.5">
                <Mail className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Correo Institucional</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase select-all">{platformEmail}</p>
                <p className="text-[10px] text-slate-400 leading-snug">Escríbenos para temas de facturación y afiliaciones VIP.</p>
              </div>
            </Card>

            <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-sm p-6 flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Seguridad y Privacidad</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">Soporte Certificado</p>
                <p className="text-[10px] text-slate-400 leading-snug">Nuestras bases de datos gozan de la más alta encriptación.</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Right column: Ticket submission and history logs (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Submit ticket form */}
          <Card className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-900 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Reporte Directo</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-4502">Reporta un error, duda o sugerencia.</CardDescription>
              </div>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-400 ml-1">Título de tu Caso</Label>
                <Input 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Descuento por volumen no se refleja"
                  className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500/20 h-10 text-xs dark:bg-slate-950"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-400 ml-1">Categoría del reporte</Label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Técnico">Técnico</option>
                    <option value="Finanzas">Finanzas / Pagos</option>
                    <option value="Propuesta">Nueva Idea</option>
                    <option value="Duda">Duda general</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-400 ml-1">Email de Respuesta</Label>
                  <Input 
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tucorreo@proveedor.com"
                    className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500/20 h-10 text-xs dark:bg-slate-950"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-400 ml-1">Descripción de la situación</Label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="¡Oye asere! Cuéntanos en detalle lo que está sucediendo para que podamos darte la mejor solución..."
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[100px]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-[#F59E0B] hover:bg-[#F59E0B]/95 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-3.5 w-3.5" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Levantar Reporte de Asistencia
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* User ticket list history */}
          <Card className="rounded-[2.5rem] border-0 bg-white dark:bg-slate-900 p-8 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Tus Consultas Recientes</span>
            
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Loader2 className="animate-spin h-5 w-5 mx-auto mb-2 text-primary" />
                Cargando historial de tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
                <FileText className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                <p className="text-[9px] font-bold uppercase tracking-widest">No tienes reportes abiertos asere.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {tickets.map((t) => (
                  <div key={t.id} className="p-4 bg-slate-50/75 dark:bg-slate-950/40 rounded-2xl border dark:border-slate-850 flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase truncate" title={t.title}>{t.title}</span>
                        <Badge className={`text-[8px] font-black px-1.5 py-0.2 shrink-0 border-none ${
                          t.status === 'Nuevo' ? 'bg-amber-500 text-white' : t.status === 'En Proceso' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                        }`}>
                          {t.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2.5 text-[8px] text-slate-400 uppercase font-bold">
                        <span>{t.category}</span>
                        <span>•</span>
                        <span>{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : 'Enviando...'}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteTicket(t.id)}
                      className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56 animate-spin" />
    </svg>
  );
}
