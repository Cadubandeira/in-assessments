import React from 'react';
import { createPortal } from 'react-dom';

const PDFGenerationOverlay = ({ isVisible = false }) => {
  if (!isVisible) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
      style={{
        zIndex: 100001,
        touchAction: 'none',
        overscrollBehavior: 'contain'
      }}
    >
      <div className="w-full max-w-md bg-gradient-to-br from-[#F6F0FF] via-white to-[#F3EDFF] border border-[#E6DDFF] rounded-[28px] p-8 shadow-[0_24px_80px_rgba(76,29,149,0.25)]">
        <div className="text-center">
          <h3 className="text-2xl font-extrabold text-[#1E1B4B] mb-5">Gerando PDF</h3>

          <div className="w-full h-3 bg-[#E6DDFF] rounded-full overflow-hidden shadow-inner">
            <div className="pdf-loading-bar h-full rounded-full" />
          </div>
        </div>
      </div>

      <style>{`
        .pdf-loading-bar {
          width: 40%;
          background: linear-gradient(90deg, #4F46E5, #6366F1, #818CF8);
          animation: pdfLoadingProgress 1.4s ease-in-out infinite;
        }

        @keyframes pdfLoadingProgress {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(80%);
          }
          100% {
            transform: translateX(260%);
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default PDFGenerationOverlay;
