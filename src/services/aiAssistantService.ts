import { Product } from "../types";

export async function getAssistantResponse(
  userMessage: string, 
  products: Product[], 
  chatHistory: { role: 'user' | 'model', parts: { text: string }[] }[],
  storeInfo?: any
) {
  try {
    const response = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userMessage,
        products,
        chatHistory,
        storeInfo
      }),
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.text) {
      throw new Error("Respuesta vacía del servidor");
    }

    return data.text;
  } catch (error) {
    console.error("Error calling AI API route:", error);
    return "Oye, disculpa, mi cerebro de IA está un poco lento ahora mismo. ¿Podrías repetirme la pregunta en un momento?";
  }
}
