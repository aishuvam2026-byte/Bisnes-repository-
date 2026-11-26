import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Parse CLI port; in dev always default to 3000, in production honor Cloud Run PORT if provided
const portArgIndex = process.argv.indexOf('--port');
const eqPortArg = process.argv.find((arg) => arg.startsWith('--port='));
const rawCliPort =
  eqPortArg !== undefined
    ? eqPortArg.split('=')[1]
    : portArgIndex !== -1
    ? process.argv[portArgIndex + 1]
    : undefined;
const parsedCliPort = rawCliPort ? Number(rawCliPort) : NaN;
const PORT =
  Number.isFinite(parsedCliPort) && parsedCliPort > 0
    ? parsedCliPort
    : isProd && process.env.PORT
    ? Number(process.env.PORT)
    : 3000;

app.use(express.json());

// Health check endpoint for deployment probes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', env: isProd ? 'production' : 'development' });
});

// Lazy-load Gemini SDK on server with required User-Agent header
let aiClientPromise: Promise<any | null> | null = null;
function getAiClient(): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return Promise.resolve(null);
  }
  if (!aiClientPromise) {
    aiClientPromise = import('@google/genai')
      .then(
        ({ GoogleGenAI }) =>
          new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          })
      )
      .catch((err) => {
        console.error('Failed to initialize @google/genai:', err);
        aiClientPromise = null;
        return null;
      });
  }
  return aiClientPromise;
}

