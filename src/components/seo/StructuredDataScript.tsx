interface StructuredDataScriptProps {
  id: string
  data: Record<string, unknown>
}

/** 輸出 JSON-LD 結構化資料 */
export function StructuredDataScript({ id, data }: StructuredDataScriptProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
