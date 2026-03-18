import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { Markdown } from 'tiptap-markdown';
import api from '../api';
import toast from 'react-hot-toast';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import ResizeImage from 'tiptap-extension-resize-image';
import { Youtube } from '@tiptap/extension-youtube';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Code, SquareTerminal, Link as LinkIcon, Image as ImageIcon, Film as FilmIcon, Youtube as YoutubeIcon, Table as TableIcon, Highlighter, Palette } from 'lucide-react';

// Suppress known harmless warning caused by tiptap-markdown's internal link logic
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes("Duplicate extension names found: ['link']")) {
    return;
  }
  originalWarn(...args);
};

// Custom Video Extension with Editable Captions
const CustomVideo = Node.create({
  name: 'customVideo',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure.video-figure',
        getAttrs: (dom) => {
          const videoElement = dom.querySelector('video');
          const figcaptionElement = dom.querySelector('figcaption');
          return {
            src: videoElement ? videoElement.getAttribute('src') : null,
            caption: figcaptionElement ? figcaptionElement.innerText : '',
          };
        },
      },
      {
        tag: 'video[src]',
        getAttrs: (dom) => ({
          src: dom.getAttribute('src'),
          caption: '',
        }),
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    if (HTMLAttributes.caption) {
      return ['figure', { class: 'video-figure my-4' },
        ['video', mergeAttributes({ controls: true, class: 'w-full max-h-[500px] rounded-t-md object-contain bg-black' }, { src: HTMLAttributes.src })],
        ['figcaption', { class: 'text-center text-sm text-gray-500 mt-2 italic px-2' }, HTMLAttributes.caption]
      ];
    }
    return ['video', mergeAttributes({ controls: true, class: 'max-h-[500px] w-full object-contain bg-black rounded-md mt-2' }, { src: HTMLAttributes.src })];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => (
      <NodeViewWrapper className="my-4 relative group inline-block w-full">
        <div className={`relative border-2 rounded-xl overflow-hidden bg-black/5 dark:bg-black/20 transition-colors ${props.selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent dark:border-transparent'}`}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.deleteNode();
            }}
            className="absolute top-2 right-2 bg-black/60 text-white hover:bg-red-500 rounded-full w-7 h-7 flex items-center justify-center z-[100] cursor-pointer shadow-md backdrop-blur-sm transition-colors border border-white/20"
            title="Remove Video"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <video 
            controls 
            src={props.node.attrs.src} 
            className="w-full h-auto max-h-[500px] object-contain"
          />
          <div className="bg-white dark:bg-[#1a1a1b] border-t border-gray-200 dark:border-[#343536] px-3 py-2">
            <input 
              type="text"
              placeholder="Add a caption..."
              value={props.node.attrs.caption || ''}
              onChange={(e) => props.updateAttributes({ caption: e.target.value })}
              className="w-full bg-transparent border-none outline-none text-sm text-center text-gray-800 dark:text-gray-200"
            />
          </div>
        </div>
      </NodeViewWrapper>
    ));
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          if (node.attrs.caption) {
            state.write(`\n<figure class="video-figure my-4"><video controls src="${node.attrs.src}" class="w-full max-h-[500px] rounded-t-md object-contain bg-black"></video><figcaption class="text-center text-sm text-gray-500 mt-2 italic px-2">${node.attrs.caption}</figcaption></figure>\n`);
          } else {
            state.write(`\n<video controls src="${node.attrs.src}" class="max-h-[500px] w-full object-contain bg-black rounded-md mt-2"></video>\n`);
          }
        },
        parse: {
          setup(markdownit) {}
        }
      }
    };
  }
});

const MediaFloatingDelete = ({ editor }) => {
  const [mediaNode, setMediaNode] = useState(null);

  React.useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { selection } = editor.state;
      if (selection && selection.node && selection.node.type.name === 'image') {
        const domNode = editor.view.nodeDOM(selection.from);
        if (domNode && domNode instanceof HTMLElement) {
          if (getComputedStyle(domNode).position === 'static') {
            domNode.style.position = 'relative';
          }
          setMediaNode(domNode);
          return;
        }
      }
      setMediaNode(null);
    };

    editor.on('selectionUpdate', update);
    editor.on('update', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor]);

  if (!mediaNode) return null;

  return createPortal(
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        editor.chain().focus().deleteSelection().run();
      }}
      className="absolute top-2 right-2 bg-black/60 text-white hover:bg-red-500 rounded-full w-7 h-7 flex items-center justify-center z-[100] cursor-pointer shadow-md backdrop-blur-sm transition-colors border border-white/20"
      title="Remove"
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>,
    mediaNode
  );
};

