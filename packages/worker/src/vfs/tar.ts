import type { IReadable } from '@fuman/io'
import type { UnsafeMutable, Values } from '@fuman/utils'
import { read } from '@fuman/io'
import { typed, utf8 } from '@fuman/utils'

const BLOCK_SIZE = 512

const USTAR_MAGIC = /* #__PURE__ */ utf8.encoder.encode('ustar\x00')
const GNU_MAGIC = /* #__PURE__ */ utf8.encoder.encode('ustar\x20')
const GNU_VER = /* #__PURE__ */ utf8.encoder.encode('\x20\x00')

const TAR_ENTRY_TYPES = {
  0: 'file',
  1: 'link',
  2: 'symlink',
  3: 'characterDevice',
  4: 'blockDevice',
  5: 'directory',
  6: 'fifo',
  7: 'contiguousFile',
} as const
type TarEntryType = Values<typeof TAR_ENTRY_TYPES> | 'unknown'

function readString(buf: Uint8Array): string {
  const zeroIdx = buf.indexOf(0)
  if (zeroIdx !== -1) buf = buf.subarray(0, zeroIdx)

  return utf8.decoder.decode(buf)
}

function readOctalInteger(buf: Uint8Array): number {
  if (buf[0] & 0x80) {
    // If prefixed with 0x80 then parse as a base-256 integer
    // currently mostly copy-pasted from node-tar, but we should check if we can simplify this

    // first byte MUST be either 80 or FF
    // 80 for positive, FF for 2's comp
    let positive
    if (buf[0] === 0x80) {
      positive = true
    } else if (buf[0] === 0xFF) {
      positive = false
    } else {
      return 0
    }

    // build up a base-256 tuple from the least sig to the highest
    let zero = false
    const tuple: number[] = []
    for (let i = buf.length - 1; i > 0; i--) {
      const byte = buf[i]
      if (positive) {
        tuple.push(byte)
      } else if (zero && byte === 0) {
        tuple.push(0)
      } else if (zero) {
        zero = false
        tuple.push(0x100 - byte)
      } else {
        tuple.push(0xFF - byte)
      }
    }

    let sum = 0
    const l = tuple.length
    for (let i = 0; i < l; i++) {
      sum += tuple[i] * 256 ** i
    }

    return positive ? sum : -1 * sum
  }

  let res = 0
  let prefix = true

  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i]
    if (prefix) {
      // some tar implementations prefix with spaces.
      // zeroes would work fine with the below, but we can also just skip them
      if (byte === 0x20 || byte === 0x00) continue
      else prefix = false
    } else if (byte === 0 || byte === 0x20) {
      // some tar implementations also use spaces as terminators
      break
    }

    res = (res << 3) | (buf[i] - 0x30)
  }

  return res
}

function checksum(block: Uint8Array): number {
  let sum = 8 * 32
  for (let i = 0; i < 148; i++) sum += block[i]
  for (let j = 156; j < 512; j++) sum += block[j]
  return sum
}

interface TarHeader {
  readonly name: string
  readonly type: TarEntryType
  readonly typeflag: number
  readonly linkName: string | null
  readonly size: number
  readonly mtime: Date
  readonly mode: number
  readonly uid: number
  readonly gid: number
  readonly uname: string
  readonly gname: string
  readonly devMajor: number
  readonly devMinor: number
  readonly pax?: Record<string, string>
}

function parseHeader(buffer: Uint8Array): TarHeader | null {
  let typeflag = buffer[156] === 0 ? 0 : buffer[156] - 0x30

  const name = readString(buffer.subarray(0, 100))
  const mode = readOctalInteger(buffer.subarray(100, 108))
  const uid = readOctalInteger(buffer.subarray(108, 116))
  const gid = readOctalInteger(buffer.subarray(116, 124))
  const size = readOctalInteger(buffer.subarray(124, 136))
  const mtime = new Date(1000 * readOctalInteger(buffer.subarray(136, 148)))
  const linkName = buffer[157] === 0 ? null : readString(buffer.subarray(157, 257))
  const uname = readString(buffer.subarray(265, 297))
  const gname = readString(buffer.subarray(297, 329))
  const devMajor = readOctalInteger(buffer.subarray(329, 337))
  const devMinor = readOctalInteger(buffer.subarray(337, 345))

  const sum = checksum(buffer)

  // checksum is still initial value if header was null.
  if (sum === 8 * 32) {
    return null
  }

  if (sum !== readOctalInteger(buffer.subarray(148, 156))) {
    throw new Error('Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?')
  }

  const magic = buffer.subarray(257, 263)

  if (typed.equal(magic, USTAR_MAGIC)) {
    // ustar (posix) format. prepend prefix, if present.
    if (buffer[354] !== 0) {
      readString(buffer.subarray(345, 354))
    }
  } else if (typed.equal(magic, GNU_MAGIC) && typed.equal(buffer.subarray(263, 265), GNU_VER)) {
    // 'gnu'/'oldgnu' format. Similar to ustar, but has support for incremental and
    // multi-volume tarballs.
  } else {
    throw new Error('Invalid tar header: unknown format')
  }

  // to support old tar versions that use trailing / to indicate dirs
  if (typeflag === 0 && name[name.length - 1] === '/') {
    typeflag = 5
  }

  return {
    name,
    type: TAR_ENTRY_TYPES[typeflag as keyof typeof TAR_ENTRY_TYPES] ?? 'unknown',
    typeflag,
    linkName,
    size,
    mtime,
    mode,
    uid,
    gid,
    uname,
    gname,
    devMajor,
    devMinor,
  }
}

