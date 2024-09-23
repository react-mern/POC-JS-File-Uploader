import { EventEmitter } from 'events';
import { MultipartUpload } from './MultipleUpload';
import { SingleUpload } from './SingleUpload';

const STATUS = {
  PENDING: 'PENDING',
  INPROGRESS: 'INPROGRESS',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
  ABORTED: 'ABORTED',
};

interface UploadManagerSettings {
  max_uploads: number;
}

class UploadManager {
  pending = [];

  progress = [];

  done = [];

  error = [];

  abort = [];

  listeners = {};

  callbacks = {};

  connections = {};

  settings:UploadManagerSettings;

  EE: EventEmitter;

  on: any;

  off: any;

  constructor(settings = { max_uploads: 100 }) {
    this.settings = settings;
    this.EE = new EventEmitter();
    this.on = this.EE.on;
    this.off = this.EE.off;
  }

  removeElement(id, from) {
    const index = from.findIndex((i) => i.id === id);
    if (index >= 0) {
      return from.splice(index, 1)[0];
    }
    return null;
  }

  onError(item) {
    item.status = STATUS.ERROR;
    item.info?.callback?.onError?.(item);
    //
    this.error.push(item);
    this.EE.emit(`upload:${item.id}`, 'ERROR', { item });
    this.EE.emit('upload_update', 'ERROR', this.getStatus(), item);
    this.onFinished(item);
  }

  onAbort(item) {
    // debugger;
    item.status = STATUS.ABORTED;
    item.progress = -1;
    item.info?.callback?.onAbort?.(item);
    //
    this.abort.push(item);
    this.EE.emit(`upload:${item.id}`, 'ABORTED', { item });
    this.EE.emit('upload_update', 'ABORTED', this.getStatus(), item);
    this.onFinished(item);
  }

  onDone(item) {
    item.progress = 100;
    item.status = STATUS.COMPLETE;
    try {
      item.response = JSON.parse(item.xhr.responseText);
    } catch (ignore) {
      //
    }
    item.info?.callback?.onSuccess?.(item);
    this.callbacks?.[item.id]?.(item);
    //
    this.done.push(item);
    this.EE.emit(`upload:${item.id}`, 'DONE', {
      id: item.id,
      progress: 100,
      filename: item.info.file.name,
      response: item.response,
      item,
    });
    this.EE.emit('upload_update', 'DONE', this.getStatus(), item);
    this.onFinished(item);
  }

  onLoad(item) {
    // debugger;
    if (item.xhr.status >= 200 && item.xhr.status <= 299) {
      this.onDone(item);
    } else {
      this.onError(item);
    }
  }

  onFinished(item) {
    this.removeElement(item.id, this.pending);
    this.removeElement(item.id, this.progress);
    this.removeListeners(item);
    this.next();
  }

  onProgress(e, item) {
    const progress = e.total !== 0 ? Math.round((e.loaded / e.total) * 100) : 0;

    item.progress = progress;
    this.EE.emit(`upload:${item.id}`, 'PROGRESS', { item, progress });
    this.EE.emit('upload_update', 'PROGRESS', this.getStatus(), item);
    item.info.callback?.onProgress?.(item, progress);
  }

  onPrepare(item) {
    item.progress = -2;
    this.EE.emit(`upload:${item.id}`, 'PROGRESS', { item, progress: -2 });
    this.EE.emit('upload_update', 'PROGRESS', this.getStatus(), item);
    item.info.callback?.onProgress?.(item, item.progress);
  }