function normalizeIndianWhatsAppNumber(rawPhone: string): string {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

// AI Assistant endpoint
app.post('/api/assistant', async (req: Request, res: Response) => {
  try {
    const { role = 'owner', language = 'en', message, context = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Role-specific System Instruction
    const isOwner = role === 'owner';
    const langInstructions = {
      en: 'Reply in clear, concise English (maximum 3-4 short sentences).',
      hi: 'Reply in natural Hinglish using Roman script (max 3-4 short sentences, simple language).',
      or: 'Reply in natural Odia using Roman script (max 3-4 short sentences, simple words).',
    }[language as 'en' | 'hi' | 'or'] || 'Reply in clear English.';

    const systemInstruction = isOwner
      ? `You are "Rupam AI Assistant" for Shuvam Behera, owner of Rupam B2B Wholesale (Cosmetics & FMCG in Nuapatna, Cuttack, Odisha).
${langInstructions}
Core Business Rules to respect:
- Minimum order value = ₹1,000.
- Full packets only (6 or 12 pcs per product). No loose pieces.
- ₹1,000 advance required before booking status.
- Free delivery within 150 km of Nuapatna; outside 150 km adds delivery charge.
- Udhaar rule: NO general credit. Max 10% shortage on delivery is allowed as Udhaar that MUST be cleared before the next order. >10% shortage forces Hold.
- Return/damage rule: Continuous unboxing video from sealed parcel opening is mandatory. Opened/unsold items are not returnable.
- Never auto-offer discounts. Any discount requires owner manual entry.
- You can suggest DRAFT actions (e.g. draft reminder, draft order, draft hold note), but clarify that final execution needs owner tap to Approve.
Current Business Context:
${JSON.stringify(context, null, 2)}`
      : `You are "Rupam Retailer Helper" for shopkeepers ordering wholesale cosmetics from Rupam (Nuapatna, Cuttack).
${langInstructions}
Rules:
- Be polite, welcoming, and helpful to the Retailer Bhai.
- Explain policies simply: min order ₹1,000, 6/12 pcs full packets, ₹1,000 advance to confirm booking, free delivery within 150 km, continuous unboxing video required for damage claims.
- Never promise discounts, general credit, or final stock availability without owner approval.
- Never reveal any other customer's data, wholesale purchase cost, or profit margins.
- If unsure, advise the customer to tap the "Call Owner" or "WhatsApp" button.
Customer Context:
${JSON.stringify(context, null, 2)}`;

    const aiClient = await getAiClient();
    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `User Question: ${message}`,
          config: {
            systemInstruction,
          },
        });

        const replyText = response.text || 'I am ready to help. Please tap Call or WhatsApp if urgent.';
        return res.json({
          reply: replyText,
          suggestions: isOwner
            ? ['Check low stock', 'Who has pending udhaar?', 'Draft WhatsApp reminder']
            : ['What is the minimum order?', 'Delivery time to my shop', 'Return policy for broken items'],
        });
      } catch (err: any) {
        console.warn('Gemini API call failed in /api/assistant:', err?.message);
      }
    }

    // Deterministic fallback response tailored to live context, role & language
    const lower = message.toLowerCase();
    const totalSales = Number(context.totalSales || 0).toLocaleString('en-IN');
    const pendingUdhaar = Number(context.pendingUdhaarTotal || 0).toLocaleString('en-IN');
    const lowStockCount = Number(context.lowStockCount || 0);
    const dispatchesToday = Number(context.dispatchesToday || 0);
    const minOrderValue = Number(context.minOrderValue || 1000).toLocaleString('en-IN');
    let reply = '';
    const suggestions: string[] = [];

    if (role === 'supplier') {
      reply = `Supplier Portal Ready: You can review your POs, check QR/UPI settlement details in Khata, and view the Supplier Rule Settings Table in Menu > Landed Cost Calculator.`;
      suggestions.push('Show my pending POs', 'UPI QR & Record Payment', 'Landed Cost Rules');
    } else if (isOwner) {
      if (lower.includes('udhaar') || lower.includes('due') || lower.includes('pending') || lower.includes('balance')) {
        reply = `Total pending Udhaar is ₹${pendingUdhaar}. Business rule enforces clearing dues before accepting the next order unless you apply an owner override.`;
        suggestions.push('View Khata page', 'Send WhatsApp reminder', 'Check high risk shops');
      } else if (lower.includes('stock') || lower.includes('low') || lower.includes('inventory')) {
        reply = `${lowStockCount} products are currently at or below reorder level. Tap "Stock" to view alerts and create a supplier PO.`;
        suggestions.push('Open Stock list', 'Create supplier PO', 'View FEFO alerts');
      } else if (lower.includes('dispatch') || lower.includes('today') || lower.includes('hold')) {
        reply = `${dispatchesToday} orders are packed or dispatched today. Remember to confirm balance payment via the Dispatch Day confirmation call.`;
        suggestions.push('Open Delivery Board', 'Call pending shops', 'View On Hold orders');
      } else {
        reply = `Hello ${context.ownerName || 'Shuvam'}! ${context.businessName || 'Rupam B2B'} has ₹${totalSales} in order volume across ${context.totalOrders || 0} orders. Ask about low stock (${lowStockCount}), pending udhaar (₹${pendingUdhaar}), or dispatches (${dispatchesToday}).`;
        suggestions.push('Check low stock', 'Who has pending udhaar?', 'Show today dispatches');
      }
    } else {
      if (lower.includes('minimum') || lower.includes('rule') || lower.includes('kam')) {
        reply = `Minimum wholesale order value is ₹${minOrderValue}. All items are sold in full 6 or 12 pc packets. ₹${context.advanceBookingAmount || 1000} advance confirms your booking.`;
        suggestions.push('Browse Catalogue', 'Place New Order', 'Call Shuvam Bhai');
      } else if (lower.includes('delivery') || lower.includes('time') || lower.includes('charge')) {
        reply = `Delivery takes 1 to 5 days. Free delivery within ${context.freeDeliveryRadiusKm || 150} km of Nuapatna. Please record a continuous unboxing video when opening the sealed parcel!`;
        suggestions.push('Track My Order', 'View Invoices', 'Contact Owner');
      } else {
        reply = `Welcome to Rupam B2B Wholesale! Minimum order is ₹${minOrderValue} (full 6/12 packets). UPI ID: ${context.upiId || 'shuvam.rupam@upi'}.`;
        suggestions.push('What is min order?', 'Free delivery radius', 'Payment methods');
      }
    }

    res.json({ reply, suggestions });
  } catch (error: any) {
    console.error('Assistant error:', error);
    res.status(500).json({ error: 'Internal assistant error' });
  }
});

