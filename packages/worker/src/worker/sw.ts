import { swInvokeMethod } from '../sw/client.ts'

export class ReplWorkerSw {
  async uploadScript(params: {
    name: string
    files: Record<string, string>
  }) {
    return swInvokeMethod({ event: 'UPLOAD_SCRIPT', name: params.name, files: params.files })
  }

  async forgetScript(params: {
    name: string
  }) {
    return swInvokeMethod({ event: 'FORGET_SCRIPT', name: params.name })
  }
}
