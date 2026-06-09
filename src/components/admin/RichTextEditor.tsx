import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
} from 'lucide-react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  onUploadImage: (file: File) => Promise<string>
  placeholder?: string
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-md border border-white/10 px-2 py-1.5 text-white/60 transition hover:border-amber-glow/40 hover:text-amber-glow"
    >
      {children}
    </button>
  )
}

/** 後台富文本編輯器（段落、標題、清單、連結、插圖） */
export function RichTextEditor({
  value,
  onChange,
  onUploadImage,
  placeholder = '撰寫文章內容…',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastEmittedRef = useRef(value)

  const emitChange = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? ''
    lastEmittedRef.current = html
    onChange(html)
  }, [onChange])

  useEffect(() => {
    const el = editorRef.current
    if (!el || el.innerHTML === value || value === lastEmittedRef.current) return
    el.innerHTML = value
    lastEmittedRef.current = value
  }, [value])

  const runCommand = (command: string, valueArg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, valueArg)
    emitChange()
  }

  const handleLink = () => {
    const url = window.prompt('輸入連結網址（https://）')
    if (!url?.trim()) return
    runCommand('createLink', url.trim())
  }

  const handleImagePick = () => {
    fileInputRef.current?.click()
  }

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const url = await onUploadImage(file)
      editorRef.current?.focus()
      document.execCommand('insertImage', false, url)
      emitChange()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '圖片上傳失敗')
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/15 bg-white/[0.03]">
      <div className="flex flex-wrap gap-1 border-b border-white/10 px-2 py-2">
        <ToolbarButton label="粗體" onClick={() => runCommand('bold')}>
          <Bold className="h-4 w-4" strokeWidth={1.75} />
        </ToolbarButton>
        <ToolbarButton label="斜體" onClick={() => runCommand('italic')}>
          <Italic className="h-4 w-4" strokeWidth={1.75} />
        </ToolbarButton>
        <ToolbarButton label="小標題" onClick={() => runCommand('formatBlock', 'h2')}>
          <Heading2 className="h-4 w-4" strokeWidth={1.75} />
        </ToolbarButton>
        <ToolbarButton label="次標題" onClick={() => runCommand('formatBlock', 'h3')}>
          <Heading3 className="h-4 w-4" strokeWidth={1.75} />
        </ToolbarButton>
        <ToolbarButton label="項目符號" onClick={() => runCommand('insertUnorderedList')}>
          <List className="h-4 w-4" strokeWidth={1.75} />
        </ToolbarButton>
        <ToolbarButton label="編號清單" onClick={() => runCommand('insertOrderedList')}>
          <ListOrdered className="h-4 w-4" strokeWidth={1.75} />
        </ToolbarButton>
        <ToolbarButton label="插入連結" onClick={handleLink}>
          <Link2 className="h-4 w-4" strokeWidth={1.75} />
        </ToolbarButton>
        <ToolbarButton label="插入圖片" onClick={handleImagePick}>
          <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
        </ToolbarButton>
      </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className="academy-rich-editor min-h-[220px] px-4 py-3 text-sm leading-relaxed text-white/85 outline-none"
        suppressContentEditableWarning
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          void handleImageFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