// Gemini-powered Sales-Based Demand Forecasting & Automated Reorder Plan
app.post('/api/inventory/forecast', async (req: Request, res: Response) => {
  try {
    const { businessName = 'Rupam B2B Wholesale', inventoryMetrics = [] } = req.body || {};

    if (!Array.isArray(inventoryMetrics) || inventoryMetrics.length === 0) {
      return res.status(400).json({ error: 'Inventory metrics array is required for demand forecasting.' });
    }

    const aiClient = await getAiClient();
    if (!aiClient) {
      return res.status(503).json({
        error:
          'Gemini API key is not configured on the server. Please check GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    const { Type, ThinkingLevel } = await import('@google/genai');

    const compactPayload = inventoryMetrics.slice(0, 60).map((item: any) => ({
      productId: String(item.productId || ''),
      name: String(item.name || ''),
      sku: String(item.sku || ''),
      category: String(item.category || ''),
      brand: String(item.brand || ''),
      packSize: Number(item.packSize || 12),
      currentPackets: Number(item.currentPackets || 0),
      reservedPackets: Number(item.reservedPackets || 0),
      reorderLevel: Number(item.reorderLevel || 5),
      purchaseCost: Number(item.purchaseCost || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      totalPacketsSold: Number(item.totalPacketsSold || 0),
      orderCount: Number(item.orderCount || 0),
      avgDailyPacketsSold: Number(item.avgDailyPacketsSold || 0),
      supplierLeadTimeDays: Number(item.supplierLeadTimeDays || 4),
      supplierName: String(item.supplierName || 'Wholesale Dealer'),
      expiryDate: String(item.expiryDate || ''),
    }));

    const prompt = `Analyze this B2B cosmetic & FMCG wholesale inventory and historical sales data for "${businessName}".
For EVERY product in the list, forecast 30-day packet demand based on sales velocity, order frequency, current stock, reserved stock, reorder threshold, and supplier lead time.
Rules:
- Products with 0 packets (Out of Stock) or daysOfCover <= supplierLeadTimeDays must be marked "Critical".
- Products at or below reorderLevel or with daysOfCover <= supplierLeadTimeDays * 2 should be marked "High".
- Products approaching reorder within 20 days should be "Medium"; well-stocked items should be "Healthy".
- recommendedReorderPackets MUST be a whole integer >= 0 (0 if Healthy and well-stocked; otherwise enough to cover 30 days demand + safety buffer minus available stock).
- Write crisp, practical B2B procurement reasoning in Roman English/Hinglish (zero Devanagari/Odia Unicode characters).

Inventory & Sales Dataset:
${JSON.stringify(compactPayload)}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert B2B wholesale supply-chain and inventory demand forecasting engine. Return strictly valid JSON matching the schema.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: '2-3 sentence executive summary of stockout risks, fast movers, and immediate reorder priority.',
            },
            criticalCount: { type: Type.INTEGER },
            totalRecommendedPackets: { type: Type.INTEGER },
            estimatedReorderBudget: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  predicted30DayPackets: { type: Type.INTEGER },
                  daysOfCover: { type: Type.INTEGER },
                  urgency: {
                    type: Type.STRING,
                    description: 'One of: Critical, High, Medium, Healthy',
                  },
                  recommendedReorderPackets: { type: Type.INTEGER },
                  suggestedAction: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: [
                  'productId',
                  'predicted30DayPackets',
                  'daysOfCover',
                  'urgency',
                  'recommendedReorderPackets',
                  'suggestedAction',
                  'reason',
                ],
              },
            },
          },
          required: [
            'summary',
            'criticalCount',
            'totalRecommendedPackets',
            'estimatedReorderBudget',
            'items',
          ],
        },
      },
    });

    const rawText = (response.text || '').trim();
    if (!rawText) {
      return res.status(502).json({ error: 'Gemini returned an empty demand forecast response.' });
    }

    const parsed = JSON.parse(rawText);
    return res.json({
      model: 'gemini-4-hydrogen',
      generatedAt: new Date().toISOString(),
      ...parsed,
    });
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 500);
    const msg = err?.message || 'Failed to generate Gemini demand forecast.';
    console.error('Gemini demand forecast error:', msg);
    if (status === 403 || status === 400) {
      return res.status(status).json({
        error: `Gemini API key error (${status}). Please check GEMINI_API_KEY in Settings > Secrets. Details: ${msg}`,
      });
    }
    if (status === 429) {
      return res.status(429).json({
        error: `Gemini API quota exceeded (429). Please retry shortly or check Settings > Secrets. Details: ${msg}`,
      });
    }
    return res.status(500).json({ error: msg });
  }
});

// WhatsApp Business Cloud API status check (never exposes tokens)
app.get('/api/whatsapp/status', (_req: Request, res: Response) => {
  const token = process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
  res.json({
    configured: Boolean(token && phoneNumberId),
    apiVersion,
  });
});

// Automated WhatsApp Business API dealer low-stock restock notification endpoint
app.post('/api/whatsapp/low-stock-alert', async (req: Request, res: Response) => {
  try {
    const {
      supplierName = 'Wholesale Dealer',
      phone = '',
      productName = '',
      sku = '',
      packSize = 12,
      currentPackets = 0,
      reorderLevel = 5,
      suggestedReorderPackets = 10,
      businessName = 'Rupam B2B Wholesale',
      triggerType = 'Auto-Trigger',
    } = req.body || {};

    if (!productName) {
      return res.status(400).json({ error: 'Product name is required for WhatsApp stock alert.' });
    }

    const normalizedTo = normalizeIndianWhatsAppNumber(phone);
    if (!normalizedTo) {
      return res.status(400).json({ error: 'Valid dealer WhatsApp phone number is required.' });
    }

    const stockLabel = Number(currentPackets) <= 0 ? 'OUT OF STOCK (0 pkts)' : `LOW STOCK (${currentPackets} pkts left)`;
    const messageText = `*${businessName} — Automated Restock Alert*\nNamaste ${supplierName}!\n\nStock Status: *${stockLabel}*\nProduct: ${productName} (${sku || 'SKU'})\nReorder Threshold: ${reorderLevel} pkts\nSuggested Restock Qty: *${suggestedReorderPackets} pkts* (${packSize} pcs/pkt)\nTrigger: ${triggerType}\n\nPlease confirm availability, wholesale rate & dispatch timeline to restock immediately.`;

    const fallbackUrl = `https://wa.me/${normalizedTo}?text=${encodeURIComponent(messageText)}`;
    const sentAt = new Date().toISOString();

    const accessToken = process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    if (!accessToken || !phoneNumberId) {
      return res.json({
        ok: true,
        delivered: false,
        configured: false,
        provider: 'whatsapp_web_fallback',
        sentAt,
        normalizedTo,
        message: messageText,
        fallbackUrl,
        notice:
          'WhatsApp Business Cloud API secrets (WHATSAPP_BUSINESS_ACCESS_TOKEN & WHATSAPP_PHONE_NUMBER_ID) are not set on the server yet. Alert saved to database — tap Open WhatsApp to send now.',
      });
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const metaResp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText,
        },
      }),
    });

    const metaJson = (await metaResp.json().catch(() => ({}))) as any;
    if (!metaResp.ok) {
      const apiErr =
        metaJson?.error?.message || `WhatsApp Business API error (HTTP ${metaResp.status})`;
      return res.status(metaResp.status).json({
        ok: false,
        delivered: false,
        configured: true,
        provider: 'whatsapp_cloud_api',
        sentAt,
        normalizedTo,
        message: messageText,
        fallbackUrl,
        error: apiErr,
      });
    }

    const messageId = metaJson?.messages?.[0]?.id || `wamid-${Date.now()}`;
    return res.json({
      ok: true,
      delivered: true,
      configured: true,
      provider: 'whatsapp_cloud_api',
      messageId,
      sentAt,
      normalizedTo,
      message: messageText,
      fallbackUrl,
    });
  } catch (err: any) {
    console.error('WhatsApp low-stock alert error:', err);
    return res.status(500).json({
      ok: false,
      delivered: false,
      error: err?.message || 'Failed to send WhatsApp low-stock alert.',
    });
  }
});

