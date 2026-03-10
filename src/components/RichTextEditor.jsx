import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Mark } from '@tiptap/core';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link as LinkIcon,
  Type,
  RotateCcw
} from 'lucide-react';

// Extensão customizada para Font Size como Mark
const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => {
          const fontSize = element.style.fontSize;
          return fontSize && fontSize.trim() ? fontSize : null;
        },
        renderHTML: attributes => {
          if (!attributes.size) return {};
          return {
            style: `font-size: ${attributes.size}`,
            _keepClass: true
          };
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[style*="font-size"]'
      }
    ];
  },
  renderHTML({ attributes }) {
    const style = attributes.size ? `font-size: ${attributes.size}` : '';
    return ['span', { style }, 0];
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ commands }) => {
        return commands.setMark(this.name, { size });
      },
      unsetFontSize: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      }
    };
  }
});

/**
 * RichTextEditor - Editor WYSIWYG com TipTap
 * Toolbar com formatação básica, seleção de tamanho de fonte (em rem), auto-height
 */
export default function RichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Digite aqui...',
  label = '',
  maxHeight = 500
}) {
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);

  const fontSizes = [
    { label: 'Pequeno', value: '0.875rem' },
    { label: 'Normal', value: '1rem' },
    { label: 'Grande', value: '1.125rem' },
    { label: 'Muito Grande', value: '1.25rem' },
    { label: 'Extragrande', value: '1.5rem' }
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Remove headings, usar font-size ao invés
        paragraph: {
          HTMLAttributes: {
            class: 'mb-2' // Adiciona margem entre parágrafos
          }
        }
      }),
      FontSize,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#4F46E5] underline hover:text-[#312E81]'
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-4 text-base'
      }
    }
  });

  // Sync external value changes
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const getCurrentFontSize = () => {
    return editor.getAttributes('fontSize').size || '1rem';
  };

  const applyFontSize = (fontSize) => {
    // Aplicar tamanho de fonte ao texto selecionado usando Mark
    editor.chain().focus().setMark('fontSize', { size: fontSize }).run();
    setShowFontSizeMenu(false);
  };

  const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-indigo-100 text-[#4F46E5]' : 'text-gray-700'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => (
    <div className="w-px h-6 bg-gray-300 mx-1"></div>
  );

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-[#4F46E5] focus-within:border-[#4F46E5] transition-colors">
      {label && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
      )}
      
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Tachado"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Font Size Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
            title="Aplicar tamanho de fonte"
            className={`p-2 rounded hover:bg-gray-100 transition-colors flex items-center gap-1 ${
              editor.isActive('fontSize') ? 'bg-indigo-100 text-[#4F46E5]' : 'text-gray-700'
            }`}
          >
            <Type className="w-4 h-4" />
            <span className="text-xs font-semibold">Tam</span>
          </button>
          
          {showFontSizeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50">
              {fontSizes.map(size => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => {
                    applyFontSize(size.value);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    getCurrentFontSize() === size.value ? 'bg-indigo-100 text-[#4F46E5] font-semibold' : 'text-gray-700'
                  }`}
                  style={{ fontSize: size.value }}
                >
                  {size.label}
                </button>
              ))}
              <div className="border-t border-gray-200"></div>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetMark('fontSize').run();
                  setShowFontSizeMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-gray-600 transition-colors"
              >
                Remover tamanho
              </button>
            </div>
          )}
        </div>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista com marcadores"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={toggleLink}
          isActive={editor.isActive('link')}
          title="Inserir/editar link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => {
            editor.chain().focus()
              .clearNodes()
              .unsetAllMarks()
              .run();
          }}
          title="Limpar toda formatação do texto selecionado"
        >
          <RotateCcw className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div 
        className="overflow-y-auto bg-white"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
