import { Observable } from 'rxjs';
import { share, tap, first } from 'rxjs/operators';
import { Resource } from '..';

function deferUnsubscribe<T>(timeout: number) {
  return (source: Observable<T>) =>
    new Observable<T>(subscriber => {
      const subscription = source.subscribe(
        val => subscriber.next(val),
        err => subscriber.error(err),
        () => subscriber.complete()
      );

      return () => {
        setTimeout(() => {
          subscription.unsubscribe();
        }, timeout);
      };
    });
}

function withCleanup<T>(cleanup: () => void) {
  return (source: Observable<T>) =>
    new Observable<T>(subscriber => {
      const subscription = source.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        cleanup();
      };
    });
}

type SuccessfulResult<T> = {
  success: true
  value: T
}

type FailedResult = {
  success: false
  error: any
}

type Result<T> = SuccessfulResult<T> | FailedResult

export class CacheEntry<T> implements Resource<T> {
  readonly observable: Observable<T>;
  readonly promise: Promise<T>;
  result?: Result<T>;

  constructor(observable: Observable<T>, id: string, cache: ObservableCache) {
    const cleanup = () => {
      cache.removeObservable(id, this);
    };

    this.observable = observable.pipe(
      withCleanup(cleanup),
      tap(
        value => (this.result = { success: true, value }),
        error => (this.result = { success: false, error })
      ),
      share(),
      deferUnsubscribe(1000)
    );

    this.promise = this.observable
      .pipe(first())
      .toPromise();
  }

  read() {
    if (!this.result) throw this.promise;
    if (!this.result.success) throw this.result.error;
    return this.result.value;
  }
}

export class ObservableCache {
  activeObservables: Map<string, CacheEntry<any>>;

  constructor() {
    this.activeObservables = new Map();
  }

  getObservable(observableId: string) {
    const observable = this.activeObservables.get(observableId);
    if (observable === undefined) {
      throw new Error(`No observable with ID "${observableId}" exists`);
    }
    return observable;
  }

  createDedupedObservable<T>(
    getObservable: () => Observable<T>,
    observableId: string
  ): CacheEntry<T> {
    let entry = this.activeObservables.get(observableId);

    if (entry === undefined) {
      entry = new CacheEntry(getObservable(), observableId, this);
      this.activeObservables.set(observableId, entry);
    }

    return entry;
  }

  removeObservable(observableId: string, instance: CacheEntry<unknown>) {
    if (this.activeObservables.get(observableId) === instance) {
      this.activeObservables.delete(observableId);
    }
  }
}
