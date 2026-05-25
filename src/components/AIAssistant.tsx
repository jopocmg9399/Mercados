import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { getAssistantResponse } from '../services/aiAssistantService';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AIAssistantProps {
  products: Product[];
  storeInfo?: any;
}

export default function AIAssistant({ products, storeInfo }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '¡Buen día! Es un placer saludarle. Soy PaTí, su asistente personal. ¿En qué puedo ayudarle hoy para que su experiencia sea excelente?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    // Prepare history for Gemini
    const chatHistory = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const response = await getAssistantResponse(userMessage, products, chatHistory, storeInfo);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[350px] sm:w-[400px]"
          >
            <Card className="shadow-2xl border-none rounded-3xl overflow-hidden bg-white/95 backdrop-blur-md">
              <CardHeader className="bg-primary p-4 text-white flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black tracking-tight">Asistente PaTí</CardTitle>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">En línea ahora</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsOpen(false)}
                  className="rounded-full hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                            msg.role === 'user' ? 'bg-slate-100' : 'bg-primary/10'
                          }`}>
                            {msg.role === 'user' ? <User className="h-4 w-4 text-slate-600" /> : <Bot className="h-4 w-4 text-primary" />}
                          </div>
                          <div className={`p-3 rounded-2xl text-sm font-medium ${
                            msg.role === 'user' 
                              ? 'bg-primary text-white rounded-tr-none' 
                              : 'bg-slate-100 text-slate-800 rounded-tl-none leading-relaxed'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl rounded-tl-none">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pensando...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex w-full items-center gap-2"
                >
                  <Input 
                    placeholder="Pregúntame algo..." 
                    className="rounded-xl border-slate-200 bg-slate-50 focus:ring-primary/20 h-10"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="rounded-xl h-10 w-10 shrink-0 shadow-lg shadow-primary/20"
                    disabled={isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative group flex items-center justify-end"
      >
        <div
          className="absolute right-full mr-4 bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 pointer-events-none"
        >
          <span className="text-sm font-black text-slate-800 tracking-tight">¿Te ayudo?</span>
          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-r border-t border-slate-100" />
        </div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            onClick={() => setIsOpen(!isOpen)}
            className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 p-0 flex items-center justify-center relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-primary group-hover:bg-primary/90 transition-colors" />
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  className="relative z-10"
                >
                  <X className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="open"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <MessageCircle className="h-6 w-6" />
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-300 animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