const MenuBar = ({ editor, onPendingFile, variant }) => {
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Custom Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  if (!editor) {
    return null;
  }

  const toggleClass = (isActive) => 
    `p-2 rounded-md transition-all ${isActive ? 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-[#343536]'}`;

  const handleMediaUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File validation
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Please select a valid video file! 🎬');
      event.target.value = null;
      return;
    }
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Please select a valid image file! 🖼️');
      event.target.value = null;
      return;
    }

    if (type === 'image' && file.size > 5 * 1024 * 1024) {
      toast.error(`Image "${file.name}" is too large. Max 5MB allowed! 🖼️🛑`);
      event.target.value = null;
      return;
    }

    if (type === 'video' && file.size > 10 * 1024 * 1024) {
      toast.error(`Video "${file.name}" is too large. Max 10MB allowed! 🎬🛑`);
      event.target.value = null;
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    
    // Notify parent to store this file for upload on submit
    if (onPendingFile) {
      onPendingFile(file, objectUrl);
    } else {
      console.warn("No onPendingFile handler provided to TipTapEditor");
    }

    // Smart insertion: if an image or video is already selected, move cursor AFTER it so it doesn't get overwritten
    const { selection } = editor.state;
    if (selection.node && (selection.node.type.name === 'image' || selection.node.type.name === 'customVideo')) {
      editor.chain().setTextSelection(selection.to).run();
    }

    // Insert media and a trailing empty paragraph, then force cursor into the new paragraph
    if (type === 'video') {
       editor.chain().focus().insertContent([
         { type: 'customVideo', attrs: { src: objectUrl } },
         { type: 'paragraph', content: [] }
       ]).run();
    } else {
       editor.chain().focus().insertContent([
         { type: 'image', attrs: { src: objectUrl } },
         { type: 'paragraph', content: [] }
       ]).run();
    }
    
    event.target.value = null; // reset input
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 p-2 border-b border-gray-200 dark:border-[#343536] bg-gray-50/80 dark:bg-[#1a1a1b]/80 backdrop-blur-sm rounded-t-lg overflow-x-auto no-scrollbar whitespace-nowrap [&>button]:shrink-0 [&>div]:shrink-0">
      {variant !== 'comment' && (
        <>
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={toggleClass(editor.isActive('bold'))} title="Bold">
            <Bold size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={toggleClass(editor.isActive('italic'))} title="Italic">
            <Italic size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={toggleClass(editor.isActive('strike'))} title="Strikethrough">
            <Strikethrough size={18} />
          </button>
          <div className="w-[1px] h-6 bg-gray-300 dark:bg-[#343536] mx-1"></div>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={toggleClass(editor.isActive('heading', { level: 1 }))} title="Heading 1">
            <Heading1 size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={toggleClass(editor.isActive('heading', { level: 2 }))} title="Heading 2">
            <Heading2 size={18} />
          </button>
          <div className="w-[1px] h-6 bg-gray-300 dark:bg-[#343536] mx-1"></div>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={toggleClass(editor.isActive('bulletList'))} title="Bullet List">
            <List size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={toggleClass(editor.isActive('orderedList'))} title="Ordered List">
            <ListOrdered size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={toggleClass(editor.isActive('blockquote'))} title="Blockquote">
            <Quote size={18} />
          </button>
          <div className="w-[1px] h-6 bg-gray-300 dark:bg-[#343536] mx-1"></div>
        </>
      )}
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={toggleClass(editor.isActive('code'))} title="Inline Code">
        <Code size={18} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={toggleClass(editor.isActive('codeBlock'))} title="Code Block">
        <SquareTerminal size={18} />
      </button>
      <div className="w-[1px] h-6 bg-gray-300 dark:bg-[#343536] mx-1"></div>
      <div className="relative flex items-center">
        <button type="button" onClick={() => {
            const previousUrl = editor.getAttributes('link').href;
            if (previousUrl) {
              setLinkInput(previousUrl);
            } else {
              setLinkInput('');
            }
            setShowLinkModal(true);
          }} 
          className={toggleClass(editor.isActive('link'))} title="Link">
          <LinkIcon size={18} />
        </button>
        {/* Modern Link Modal */}
        {showLinkModal && (
          <>
          <div className="fixed inset-0 bg-black/50 z-[90] sm:hidden" onClick={() => setShowLinkModal(false)} />
          <div className="fixed z-[100] left-4 right-4 top-1/3 sm:absolute sm:top-full sm:mt-2 sm:left-0 sm:right-auto sm:bottom-auto p-3 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl shadow-2xl flex flex-col gap-2 min-w-[280px] animate-fade-in origin-top-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Insert Link</span>
              <button type="button" onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">✖</button>
            </div>
            <input 
              type="url" 
              autoFocus
              placeholder="https://example.com" 
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              className="bg-gray-50 dark:bg-[#272729] text-gray-900 dark:text-white border border-gray-300 dark:border-[#343536] p-2 rounded outline-none focus:border-blue-500 text-sm font-medium w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!linkInput) {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  } else if (editor.state.selection.empty) {
                    editor.chain().focus().insertContent(`<a href="${linkInput}">${linkInput}</a>`).run();
                  } else {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: linkInput }).run();
                  }
                  setShowLinkModal(false);
                }
              }}
            />
            <div className="flex gap-2 justify-end mt-1">
              {editor.isActive('link') && (
                <button 
                  type="button"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    setShowLinkModal(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                >
                  Remove
                </button>
              )}
              <button 
                type="button"
                onClick={() => {
                  if (!linkInput) {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  } else if (editor.state.selection.empty) {
                    editor.chain().focus().insertContent(`<a href="${linkInput}">${linkInput}</a>`).run();
                  } else {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: linkInput }).run();
                  }
                  setShowLinkModal(false);
                }}
                className="px-4 py-1.5 text-xs font-bold bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      {variant !== 'comment' && (
        <>
          <button 
            type="button" 
            onClick={() => imageInputRef.current?.click()} 
            disabled={isUploading}
            className={toggleClass(false)} 
            title="Upload Image"
          >
            <ImageIcon size={18} className={isUploading ? 'animate-pulse text-blue-500' : ''} />
          </button>
          <button 
            type="button" 
            onClick={() => videoInputRef.current?.click()} 
            disabled={isUploading}
            className={toggleClass(false)} 
            title="Upload Video (Max 10MB)"
          >
            <FilmIcon size={18} className={isUploading ? 'animate-pulse text-purple-500' : ''} />
          </button>
          <input 
            type="file" 
            ref={imageInputRef} 
            onChange={(e) => handleMediaUpload(e, 'image')} 
            accept="image/*" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={videoInputRef} 
            onChange={(e) => handleMediaUpload(e, 'video')} 
            accept="video/*" 
            className="hidden" 
          />
          
          {/* Fallback YouTube URL Button just in case */}
          <button type="button" onClick={() => {
              const url = window.prompt('YouTube URL:');
              if (url) {
                editor.chain().focus().setYoutubeVideo({ src: url }).run();
              }
            }} 
            className={toggleClass(editor.isActive('youtube'))} title="Add YouTube Video">
            <YoutubeIcon size={18} />
          </button>
          <div className="w-[1px] h-6 bg-gray-300 dark:bg-[#343536] mx-1"></div>
          <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={toggleClass(editor.isActive('table'))} title="Insert Table">
            <TableIcon size={18} />
          </button>
        </>
      )}

      <div className="relative flex items-center gap-1 group">
         <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={toggleClass(editor.isActive('highlight'))} title="Highlight Text">
           <Highlighter size={18} />
         </button>
         <input 
           type="color" 
           onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} 
           className="w-6 h-6 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0 z-10" 
           title="Choose Highlight Color"
         />
         <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: editor.getAttributes('highlight').color || '#ffff00' }}></div>
      </div>
      {variant !== 'comment' && (
        <div className="relative flex items-center gap-1 group ml-1">
           <button type="button" className={toggleClass(editor.isActive('textStyle'))} title="Text Color">
             <Palette size={18} />
           </button>
           <input 
             type="color" 
             onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} 
             className="w-6 h-6 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0 z-10" 
             title="Choose Text Color"
           />
           <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}></div>
        </div>
      )}
    </div>
  );
};

