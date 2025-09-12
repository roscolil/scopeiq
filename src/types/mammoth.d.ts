declare module 'mammoth' {
  interface ConvertResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }
  interface ConvertOptions {
    styleMap?: string[]
    includeDefaultStyleMap?: boolean
  }
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: ConvertOptions,
  ): Promise<ConvertResult>
}
