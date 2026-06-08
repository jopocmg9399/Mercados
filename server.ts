import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// Aumentar límite para poder recibir imágenes en Base64
app.use(express.json({ limit: "15mb" }));

// Servir la carpeta de subidas de forma estática
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Asegurar que la carpeta de uploads exista
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Endpoint para subir imágenes de forma física a la app (Uso Global)
app.post("/api/upload", (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!base64 || !filename) {
      return res.status(400).json({ error: "Datos de carga incompletos." });
    }
    
    // Extraer base64 y guardarla
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const ext = path.extname(filename) || '.png';
    const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFilename = `${baseName}_${Date.now()}${ext}`;
    
    const filePath = path.join(uploadsDir, uniqueFilename);
    fs.writeFileSync(filePath, buffer);
    
    // URL global relativa a la app
    res.json({ url: `/uploads/${uniqueFilename}` });
  } catch (error) {
    console.error("Error al procesar subida física de imagen:", error);
    res.status(500).json({ error: "Fallo al subir la imagen física al servidor." });
  }
});

// Ruta para el análisis de inventario con IA
app.post("/api/gemini/inventory-analysis", async (req, res) => {
  try {
    const { inventory, storeId } = req.body;
    
    if (!inventory || !Array.isArray(inventory)) {
      return res.status(400).json({ error: "No hay productos para analizar." });
    }

    const prompt = `
      Actúa como un experto consultor de negocios cubano, jocoso pero profesional. 
      Analiza el inventario de esta tienda específica (ID: ${storeId || 'Tienda Local'}):
      
      ${JSON.stringify(inventory)}
      
      Tu tarea es:
      1. Identificar productos con poco stock (menos de 10) y avisar que hay que recargar para no perder ventas.
      2. Identificar productos próximos a vencer y sugerir ofertas específicas.
      3. Dar un consejo estratégico para maximizar ganancias en ESTA tienda, considerando los márgenes.
      4. Menciona algo sobre la importancia de las escalas de mayoreo si ves que hay productos caros.
      5. Terminar con una frase cubana pegajosa y motivadora.
      
      Escribe de forma clara, con puntos y una actitud positiva, dirigiéndote al dueño del negocio.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    res.json({ analysis: response.text });
  } catch (error) {
    console.error("Error en IA Analysis:", error);
    res.status(500).json({ error: "Ocurrió un error al consultar a la IA." });
  }
});

// Ruta para sugerir precios al por mayor con IA
app.post("/api/gemini/suggest-wholesale-prices", async (req, res) => {
  try {
    const { productData, tiers } = req.body;
    
    if (!productData || !tiers || !Array.isArray(tiers)) {
      return res.status(400).json({ error: "Datos incompletos para el análisis." });
    }

    const cost = Number(productData.cost) || 0;
    const basePrice = Number(productData.price) || 0;
    const currency = productData.currency || "CUP";
    const marginPercent = Number(productData.margin) || 70; // Porcentaje de margen protegido de la diferencia
    const individualWholesaleTiers = productData.individualWholesaleTiers || [];
    const packagingName = productData.packagingName || "Embalaje";
    const packagingQuantity = Number(productData.packagingQuantity) || 1;

    const baseLowestWholesale = individualWholesaleTiers.length > 0
      ? Math.min(...individualWholesaleTiers.map((t: any) => Number(t.pricePerUnit) || basePrice))
      : basePrice;

    const prompt = `
      Actúa como un experto consultor de pricing financiero y estratega de negocios en el mercado cubano del peso (CUP) y divisas.
      
      Debes evaluar de manera estricta el siguiente MODELO FINANCIERO DE MARGEN PROTEGIDO CON COLCHÓN y generar los precios de escalas ideales.
      
      IMPORTANTE: Debes tener en cuenta el precio de costo, el precio minorista regular, y las escalas de mayoreo de las UNIDADES INDIVIDUALES (si existen), de modo que el precio sugerido por unidad dentro de este formato de empaque/embalaje por mayor sea lógicamente igual o menor al precio de mayoreo de las unidades sueltas. No tiene sentido que comprar empaques enteros ofrezca un precio unitario superior al precio de mayoreo de las unidades sueltas.

      Datos del Producto de Base:
      - Nombre: ${productData.name}
      - Costo Unitario de la Unidad Individual (C): ${cost} ${currency}
      - Precio de Venta Minorista de la Unidad Individual (P): ${basePrice} ${currency}
      
      Datos del Formato de Empaque (${packagingName}):
      - Cantidad de unidades individuales por paquete: ${packagingQuantity} unidades.
      - Margen de Ganancia Protegido Deseado para este Formato: ${marginPercent}% (Esto significa que el ${marginPercent}% de la diferencia entre el precio tope P y el costo C debe quedar estrictamente protegido como ganancia mínima bajo cualquier descuento comercial. El resto (${100 - marginPercent}%) representa el presupuesto máximo absoluto para descuentos).

      Escalas de Mayoreo configuradas para la Unidad Individual (suelta):
      ${individualWholesaleTiers.length > 0 ? individualWholesaleTiers.map((t: any, i: number) => `- Escala suelta ${i + 1}: A partir de ${t.minPackages} unidades individuales, el precio es ${t.pricePerUnit} ${currency} por unidad.`).join("\n") : "- Sin escalas de mayoreo configuradas para individuales sueltas."}

      REGLAS MATEMÁTICAS INVIOLABLES DEL MODELO:
      1. Diferencia Bruta (D) = P - C = ${basePrice - cost} ${currency}
      2. Ganancia Mínima Protegida (G_prot) = D * (${marginPercent} / 100) = ${(basePrice - cost) * (marginPercent / 100)} ${currency}
      3. Presupuesto Máximo de Descuento (B_desc) = D - G_prot = ${(basePrice - cost) * (1 - marginPercent / 100)} ${currency}
      4. Los descuentos acumulativos deben de ser de números ENTEROS (sin centavos), ideal para el flujo de caja del CUP cubano.
      5. Colchón de Escalas (+2): Se debe dejar espacio para incrementar empaques o escalas con AL MENOS 2 niveles de escala adicionales sin perforar el margen de ganancia protegido G_prot.
         - Si tienes N escalas activas solicitadas, el total de niveles virtuales a proyectar es N + 2.
         - El descuento acumulativo estricto del nivel N + 2 no puede superar el Presupuesto Máximo de Descuento (B_desc).
         - Si el presupuesto B_desc (entero) es menor a N + 2, la cantidad de escalas solicitadas es MATHEMATICALLY IMPOSSIBLE de cumplir por el modelo cubano. En ese caso, debes reducir y proponer automáticamente la cantidad máxima de escalas que sí garanticen el modelo: N_proporuesto = max(1, entero(B_desc) - 2).
      6. COHERENCIA DE MAYOREO POR ENVASE:
         - El precio sugerido "pricePerUnit" representa el precio de una unidad individual DENTRO del empaque (no el precio total de la caja).
         - El "pricePerUnit" calculado para cada escala de empaques MUST BE estrictamente menor o igual al menor de los precios de mayoreo individuales (${baseLowestWholesale} ${currency}). Tiene que ser más barato (o al menos igual de barato) comprar por embalaje completo que comprar unidades sueltas con descuento de mayoreo.

      Escalas de Volumen de Empaque Solicitadas originalmente (N = ${tiers.length} escalas de ${packagingName}):
      ${tiers.map((t, i) => `- Escala ${i + 1}: A partir de ${t.minPackages} empaques (${packagingName})`).join("\n")}

      Tu tarea es:
      1. Evaluar si la cantidad de escalas solicitadas (${tiers.length}) permite el correcto cumplimiento del modelo y coherencia de mayoreo individual.
      2. Si la cantidad de escalas es inviable o si el precio baseLowestWholesale limita demasiado el margen, REDUCE y propone la cantidad máxima de escalas viables (N_propuesto).
      3. Calcular los precios unitarios sugeridos (precios de venta individuales dentro del formato de empaque entero) para cada una de las escalas resultantes.
         - Los precios deben de decrecer estrictamente (cada nivel superior compra más volumen y tiene mayor descuento y menor precio unitario).
         - El "pricePerUnit" acumulado en el mayor nivel no debe ser inferior a (Costo + Ganancia Mínima Protegida).
      4. Justifica de manera jocosa, cubana, ingeniosa pero altamente matemática al usuario el resultado, el porqué de la cantidad de niveles y cómo cuidamos su dinero frente a acaparadores o revendedores en Cuba.
 
      Responde EXCLUSIVAMENTE en formato JSON con la siguiente estructura (sin bloques de código Markdown, sin adornos):
      {
        "suggestedTiers": [
          {
            "minPackages": number,
            "pricePerUnit": number,
            "reasoning": "string"
          }
        ],
        "originalCount": ${tiers.length},
        "proposedCount": number,
        "isAdjusted": boolean,
        "cubanExplanation": "string"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Error en Wholesale Suggestion:", error);
    res.status(500).json({ error: "Ocurrió un error al consultar a la IA." });
  }
});

// Ruta para el asistente de chat PaTí (Versión Élite/Plaza Digital)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { userMessage, products, chatHistory, storeInfo } = req.body;

    const catalogSummary = products.map((p: any, idx: number) => {
      const packagingInfo = p.packagingOptions && p.packagingOptions.length > 0 
        ? p.packagingOptions.map((opt: any) => {
            const tiers = opt.wholesaleTiers && opt.wholesaleTiers.length > 0
              ? opt.wholesaleTiers.map((t: any) => `${t.minPackages}+ ${opt.name}s a ${t.pricePerUnit} ${p.currency} c/u`).join(', ')
              : 'Sin escalas definidas';
            return `${opt.name} (${opt.quantity} unid.): Escalas [${tiers}]`;
          }).join(' | ')
        : 'Solo venta por unidad';

      return `
${idx + 1}. ${p.name}
   - Categoría: ${p.category}
   - Precio Base: ${p.price} ${p.currency}
   - Stock: ${p.stock} unidades
   - Opciones Mayoreo: ${packagingInfo}
   - Descripción: ${p.description || 'Calidad garantizada'}`;
    }).join('\n');

    const systemInstruction = `
      Eres "PaTí", el Asistente Virtual de esta tienda en la "Plaza Digital Cubana". Tu misión es ayudar al cliente a encontrar lo que busca y explicarle las ventajas de comprar en este negocio.
      
      TONO Y ESTILO:
      - Habla con amabilidad, eficiencia y un toque de "chispa" cubana natural, sin chabacanería.
      - Sé profesional y respetuoso. Usa un "usted" cordial.
      - NUNCA uses etiquetas de género como "caballero" o "dama". Dirígete al cliente de forma neutral (ej: "Estimado cliente", "¿En qué puedo servirle?").
      - Usa la lógica: si el cliente pregunta por algo que no está, sé honesto y ofrece alternativas reales de la tienda.
      
      CONTEXTO DE LA TIENDA Y CAPACIDADES:
      ${storeInfo ? `
      - Nombre: "${storeInfo.name}"
      - Eslogan/Descripción: "${storeInfo.settings?.description || 'Calidad y confianza'}"
      - Ubicación: ${storeInfo.location.municipality}, ${storeInfo.location.province}, Cuba.
      - Métodos de Pago: ${storeInfo.settings?.activePaymentMethods?.join(', ') || 'Efectivo y Transferencia'}.
      - Monedas que acepta: ${storeInfo.settings?.enabledCurrencies?.join(', ') || 'CUP, MLC'}.
      - Instrucciones de pago: ${storeInfo.settings?.cupPaymentInstructions ? 'Tiene protocolos claros para CUP.' : ''} ${storeInfo.settings?.zelleInstructions ? 'Aceptan Zelle.' : ''}
      ` : 'Estás en una tienda asociada de la Plaza Digital.'}
      
      INFORMACIÓN DEL CATÁLOGO (Stock y Mayoreo):
      ${catalogSummary}
      
      REGLAS DE ORO:
      1. Solo habla de lo que ESTA TIENDA puede ofrecer. No inventes productos ni servicios externos.
      2. Explica las escalas de mayoreo con entusiasmo: "Si lleva más, le sale mucho más barato...".
      3. Si el cliente tiene dudas sobre el pago, explícale las opciones de la tienda (Zelle, Transferencia, Efectivo).
      4. Mantén la respuesta concisa pero valiosa.
    `;

    const formattedContents = [...chatHistory];
    formattedContents.push({ role: 'user', parts: [{ text: userMessage }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6,
      },
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error("Error en Chat Assistant:", error);
    res.status(500).json({ error: "Ocurrió un error al consultar a la IA." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de la IA corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
