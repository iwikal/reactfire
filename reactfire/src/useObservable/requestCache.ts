export class ActiveRequest {
  promise: Promise<any>;
  isComplete: boolean;
  value: any;
  error: any;

  constructor(promise: Promise<any>) {
    this.isComplete = false;
    this.promise = promise
      .then(result => {
        this.setValue(result);
        return result;
      })
      .catch(err => {
        this.isComplete = true;
        this.setError(err);
      });
  }

  setValue = (value: any) => {
    this.value = value;
    this.isComplete = true;
  };

  setError = (err: any) => {
    this.error = err;
    this.isComplete = true;
  };
}

/*
 * this will probably be replaced by something
 * like react-cache (https://www.npmjs.com/package/react-cache)
 * once that is stable.
 *
 * Full Suspense roadmap: https://reactjs.org/blog/2018/11/27/react-16-roadmap.html
 */
export class ObservablePromiseCache {
  activeRequests: Map<any, ActiveRequest>;

  constructor() {
    this.activeRequests = new Map();
  }

  getRequest(requestId: string) {
    const request = this.activeRequests.get(requestId);
    if (request === undefined) {
      throw new Error(`No request with ID "${requestId}" exists`);
    }
    return request;
  }

  createRequest(promise: Promise<any>, requestId: string): ActiveRequest {
    if (this.activeRequests.get(requestId) !== undefined) {
      throw new Error(`request "${requestId}" is already in use.`);
    }

    const request = new ActiveRequest(promise);
    this.activeRequests.set(requestId, request);

    return request;
  }

  createDedupedRequest(getPromise: () => Promise<any>, requestId: string) {
    let request = this.activeRequests.get(requestId);

    if (request === undefined) {
      request = this.createRequest(getPromise(), requestId);
    }

    return request;
  }

  removeRequest(requestId: string) {
    this.activeRequests.delete(requestId);
  }
}

const requestCache = new ObservablePromiseCache();

export function preloadRequest(
  getPromise: () => Promise<any>,
  requestId: string
): { requestId: string; request: ActiveRequest } {
  const request = requestCache.createDedupedRequest(getPromise, requestId);

  return {
    requestId: requestId,
    request
  };
}

export function usePreloadedRequest(preloadResult: { requestId: string }) {
  const request = requestCache.getRequest(preloadResult.requestId);

  // Suspend if we're not ready yet
  if (!request.isComplete) {
    throw request.promise;
  }

  if (request.error) {
    throw request.error;
  }

  return request.value;
}
