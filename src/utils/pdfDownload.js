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
      versionToken,
      forceRefresh,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const safeName = sanitizeFilename(assessmentName) || 'resultado-assessment';
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${safeName}-${assessmentEventId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