  startUpload(item) {
    const {
      url,
      method = 'POST',
      headers = {
      },
    } = item.info;

    if (!url) {
      throw new Error('No upload url provided');
    }

    item.status = STATUS.INPROGRESS;
    this.progress.push(item);

    const events = {
      load: (i) => this.onLoad({ ...item, ...i }),
      timeout: () => this.onError(item),
      error: () => this.onError(item),
      abort: () => this.onAbort(item),
      progress: (e) => this.onProgress(e, item),
      prepare: () => this.onPrepare(item),
    };

    if (item.info.multipart === true) {
      // MULTIPART UPLOAD
      this.connections[item.id] = new MultipartUpload(
        item.info.file,
        { headers },
        events
      );
    } else {
      // SINGLE UPLOAD
      this.connections[item.id] = new SingleUpload(
        item.info.file,
        {
          url,
          method,
          headers,
          formFields: item.info.formFields || {},
          fileField: item.info.fileField || 'file',
        },
        events
      );
    }
    this.connections[item.id]?.upload();
    this.EE.emit('upload_update', 'START', this.getStatus(), item);
  }

  addSuccessCallback(id, callback) {
    const item =
      this.findItem(id, this.pending) || this.findItem(id, this.progress);
    if (item) {
      this.callbacks[id] = callback;
    }
  }

  next() {
    if (
      this.progress.length < this.settings.max_uploads &&
      this.pending.length > 0 &&
      this.progress.length === 0
    ) {
      const item = this.pending.shift();
      if (item) {
        item.progress = -1;
        this.startUpload(item);
      }
    }
  }

  upload(info, type = 'video') {
    if (!info || !info.id || !info.origin) {
      throw new Error('Bad parameters');
    }
    const { id } = info;

    this.pending.push({
      id,
      type,
      status: STATUS.PENDING,
      info,
    });

    this.next();

    return id;
  }

  uploadFile(info) {
    return this.upload(info, 'file');
  }

  removeListeners(item) {
    try {
      item.xhr.removeEventListener('load', () => this.onLoad(item), false);
      item.xhr.removeEventListener('timeout', () => this.onError(item), false);
      item.xhr.removeEventListener('error', () => this.onError(item), false);
      item.xhr.removeEventListener('abort', () => this.onAbort(item), false);
      item.xhr.upload.removeEventListener(
        'progress',
        (e) => this.onProgress(e, item),
        false
      );
    } catch (e) {
      // console.log('@@@ unable to remove listener', item.id, reason);
    }
    delete this.listeners[item.id];
  }

  cancel(id, clear = false) {
    const item =
      this.findItem(id, this.pending) || this.findItem(id, this.progress);

    if (item) {
      if (this.connections?.[item.id]) {
        this.connections[item.id].cancel();
      }
      this.onAbort(item);
    }
    if (clear) {
      this.clear(id);
    }
  }

  cancelAll(origin) {
    const checkArray = [].concat(this.pending, this.progress);
    checkArray.forEach((item) => {
      if (origin) {
        if (item.info.origin === origin) {
          this.cancel(item.id);
        }
      } else {
        this.cancel(item.id);
      }
    });
  }

  findItem(id, where) {
    let ret = null;
    where.some((item) => {
      if (item.id === id) {
        ret = item;
        return true;
      }
      return false;
    });
    return ret;
  }

  getStatus(id = null) {
    if (id) {
      return (
        this.findItem(id, this.pending) ||
        this.findItem(id, this.error) ||
        this.findItem(id, this.abort) ||
        this.findItem(id, this.done) ||
        this.findItem(id, this.progress)
      );
    }

    return {
      abort: this.abort,
      pending: this.pending,
      progress: this.progress,
      done: this.done,
      error: this.error,
    };
  }

  isUploading(origin, id) {
    const checkArray = [].concat(this.pending, this.progress);

    if (id) {
      // check if there is item with given id in pending or progress state
      return checkArray.some((item) => item.id === id);
    }

    // check if there is any item with given origin in pending or progress state
    return checkArray.filter((item) => item.info.origin === origin).length > 0;
  }

  uploadCount(origin) {
    const checkArray = [].concat(this.pending, this.progress);
    return checkArray.filter((item) => item.info.origin === origin).length;
  }

  clear(id) {
    ['pending', 'progress', 'done', 'error', 'abort'].forEach((status) =>
      this.removeElement(id, this[status])
    );
  }

  clearAll() {
    ['pending', 'progress', 'done', 'error', 'abort'].forEach((status) => {
      this[status] = [];
    });
  }
}

export default UploadManager;
