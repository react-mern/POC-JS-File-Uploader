export class SingleUpload {
  private file: File;

  private url: string;

  private headers: any[];

  private method: 'POST' | 'PUT';

  private options: any;

  private events: any;

  private progress: number[] = [0];

  private total_progress = 100;

  private connections: any[] = [];

  private canceled = false;

  constructor(file: File, options: any, events: any) {
    // Initialize upload properties
    this.file = file;
    this.headers = options?.headers;
    this.events = events;
    this.options = options;
    this.url = options.url;
    this.method = options.method || 'POST';
  }

  public upload() {
    if (this.canceled) {
      this.events.abort();
      return;
    }
    try {
      const xhr = new XMLHttpRequest();
      this.connections.push(xhr);
      xhr.open(this.method, this.url);

      // Set custom headers if provided
      if (this.headers) {
        Object.keys(this.headers).forEach((header) =>
          xhr.setRequestHeader(header, this.headers[header as any])
        );
      }

      const form = new FormData();
      const fileField = this.options?.fileField || 'file';

      form.append(fileField, this.file);
      

      // Append additional form fields if provided
      if (this.options?.formFields) {
        Object.keys(this.options.formFields || {}).forEach((key) => {
          form.append(key, this.options.formFields[key]);
        });
      }

      // Set up event listeners for upload progress and completion
      xhr.upload.addEventListener(
        'progress',
        (e) => {
          const progress = e.total !== 0 ? (e.loaded / e.total) * 100 : 0;
          this.progress[0] = progress;
          this.update('PROGRESS');
        },
        false
      );

      xhr.addEventListener(
        'load',
        () => {
          this.update('LOAD', xhr);
        },
        false
      );
      let body;
      for (const entry of form.entries()) {
        body = JSON.stringify(entry[1]);
      }
      xhr.addEventListener('error', () => this.update('ERROR'), false);
      xhr.addEventListener('timeout', () => this.update('TIMEOUT'), false);
      xhr.send(form);
    } catch (e) {
      this.events.error();
    }
  }

  private update(event: string, xhr?: any) {
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
      case 'LOAD': {
        this.events.load({
          xhr: {
            status: xhr.status,
            responseText: xhr.responseText,
          },
        });
      }
    }
  }

  public cancel() {
    this.canceled = true;
    this.connections.forEach((connection) => {
      connection.abort();
    });
  }
}
