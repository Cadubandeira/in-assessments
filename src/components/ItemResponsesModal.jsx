import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ItemResponsesModal({
  isOpen,
  onClose,
  title,
  itemLabel,
  items = [],
  selectedKey,
  onSelect
}) {
  if (!isOpen) return null;

  const normalizedSelectedKey = selectedKey ? String(selectedKey) : '';
  const selectedItemIndex = Math.max(0, items.findIndex((item) => String(item.key) === normalizedSelectedKey));
  const selectedItem = items[selectedItemIndex] || null;
  const selectedQuestions = selectedItem?.questions || [];
  const chipRefs = useRef({});
  const previousQuestionsCount = items
    .slice(0, selectedItemIndex)
    .reduce((sum, item) => sum + (item?.questions?.length || 0), 0);

  useEffect(() => {
    const selectedKeyString = String(selectedItem?.key || '');
    const selectedChip = chipRefs.current[selectedKeyString];
    if (!selectedChip) return;

    if (window.innerWidth < 768) {
      selectedChip.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start'
      });
    }
  }, [selectedItem?.key, isOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const modalContent = (
    <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative z-[9999] bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {selectedItem?.label && (
              <p className="text-indigo-100 text-sm mt-1">{itemLabel}: {selectedItem.label}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-84px)] space-y-6">
          <div className="flex md:flex-wrap gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {items.map((item) => {
              const isSelected = String(item.key) === String(selectedItem?.key);
              return (
                <button
                  key={item.key}
                  ref={(el) => {
                    chipRefs.current[String(item.key)] = el;
                  }}
                  onClick={() => onSelect(String(item.key))}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    isSelected
                      ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-[#4F46E5] hover:text-[#4F46E5]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {selectedQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
              Nenhuma resposta registrada para este {itemLabel.toLowerCase()}.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedQuestions.map((question, index) => (
                (() => {
                  const continuousNumber = Number.isFinite(Number(question?.questionNumber))
                    ? Number(question.questionNumber)
                    : previousQuestionsCount + index + 1;

                  return (
                <div key={question.questionId || `${selectedItem?.key}-${index}`} className="border border-gray-200 rounded-xl p-4 bg-white">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#4F46E5] mb-2">
                    Pergunta {continuousNumber}
                  </p>
                  <p className="text-[#1E1B4B] font-semibold mb-3">{question.questionText}</p>
                  <div className="rounded-lg bg-[#EEF2FF] px-3 py-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#4F46E5] mb-1">Resposta</p>
                    <p className="text-gray-700">
                      {question.answerText || (question.answerValue !== undefined && question.answerValue !== null
                        ? String(question.answerValue)
                        : 'Sem resposta')}
                    </p>
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
