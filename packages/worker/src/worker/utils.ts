export interface ReplWorkerEvents {
  UpdateProgress: { progress: number, total: number }
  AtomUpdate: { id: string, value: any }

  QrCodeUpdate: { accountId: string, qrCode: string }
  QrCodeScanned: { accountId: string }
}

export function emitEvent<Event extends keyof ReplWorkerEvents>(event: Event, data: ReplWorkerEvents[Event]) {
  window.parent!.postMessage({ event, data }, '*')
}