const TipTapEditor = ({ value, onChange, placeholder, minHeight = "150px", onPendingFile, variant = "default" }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      ResizeImage.extend({ name: 'image' }),
      Youtube.configure({
        controls: true,
        allowFullscreen: true,
      }),
      CustomVideo,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: placeholder || 'Write something amazing...',
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: `prose dark:prose-invert prose-sm sm:prose-base max-w-none px-4 py-4 focus:outline-none focus:ring-0 outline-none h-full prose-table:border-collapse prose-td:border prose-th:border prose-td:border-gray-300 dark:prose-td:border-[#343536] prose-th:bg-gray-100 dark:prose-th:bg-[#272729] prose-img:rounded-md prose-img:max-w-full prose-video:max-w-full`,
        style: `min-height: ${minHeight};`,
      },
    },
  });

  // Keep content in sync if value is cleared externally
  React.useEffect(() => {
    if (editor && value === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.setContent('');
    }
  }, [value, editor]);

  return (
    <div className="flex flex-col w-full h-full text-gray-900 dark:text-gray-100 font-sans transition-all resize-none sm:resize-y overflow-auto min-h-[150px]" style={{ minHeight }}>
      <MenuBar editor={editor} onPendingFile={onPendingFile} variant={variant} />
      <div className="flex-1 flex flex-col cursor-text bg-white dark:bg-[#1a1a1b] rounded-b-lg pb-2 h-full min-h-[150px] relative">
        <EditorContent editor={editor} className="flex-1 min-h-[150px] focus:outline-none flex flex-col [&>div]:flex-1" />
        <MediaFloatingDelete editor={editor} />
      </div>
    </div>
  );
};

export default TipTapEditor;
