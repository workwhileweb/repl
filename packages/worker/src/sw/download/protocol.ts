export const SW_DOWNLOAD_OPCODE = {
  WRITE: 0,
  PULL: 0,
  ERROR: 1,
  ABORT: 1,
  CLOSE: 2,
  PING: 3,
}

export interface SwDownloadMessage {
  type: number
  chunk?: Uint8Array
  reason?: any
}
