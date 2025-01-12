// roughly based on https://github.com/microsoft/TypeScript-Website/blob/v2/packages/typescript-vfs/src/index.ts

import type { CompilerHost, CompilerOptions, SourceFile, System } from 'typescript'

import type { VfsStorage } from './storage'

import { iter, utf8 } from '@fuman/utils'

function notImplemented(methodName: string): any {
  throw new Error(`Method '${methodName}' is not implemented.`)
}

// "/DOM.d.ts" => "/lib.dom.d.ts"
const libize = (path: string) => path.replace('/', '/lib.').toLowerCase()

export function createSystem(files: Map<string, Uint8Array>): System {
  return {
    args: [],
    createDirectory: () => notImplemented('createDirectory'),
    // TODO: could make a real file tree
    directoryExists: (directory) => {
      return Array.from(files.keys()).some(path => path.startsWith(directory))
    },
    exit: () => notImplemented('exit'),
    fileExists: fileName => files.has(fileName) || files.has(libize(fileName)),
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    getExecutingFilePath: () => notImplemented('getExecutingFilePath'),
    readDirectory: (directory) => {
      return (directory === '/' ? Array.from(files.keys()) : [])
    },
    readFile: (fileName) => {
      const bytes = files.get(fileName) ?? files.get(libize(fileName))
      if (!bytes) return undefined

      return utf8.decoder.decode(bytes)
    },
    resolvePath: path => path,
    newLine: '\n',
    useCaseSensitiveFileNames: true,
    write: () => notImplemented('write'),
    writeFile: (fileName, contents) => {
      files.set(fileName, utf8.encoder.encode(contents))
    },
    deleteFile: (fileName) => {
      files.delete(fileName)
    },
  }
}

export function createVirtualCompilerHost(
  sys: System,
  compilerOptions: CompilerOptions,
  ts: typeof import('typescript'),
) {
  const sourceFiles = new Map<string, SourceFile>()
  const save = (sourceFile: SourceFile) => {
    sourceFiles.set(sourceFile.fileName, sourceFile)
    return sourceFile
  }

  interface Return {
    compilerHost: CompilerHost
    updateFile: (sourceFile: SourceFile) => boolean
    deleteFile: (sourceFile: SourceFile) => boolean
  }

  const vHost: Return = {
    compilerHost: {
      ...sys,
      getCanonicalFileName: fileName => fileName,
      getDefaultLibFileName: () => '/lib.d.ts',
      // getDefaultLibLocation: () => '/',
      getNewLine: () => sys.newLine,
      getSourceFile: (fileName, languageVersionOrOptions) => {
        const existing = sourceFiles.get(fileName)
        if (existing) return existing

        const content = sys.readFile(fileName)
        if (!content) return undefined

        return save(
          ts.createSourceFile(
            fileName,
            content,
            languageVersionOrOptions ?? compilerOptions.target ?? ts.ScriptTarget.ESNext,
            false,
          ),
        )
      },
      useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames,
    },
    updateFile: (sourceFile) => {
      const alreadyExists = sourceFiles.has(sourceFile.fileName)
      sys.writeFile(sourceFile.fileName, sourceFile.text)
      sourceFiles.set(sourceFile.fileName, sourceFile)
      return alreadyExists
    },
    deleteFile: (sourceFile) => {
      const alreadyExists = sourceFiles.has(sourceFile.fileName)
      sourceFiles.delete(sourceFile.fileName)
      sys.deleteFile!(sourceFile.fileName)
      return alreadyExists
    },
  }
  return vHost
}

export async function createFilesMapFromVfs(vfs: VfsStorage, libs: string[]): Promise<Map<string, Uint8Array>> {
  const files = await Promise.all(libs.map(lib => vfs.readLibrary(lib)))
  const fileMap = new Map<string, Uint8Array>()

  for (const [idx, list] of iter.enumerate(files)) {
    const lib = libs[idx].split(':')[1]
    const prefix = `/node_modules/${lib}`

    for (const file of list) {
      const fullPath = prefix + (file.path[0] === '/' ? file.path : `/${file.path}`)
      fileMap.set(fullPath, file.contents)
    }
  }

  return fileMap
}
