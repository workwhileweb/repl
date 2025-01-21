// roughly based on https://github.com/jimmywarting/native-file-system-adapter

import { MessagePortSource } from './source.ts'

export interface DownloadFileParams {
  filename: string
  size?: number
}

const stateMap = new Map<string, DownloadFileParams & {
  stream: ReadableStream<Uint8Array>
}>()

export function handleDownload(id: string): Response {
  if (!stateMap.has(id)) return new Response(null, { status: 404 })
  const state = stateMap.get(id)!
  stateMap.delete(id)

  // Make filename RFC5987 compatible
  const fileName = encodeURIComponent(state.filename).replace(/['()]/g, escape).replace(/\*/g, '%2A')
  return new Response(state.stream, {
    headers: {
      'Content-Type': 'application/octet-stream; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
      ...(state.size ? { 'Content-Length': state.size.toString() } : {}),
    },
  })
}

export function handlePort(port: MessagePort, id: string, params: DownloadFileParams) {
  stateMap.set(id, {
    ...params,
    stream: new ReadableStream<Uint8Array>(
      new MessagePortSource(port),
      new CountQueuingStrategy({ highWaterMark: 4 }),
    ),
  })
}
