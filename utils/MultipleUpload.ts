export interface UploadPresignedUrl {
  part_number: string;
  url: string;
}

export interface UploadConfig {
  key_to_save: string;
  upload_id: string | null;
  presigned_urls: UploadPresignedUrl[];
  checksum_sha256: string;
}

export interface UploadPart {
  part_number: string | number;
  etag: string;
  checksum_sha256: string;
  _retry?: number;
}

export interface CryptObject {
  sha256: string;
  part_number: number;
  start_offset: number;
  length: number;
  _retry?: number;
}

const CHUNK_SIZE = 5; // MB
const MAX_CHUNKS = 1000;
const MAX_RETRIES = 1;
const RETRY_TIMEOUT = 10000;

function b2h(buffer: any) {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => `00${x.toString(16)}`.slice(-2))
    .join('');
}

function hexToBase64(hexstring: any) {
  return window.btoa(
    hexstring
      .match(/\w{2}/g)
      .map((a: any) => String.fromCharCode(parseInt(a, 16)))
      .join('')
  );
}

async function shaHash(file: any) {
  return hexToBase64(b2h(await crypto.subtle.digest('SHA-256', file)));
}

export class MultipartUpload {
  private concurrentUploads = 3;

  private chunk_size = 1024 * 1024 * CHUNK_SIZE;

  private file: File;

  private file_name: string | null = null;

  private file_size = 0;

  private config: UploadConfig | null = null;

  private part_etags: UploadPart[] = [];

  private headers: any[];

  private events: any;

  private progress: number[] = [0];

  private total_progress = 0;

  private connections: any = {};

  private canceled = false;

  private hashes: any[] = [];

  private parts: any[] = [];

  private online = true;

  constructor(file: File, options: any, events: any) {
    // Initialize upload properties
    this.file = file;
    this.file_name = file.name;
    this.file_size = file.size;
    this.headers = options?.headers || [];
    this.events = events;

    // Set up network status listeners
    window.addEventListener('online', () => {
      console.log('Back ONLINE');
      this.online = true;
      this.update('ONLINE');
      this.sendNext();
    });
    window.addEventListener('offline', () => {
      console.log('Went OFFLINE');
      this.online = false;
      this.update('OFFLINE');
    });
  }

  // Generate SHA-256 hashes for each chunk of the file
  private async generateHashes(): Promise<CryptObject[]> {
    const chunk_count = Math.ceil(this.file_size / this.chunk_size);
    if (chunk_count > MAX_CHUNKS) {
      this.chunk_size = Math.ceil(this.file_size / MAX_CHUNKS);
      return this.generateHashes();
    }
    const array = Array.from({ length: chunk_count }, (value, index) => index);
    const hashes: CryptObject[] = [];
    await array.reduce(async (accumulatorPromise: any, i: number) => {
      const start_offset = i * this.chunk_size;
      const length = Math.min(this.chunk_size, this.file_size - start_offset);

      const accumulator = await accumulatorPromise;
      const hash = await this.crypt(
        this.file.slice(start_offset, start_offset + length),
        i + 1,
        start_offset,
        length
      );
      hashes.push(hash);
      return [...accumulator, hash];
    }, Promise.resolve([]));
    return hashes;
  }

  // Handle upload completion or errors
  private async complete(e?: any) {
    if (e?.message === 'CHUNK_UPLOAD_FAILED') {
      this.cancel();
      this.events.error(e);
      return;
    }
    if (e !== undefined && !this.canceled) {
      this.events.error(e);
      return;
    }

    if (this.canceled) {
      this.events.abort();
      return;
    }

    if (e !== undefined) {
      this.events.error(e);
      return;
    }

    try {
      await this.sendCompleteRequest();
    } catch (error) {
      this.events.error(e);
    }
  }