// Direct Android APK download endpoint
app.get('/download/apk', (_req: Request, res: Response) => {
  const apkPath = path.resolve(process.cwd(), 'public', 'Rupam_Business_Manager_v1.0.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="Rupam_Business_Manager_v1.0.apk"');
  res.sendFile(apkPath);
});

// Setup Vite middleware in dev (non-blocking port bind) or static files in production
function startServer() {
  let viteMiddlewarePromise: Promise<(req: Request, res: Response, next: () => void) => void> | null = null;
  let cachedViteMiddlewares: ((req: Request, res: Response, next: () => void) => void) | null = null;

  const ensureVite = () => {
    if (!viteMiddlewarePromise) {
      viteMiddlewarePromise = import('vite')
        .then(({ createServer: createViteServer }) =>
          createViteServer({
            server: {
              middlewareMode: true,
              hmr: false,
              ws: false,
              watch: null,
            },
            appType: 'spa',
          })
        )
        .then((vite) => {
          cachedViteMiddlewares = vite.middlewares;
          return vite.middlewares;
        });
    }
    return viteMiddlewarePromise;
  };

  if (!isProd) {
    app.use(async (req, res, next) => {
      if (cachedViteMiddlewares) {
        return cachedViteMiddlewares(req, res, next);
      }
      try {
        const mw = await ensureVite();
        return mw(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rupam Business Manager server running on http://0.0.0.0:${PORT}`);
    if (!isProd) {
      void ensureVite().catch((err) => {
        console.error('Failed to initialize Vite dev middleware:', err);
      });
    }
  });

  server.on('error', (err) => {
    console.error('Server failed to listen:', err);
    process.exit(1);
  });
}

startServer();
