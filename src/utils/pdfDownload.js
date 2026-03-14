const parseApiError = async (response) => {
  try {
    const payload = await response.json();
    return payload?.error || `Erro ${response.status}`;
  } catch {
    return `Erro ${response.status}`;
  }
};

const sanitizeFilename = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-');

export const downloadAssessmentPdf = async ({
  assessmentEventId,
  source = 'results',
  assessmentName = 'resultado-assessment',
  versionToken,
  forceRefresh = false,
  userName = '',
}) => {
  if (!assessmentEventId) {
    throw new Error('ID de resultado inválido para gerar PDF.');
  }

  const response = await fetch('/api/generate-assessment-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assessmentEventId,
      source,
      assessmentName,
        userName,
      versionToken,
      forceRefresh,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const safeUser = sanitizeFilename(userName);
  const safeName = sanitizeFilename(assessmentName) || 'resultado-assessment';
  const filenameBase = safeUser ? `${safeUser} - ${safeName}` : safeName;
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${filenameBase}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