  // Send the complete request to finalize the multipart upload
  private async sendCompleteRequest() {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/multipart-upload/complete`,
      {
        method: 'POST',
        headers: { ...this.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_to_save: this.config?.key_to_save,
          upload_id: this.config?.upload_id,
          parts: this.part_etags.sort((a, b) => {
            if (a.part_number < b.part_number) {
              return -1;
            }
            if (a.part_number > b.part_number) {
              return 1;
            }
            return 0;
          }),
        }),
      }
    );

    const responseText = await response.text();
    this.events.load({
      xhr: {
        status: response.status,
        responseText,
      },
    });
    return response;
  }

  // Upload a single chunk of the file
  private uploadChunk(
    chunk: any,
    part: UploadPart,
    checksum: string,
    onStarted: any
  ) {
    return new Promise((resolve, reject) => {
      if (!this.config) {
        return;
      }

      const index = Number(part.part_number) - 1;
      const { url } = this.config.presigned_urls[index];

      const xhr = new XMLHttpRequest();
      this.connections[index] = xhr;
      onStarted();

      xhr.open('PUT', url);

      xhr.upload.addEventListener(
        'progress',
        (e) => {
          const progress = e.total !== 0 ? (e.loaded / e.total) * 100 : 0;
          this.progress[index] = progress;
          this.update('PROGRESS');
        },
        false
      );

      xhr.addEventListener('load', () => this.update('PROGRESS'), false);
      xhr.addEventListener(
        'error',
        () => {
          if (this.online) {
            this.update('ERROR');
          }
        },
        false
      );
      xhr.addEventListener('timeout', () => this.update('TIMEOUT'), false);

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            const ETag = xhr.getResponseHeader('ETag');
            const Cheksum = xhr.getResponseHeader('x-amz-checksum-sha256');
            if (ETag) {
              this.part_etags.push({
                part_number: part.part_number,
                etag: ETag.replaceAll('"', ''),
                checksum_sha256: Cheksum || '',
              });
              delete this.connections[index];
              resolve(xhr.status);
            }
          } else {
            reject(xhr.status);
          }
        }
      };

      xhr.onerror = (error) => {
        reject(error);
        delete this.connections[index];
      };

      xhr.onabort = () => {
        reject(new Error('Upload canceled by user'));
        delete this.connections[index];
      };

      xhr.send(chunk);
    });
  }

  // Send a chunk and handle retries if necessary
  private async sendChunk(
    chunk: any,
    part: UploadPart,
    checksum: string,
    onStart: any
  ) {
    return new Promise((resolve, reject) => {
      this.uploadChunk(chunk, part, checksum, onStart)
        .then((status) => {
          if (status !== 200) {
            reject(new Error('CHUNK_UPLOAD_FAILED'));
            return;
          }
          resolve(status);
        })
        .catch(async (error: any) => {
          if (this.canceled) {
            return;
          }
          if (part._retry === undefined) {
            part._retry = 0;
          }
          if (!this.online) {
            this.parts.unshift(part);
          } else if (part._retry < MAX_RETRIES) {
            part._retry += 1;
            delete this.connections[Number(part.part_number) - 1];
            this.parts.unshift(part);
          } else {
            reject(new Error('CHUNK_UPLOAD_FAILED'));
          }
        });
    });
  }

  // Send the next chunk in the queue
  private sendNext() {
    const connections = Object.keys(this.connections).length;
    const ccu = this.concurrentUploads;

    if (connections >= ccu) {
      return;
    }

    if (!this.parts.length) {
      if (!connections) {
        this.complete();
      }
      return;
    }

    const part = this.parts.shift();
    if (this.file && part) {
      const index = part.part_number - 1;

      const { sha256, start_offset, length } = this.hashes[index];

      const chunk = this.file.slice(start_offset, start_offset + length);

      this.sendChunk(chunk, part, sha256, () => this.sendNext())
        .then(() => {
          if (this.online) {
            this.sendNext();
          }
        })
        .catch((e: any) => this.complete(e));
    }
  }

  // Start the upload process
  public async upload() {
    try {
      // Calculate hashes for all chunks
      const from = +new Date();
      this.events?.prepare?.();
      this.hashes = await this.generateHashes();

      // Initialize the multipart upload
      const init_response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/multipart-upload`,
        {
          method: 'POST',
          headers: { ...this.headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: this.file_name,
            file_size: this.file_size,
            parts: this.hashes.map((hash) => ({
              part_number: hash.part_number,
              checksum_sha256: hash.sha256,
            })),
          }),
        }
      );

      // Handle upload cancellation
      if (this.canceled) {
        this.events.abort();
        return null;
      }

      if (init_response.ok) {
        this.config = await init_response.json();
        if (this.config?.presigned_urls?.length) {
          this.total_progress = this.config.presigned_urls.length * 100;
          this.progress = new Array(this.config.presigned_urls.length).fill(-1);
          this.parts.push(
            ...this.config.presigned_urls.map((entry: any) => ({
              ...entry,
              _retry: 0,
            }))
          );

          // Start uploading chunks
          this.sendNext();
        }
      }
    } catch (e: any) {
      this.events.error(e);
    }
    return null;
  }

  // Cancel the upload process
  public cancel() {
    this.canceled = true;
    Object.values(this.connections).forEach((connection: any) => {
      connection?.abort?.();
    });
  }

  // Update upload status and trigger events
  private update(event: string) {
    switch (event) {
      default:
        break;
      case 'PROGRESS': {
        const loaded = this.progress.reduce((a, b) => a + b, 0);
        this.events.progress({
          total: this.total_progress,
          loaded,
        });
        break;
      }
      case 'ERROR':
      case 'TIMEOUT': {
        this.cancel();
        this.events.error();
        break;
      }
      case 'OFFLINE':
        this.events.offline?.();
        break;
      case 'ONLINE':
        this.events.online?.();
        break;
    }
  }

  // Generate SHA-256 hash for a chunk
  private async crypt(
    blob: any,
    part_number: number,
    start_offset: number,
    length: number
  ): Promise<CryptObject> {
    return new Promise((resolve) => {
      const filereader = new FileReader();
      filereader.readAsArrayBuffer(blob);
      filereader.onloadend = async function c(entry: any) {
        const hash = await shaHash(entry.target.result);
        resolve({
          sha256: hash,
          part_number,
          start_offset,
          length,
          _retry: 0,
        });
      };
    });
  }
}
