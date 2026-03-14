import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const WINDOW_MS = 60_000;
const RATE_LIMIT_PER_WINDOW = 12;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const MAX_CACHE_ENTRIES = 60;

const requestLogByIp = new Map();
const pdfCache = new Map();
const inFlightByKey = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    defaultViewport: { width: 1440, height: 2200, deviceScaleFactor: 1 },
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
    await sleep(1200);

    await page.addStyleTag({
      content: `
        [data-pdf-hide="true"] { display: none !important; }
        @page { margin: 14mm 10mm 14mm 10mm; }
      `,
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    return pdf;
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
    res.setHeader('X-PDF-Cache', 'HIT');
    return res.status(200).send(cached.buffer);
  }

  if (inFlightByKey.has(cacheKey)) {
    try {
      const existingBuffer = await inFlightByKey.get(cacheKey);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
    res.setHeader('X-PDF-Cache', 'MISS');
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('generate-assessment-pdf error:', error);
    return res.status(500).json({ error: 'Não foi possível gerar o PDF agora.' });
  } finally {
    inFlightByKey.delete(cacheKey);
  }
}
