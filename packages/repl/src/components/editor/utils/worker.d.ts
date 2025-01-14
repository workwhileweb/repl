declare module 'monaco-editor/esm/vs/language/typescript/ts.worker' {
  import type typescript from 'typescript'

  export class TypeScriptWorker {
    constructor(ctx: any, createData: any)
    getCompilationSettings(): ts.CompilerOptions
    getLanguageService(): ts.LanguageService
    getSyntacticDiagnostics(fileName: string): Promise<ts.Diagnostic[]>
  }

  export function initialize(callback: (ctx: any, createData: any) => TypeScriptWorker): void
  export const ts: { typescript: typeof typescript }
}