function parsePaxHeader(buffer: Uint8Array): Record<string, string> | null {
  const result: Record<string, string> = {}

  while (buffer.length > 0) {
    let i = 0
    while (i < buffer.length && buffer[i] !== 32) {
      i++
    }

    const len = Number.parseInt(utf8.decoder.decode(buffer.subarray(0, i)), 10)

    if (len === 0) {
      return result
    }

    const b = utf8.decoder.decode(buffer.subarray(i + 1, len - 1))
    const keyIndex = b.indexOf('=')

    if (keyIndex === -1) {
      return result
    }

    result[b.slice(0, keyIndex)] = b.slice(keyIndex + 1)
    buffer = buffer.subarray(len)
  }

  return result
}

export interface TarEntry {
  readonly header: TarHeader
  readonly content?: IReadable
}

class FileStream implements IReadable {
  #inner: IReadable
  #pos = 0

  constructor(inner: IReadable, readonly size: number) {
    this.#inner = inner
  }

  get remaining(): number {
    return this.size - this.#pos
  }

  async read(into: Uint8Array): Promise<number> {
    const remaining = this.size - this.#pos
    if (remaining === 0) {
      return 0
    }

    if (into.length > remaining) {
      into = into.subarray(0, remaining)
    }

    const nread = await this.#inner.read(into)
    if (nread === 0) return 0
    this.#pos += nread

    return nread
  }
}

async function readNextHeader(readable: IReadable): Promise<TarHeader | null> {
  let nextLongPath: string | null = null
  let nextLongLinkPath: string | null = null
  let paxGlobalHeader: Record<string, string> | null = null
  let nextPaxHeader: Record<string, string> | null = null

  while (true) {
    const block = await read.async.exactly(readable, BLOCK_SIZE, 'truncate')
    if (block.length < BLOCK_SIZE) return null // eof

    const header = parseHeader(block) as UnsafeMutable<TarHeader>
    if (header === null) continue

    switch (header.typeflag) {
      case 28:
      case 30: {
        // gnu long path
        const nextBlock = await read.async.exactly(readable, BLOCK_SIZE)
        nextLongPath = readString(nextBlock.subarray(0, header.size))
        continue
      }
      case 27: {
        // gnu long link path
        const nextBlock = await read.async.exactly(readable, BLOCK_SIZE)
        nextLongLinkPath = readString(nextBlock.subarray(0, header.size))
        continue
      }
      case 72: {
        // pax header
        const nextBlock = await read.async.exactly(readable, BLOCK_SIZE)
        nextPaxHeader = parsePaxHeader(nextBlock.subarray(0, header.size))
        if (paxGlobalHeader != null) {
          nextPaxHeader = { ...paxGlobalHeader, ...nextPaxHeader }
        }
        continue
      }
      case 55: {
        // pax global header
        const nextBlock = await read.async.exactly(readable, BLOCK_SIZE)
        paxGlobalHeader = parsePaxHeader(nextBlock.subarray(0, header.size))
        continue
      }
    }

    if (nextLongPath != null) {
      header.name = nextLongPath
      nextLongPath = null
    }

    if (nextLongLinkPath != null) {
      header.linkName = nextLongLinkPath
      nextLongLinkPath = null
    }

    if (nextPaxHeader != null) {
      if (nextPaxHeader.path != null) {
        header.name = nextPaxHeader.path
      }

      if (nextPaxHeader.linkpath != null) {
        header.linkName = nextPaxHeader.linkpath
      }

      if (nextPaxHeader.size != null) {
        header.size = Number.parseInt(nextPaxHeader.size, 10)
      }

      header.pax = nextPaxHeader
      nextPaxHeader = null
    }

    return header
  }
}

export function extractTar(readable: IReadable): AsyncIterableIterator<TarEntry> {
  let prevContent: FileStream | null = null

  const iterator: AsyncIterableIterator<TarEntry> = {
    [Symbol.asyncIterator]: () => iterator,
    next: async () => {
      if (prevContent != null) {
        // make sure the previous content is fully read
        if (prevContent.remaining > 0) {
          await read.async.exactly(readable, prevContent.remaining)
        }

        // skip padding after the file, if any
        const paddedSize = prevContent.size % BLOCK_SIZE
        if (paddedSize > 0) {
          await read.async.exactly(readable, BLOCK_SIZE - paddedSize)
        }

        prevContent = null
      }

      const header = await readNextHeader(readable)
      if (header === null) return { done: true, value: undefined }

      if (header.size === 0 || header.typeflag === 5) {
        // directory or empty file
        return { done: false, value: { header } }
      }

      const content = new FileStream(readable, header.size)
      prevContent = content

      return {
        done: false,
        value: { header, content },
      }
    },
  }

  return iterator
}
