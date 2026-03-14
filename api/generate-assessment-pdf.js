import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const WINDOW_MS = 60_000;
const RATE_LIMIT_PER_WINDOW = 12;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const MAX_CACHE_ENTRIES = 60;
const SINGLE_PAGE_MIN_HEIGHT_PX = 1_200;
const SINGLE_PAGE_WIDTH_PX = 1240;
const PADDING_V_PX = 48; // ~12mm
const PADDING_H_PX = 40; // ~10mm

const requestLogByIp = new Map();
const pdfCache = new Map();
const inFlightByKey = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toPdfBuffer = (value) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value?.buffer instanceof ArrayBuffer) return Buffer.from(value.buffer);
  return Buffer.from(value || '');
};

const hasPdfSignature = (buffer) => {
  if (!buffer || buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('utf8') === '%PDF-';
};

const sanitize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const cleanupMaps = () => {
  const now = Date.now();

  for (const [ip, state] of requestLogByIp.entries()) {
    if (!state || (now - state.windowStart) > WINDOW_MS) {
      requestLogByIp.delete(ip);
    }
  }

  for (const [key, entry] of pdfCache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      pdfCache.delete(key);
    }
  }

  while (pdfCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = pdfCache.keys().next().value;
    if (!oldestKey) break;
    pdfCache.delete(oldestKey);
  }
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

const checkRateLimit = (req) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const state = requestLogByIp.get(ip);

  if (!state || now - state.windowStart > WINDOW_MS) {
    requestLogByIp.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, remaining: RATE_LIMIT_PER_WINDOW - 1 };
  }

  if (state.count >= RATE_LIMIT_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  state.count += 1;
  requestLogByIp.set(ip, state);
  return { allowed: true, remaining: RATE_LIMIT_PER_WINDOW - state.count };
};

const getBaseUrl = (req) => {
  const envUrl = process.env.PDF_RENDER_BASE_URL || process.env.APP_BASE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }

  const host = req.headers.host;
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

const buildRenderUrl = ({ baseUrl, assessmentEventId, source }) => {
  const route = source === 'public' ? 'public-results' : 'public-results';
  const query = 'pdf=1&expand=all&hideHeader=1&hideNextActivities=1';
  return `${baseUrl}/#/${route}/${assessmentEventId}?${query}`;
};

const renderPdf = async ({ url }) => {
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--disable-dev-shm-usage', '--hide-scrollbars'],
    defaultViewport: { width: SINGLE_PAGE_WIDTH_PX, height: 2200, deviceScaleFactor: 1 },
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });

    await page.waitForFunction(() => {
      const isReady = Boolean(
        document.querySelector('[data-public-results-ready="true"]') ||
        document.querySelector('[data-results-ready="true"]')
      );

      if (!isReady) return false;

      const hasSkeleton = Boolean(document.querySelector('.skeleton-shimmer'));
      return !hasSkeleton;
    }, { timeout: 45_000 });

    await sleep(1000);

    await page.addStyleTag({
      content: `
        [data-pdf-hide="true"] { display: none !important; }
        * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
        }
        html, body {
          background: linear-gradient(to bottom right, #F5F3EC, #EEF2FF) !important;
        }
        #root {
          background: linear-gradient(to bottom right, #F5F3EC, #EEF2FF) !important;
          padding: ${PADDING_V_PX}px ${PADDING_H_PX}px !important;
          box-sizing: border-box !important;
        }
        main {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `,
    });

    const contentHeight = await page.evaluate(() => {
      const root = document.querySelector('#root');
      const body = document.body;
      const html = document.documentElement;
      return Math.ceil(
        Math.max(
          root?.scrollHeight || 0,
          body?.scrollHeight || 0,
          html?.scrollHeight || 0
        )
      );
    });

    const safeHeight = Math.max(SINGLE_PAGE_MIN_HEIGHT_PX, contentHeight + 80);
    const pdfWidth = SINGLE_PAGE_WIDTH_PX;

    // Set @page to match — this prevents the print engine from splitting into A4 pages
    // NOTE: do NOT resize the viewport here — that would cause a reflow and change the measured height
    await page.addStyleTag({
      content: `@page { size: ${pdfWidth}px ${safeHeight}px; margin: 0 !important; }`,
    });

    const pdf = await page.pdf({
      width: `${pdfWidth}px`,
      height: `${safeHeight}px`,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const pdfBuffer = toPdfBuffer(pdf);
    if (!hasPdfSignature(pdfBuffer)) {
      throw new Error('Conteúdo gerado não é um PDF válido.');
    }

    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

export default async function handler(req, res) {
  cleanupMaps();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { allowed, remaining } = checkRateLimit(req);
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (!allowed) {
    return res.status(429).json({ error: 'Muitas solicitações para gerar PDF. Tente novamente em instantes.' });
  }

  const {
    assessmentEventId,
    source = 'results',
    assessmentName = 'resultado-assessment',
    versionToken = 'v1',
    forceRefresh = false,
  } = req.body || {};

  if (!assessmentEventId) {
    return res.status(400).json({ error: 'assessmentEventId é obrigatório.' });
  }

  const cacheKey = `${assessmentEventId}:${source}:${versionToken}`;
  const filename = `${sanitize(assessmentName) || 'resultado-assessment'}-${assessmentEventId}.pdf`;

  const cached = pdfCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(cached.buffer.length));
    res.setHeader('X-PDF-Cache', 'HIT');
    return res.status(200).send(cached.buffer);
  }

  if (inFlightByKey.has(cacheKey)) {
    try {
      const existingBuffer = await inFlightByKey.get(cacheKey);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', String(existingBuffer.length));
      res.setHeader('X-PDF-Cache', 'IN-FLIGHT');
      return res.status(200).send(existingBuffer);
    } catch {
      return res.status(500).json({ error: 'Falha ao gerar PDF em requisição concorrente.' });
    }
  }

  const taskPromise = (async () => {
    const baseUrl = getBaseUrl(req);
    const renderUrl = buildRenderUrl({ baseUrl, assessmentEventId, source });
    const pdfBuffer = await renderPdf({ url: renderUrl });

    pdfCache.set(cacheKey, {
      buffer: pdfBuffer,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return pdfBuffer;
  })();

  inFlightByKey.set(cacheKey, taskPromise);

  try {
    const pdfBuffer = await taskPromise;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.setHeader('X-PDF-Cache', 'MISS');
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('generate-assessment-pdf error:', error);
    return res.status(500).json({ error: 'Não foi possível gerar o PDF agora.' });
  } finally {
    inFlightByKey.delete(cacheKey);
  }
}
