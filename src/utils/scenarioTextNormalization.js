/**
 * Scenario text normalization helpers.
 * Keeps legacy content readable while migrations are rolled out.
 */

const normalizeCopy = (input = '') => {
  let html = String(input || '');

  // Clean common escaped artifacts coming from JSON/text storage.
  html = html.replace(/\\r\\n|\\n|\\r/g, ' ');
  html = html.replace(/\\"/g, '"');
  html = html.replace(/\\'/g, "'");
  html = html.replace(/\\u201c/gi, '"');
  html = html.replace(/\\u201d/gi, '"');
  html = html.replace(/\\/g, '');

  html = html.replace(/Action\s*>\s*discussion\.?/gi, 'Acao clara reduz incerteza e pressao no time.');
  html = html.replace(/\bMinha conta\./gi, 'Por minha conta.');
  html = html.replace(/\brole nessa sprint de emergencia\?/gi, 'papel nessa sprint de emergencia?');
  html = html.replace(/\bstabilidade\b/gi, 'estabilidade');
  html = html.replace(/Perguntas da Equipe\s*-\s*Linha reta/gi, 'Perguntas da equipe - linha de frente');

  // Translate technical pressure tags that may leak into raw HTML/content text.
  html = html.replace(/\btime[\s_-]*critical\b/gi, 'momento critico de tempo');
  html = html.replace(/\bauthority[\s_-]*established\b/gi, 'autoridade estabelecida');
  html = html.replace(/\bcognitive[\s_-]*shift\b/gi, 'mudanca de perspectiva');
  html = html.replace(/\bstakes[\s_-]*increased\b/gi, 'risco aumentou');
  html = html.replace(/\bnew[\s_-]*constraint[\s_-]*added\b/gi, 'nova restricao');
  html = html.replace(/\btime[\s_-]*pressure[\s_-]*added\b/gi, 'pressao de tempo');
  html = html.replace(/\binformation[\s_-]*revealed\b/gi, 'nova informacao');
  html = html.replace(/\bambiguity[\s_-]*increased\b/gi, 'maior incerteza');

  return html;
};

export const normalizeScenarioHtml = (input = '') => {
  let html = normalizeCopy(input);

  // Convert plain quoted paragraphs into blockquotes for visual consistency.
  html = html.replace(
    /<p>\s*["\u201c]([^<]+?)["\u201d]\s*<\/p>/gi,
    '<blockquote><p>"$1"</p></blockquote>'
  );

  // Also convert strong-wrapped quoted paragraphs into blockquotes.
  html = html.replace(
    /<p>\s*<strong>\s*["\u201c]([^<]+?)["\u201d]\s*<\/strong>\s*<\/p>/gi,
    '<blockquote><p>"$1"</p></blockquote>'
  );

  // Highlight speaker/context lines before quotes.
  html = html.replace(
    /<p>(Mão levantada:|Outra mão:|Terceira mão:|Pressão vindo de múltiplas direções\.|Equipe inteira espera clareza de VOCÊ\.[^<]*|Você tem \d+ minutos[^<]*)(.*?)<\/p>/gi,
    '<p class="scenario-speaker-line"><strong>$1</strong>$2</p>'
  );

  html = html.replace(
    /<p><strong>(Dev(?:\s*Junior|Jr)|Tech Lead 2|QA Lead|Chefe|Contexto):<\/strong>\s*([^<]*)<\/p>/gi,
    '<p class="scenario-speaker-line"><strong>$1:</strong> $2</p>'
  );

  return html;
};

export const normalizeScenarioText = (input = '') => {
  return normalizeCopy(input);
};
