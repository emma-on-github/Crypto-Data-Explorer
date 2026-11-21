import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

interface SummaryRequestBody {
  coinName?: string;
  coinSymbol?: string;
  currency?: string;
  earliestDate?: string;
  latestDate?: string;
  dayCount?: number;
  startPrice?: number;
  endPrice?: number;
  pctChange?: number;
  highPrice?: number;
  highDate?: string;
  lowPrice?: number;
  lowDate?: string;
  avgVolume?: number;
  volatilityStdDev?: number | null;
  volatilityLabel?: string;
  maxDrawdownPct?: number;
  sma7Valid?: boolean;
  latestSma7?: number | null;
}

function isPositiveFinite(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val > 0;
}

function isFiniteNum(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

function formatAdaptiveCurrency(value: number, currencyCode: string): string {
  const iso = currencyCode.toUpperCase();
  const abs = Math.abs(value);

  let minDecimals = 2;
  let maxDecimals = 2;

  if (iso === 'JPY') {
    if (abs === 0 || abs >= 100) {
      minDecimals = 0;
      maxDecimals = 0;
    } else if (abs >= 1) {
      minDecimals = 2;
      maxDecimals = 2;
    } else if (abs >= 0.01) {
      minDecimals = 4;
      maxDecimals = 4;
    } else if (abs >= 0.0001) {
      minDecimals = 6;
      maxDecimals = 6;
    } else {
      minDecimals = 8;
      maxDecimals = 8;
    }
  } else {
    if (abs === 0 || abs >= 10) {
      minDecimals = 2;
      maxDecimals = 2;
    } else if (abs >= 1) {
      minDecimals = 2;
      maxDecimals = 4;
    } else if (abs >= 0.01) {
      minDecimals = 4;
      maxDecimals = 4;
    } else if (abs >= 0.0001) {
      minDecimals = 6;
      maxDecimals = 6;
    } else {
      minDecimals = 8;
      maxDecimals = 8;
    }
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: iso,
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

function formatCompactVolume(value: number, currencyCode: string): string {
  if (value <= 0) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    notation: 'compact',
  }).format(value);
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/market-summary', async (req: Request, res: Response) => {
    const body = req.body as SummaryRequestBody | undefined;

    if (
      !body ||
      typeof body.coinName !== 'string' ||
      typeof body.coinSymbol !== 'string' ||
      typeof body.currency !== 'string' ||
      typeof body.earliestDate !== 'string' ||
      typeof body.latestDate !== 'string' ||
      typeof body.dayCount !== 'number' ||
      body.dayCount < 1 ||
      !isPositiveFinite(body.startPrice) ||
      !isPositiveFinite(body.endPrice) ||
      !isPositiveFinite(body.highPrice) ||
      !isPositiveFinite(body.lowPrice) ||
      !isFiniteNum(body.pctChange) ||
      !isFiniteNum(body.avgVolume) ||
      !isFiniteNum(body.maxDrawdownPct)
    ) {
      res.status(400).json({
        error: 'Analysis paused until valid price data is restored.',
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'AI summary service is unavailable because GEMINI_API_KEY is not configured.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const fmtPrice = (v: number) => formatAdaptiveCurrency(v, body.currency!);

    const sma7Line =
      body.sma7Valid && isPositiveFinite(body.latestSma7)
        ? `Latest 7-Day Average Price: ${fmtPrice(body.latestSma7)}`
        : '7-Day Average Price: Unavailable (insufficient valid historical data). Do NOT estimate or calculate a 7-Day Average.';

    const volLine =
      typeof body.volatilityStdDev === 'number' && Number.isFinite(body.volatilityStdDev)
        ? `${body.volatilityLabel ?? 'Recorded'} (typical daily price swings)`
        : 'Not enough daily records to describe typical price swings';

    const promptText = [
      `Verified historical market observations for ${body.coinName} (${body.coinSymbol}) quoted in ${body.currency.toUpperCase()}:`,
      `- Window: ${body.earliestDate} to ${body.latestDate} (${body.dayCount} valid daily end-of-day records)`,
      `- Starting End-of-Day Price: ${fmtPrice(body.startPrice)}`,
      `- Most Recent End-of-Day Price: ${fmtPrice(body.endPrice)}`,
      `- Overall Price Change: ${body.pctChange >= 0 ? '+' : ''}${body.pctChange.toFixed(2)}%`,
      `- Highest Price: ${fmtPrice(body.highPrice)} on ${body.highDate ?? 'N/A'}`,
      `- Lowest Price: ${fmtPrice(body.lowPrice)} on ${body.lowDate ?? 'N/A'}`,
      `- Average Daily Trading Activity: ${formatCompactVolume(body.avgVolume, body.currency)}`,
      `- Typical Daily Price Swings: ${volLine}`,
      `- Biggest Drop from High: ${body.maxDrawdownPct.toFixed(2)}%`,
      `- ${sma7Line}`,
    ].join('\n');

    const systemInstruction = [
      'You are an objective, educational narrator for Crypto Data Explorer.',
      'Write a neutral 2-3 sentence recap strictly in the past tense using plain, everyday English for beginners studying historical data.',
      'Ground every figure strictly in the verified past numbers and formatted currency values provided.',
      'NEVER use forward-looking language, predictions, projections, or speculation about what might happen next.',
      'NEVER frame a price fall as a "dip", "discount", "bargain", or "buying opportunity", and NEVER frame a price rise as an opportunity or signal.',
      'NEVER suggest, advise, or imply what the reader should do next (never suggest buying, selling, holding, researching to invest, or timing any market).',
      'NEVER praise, promote, or endorse any cryptocurrency.',
      'Avoid trading jargon (such as "drawdown", "SMA", "std dev", "bullish", "bearish", "support", "resistance", or "rally").',
      'NEVER estimate, interpolate, fill in, or invent any prices or dates.',
    ].join(' ');

    const maxAttempts = 2;
    const attemptTimeoutMs = 10_000;
    let lastErrorMessage = 'Unexpected Gemini API error';
    let timedOut = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: promptText,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error('GEMINI_ATTEMPT_TIMEOUT'));
            }, attemptTimeoutMs);
          }),
        ]);

        const summary = response.text?.trim();
        if (!summary) {
          res.status(502).json({
            error: 'Unable to generate historical summary at this time.',
          });
          return;
        }

        res.json({ summary });
        return;
      } catch (err) {
        lastErrorMessage = err instanceof Error ? err.message : 'Unexpected Gemini API error';
        const isTimeout = lastErrorMessage === 'GEMINI_ATTEMPT_TIMEOUT';
        timedOut = isTimeout;
        const isTransient =
          isTimeout ||
          lastErrorMessage.includes('503') ||
          lastErrorMessage.includes('429') ||
          lastErrorMessage.includes('UNAVAILABLE') ||
          lastErrorMessage.includes('RESOURCE_EXHAUSTED');

        if (!isTransient || attempt === maxAttempts) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 600));
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    if (timedOut) {
      res.status(504).json({
        error:
          'Historical summary timed out while waiting for the AI service. Please try again in a moment.',
      });
      return;
    }

    let friendlyError = `Historical summary is temporarily unavailable: ${lastErrorMessage}`;
    if (lastErrorMessage.includes('503') || lastErrorMessage.includes('UNAVAILABLE')) {
      friendlyError =
        'The AI summary service is temporarily experiencing high demand. Please try again in a moment.';
    } else if (lastErrorMessage.includes('429') || lastErrorMessage.includes('RESOURCE_EXHAUSTED')) {
      friendlyError =
        'The AI summary service rate limit was reached. Please wait a moment before trying again.';
    } else if (
      lastErrorMessage.includes('PERMISSION_DENIED') ||
      lastErrorMessage.includes('API_KEY_INVALID')
    ) {
      friendlyError =
        'The AI summary service could not authenticate. Please check GEMINI_API_KEY in Settings > Secrets.';
    }

    res.status(502).json({
      error: friendlyError,
    });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Crypto Data Explorer server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Crypto Data Explorer server:', err);
  process.exit(1);
});
