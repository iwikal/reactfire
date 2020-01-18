import { Observable } from 'rxjs';
import { finalize, share, tap, first } from 'rxjs/operators';

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
      const subscription = source.pipe(finalize(cleanup)).subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        cleanup();
      };
    });
}

export class CacheEntry<T> {
  readonly observable: Observable<T>;
  readonly promise: Promise<T>;
  read: () => T;

  constructor(observable: Observable<T>, id: string, cache: ObservableCache) {
    this.read = () => {
      throw this.promise;
    };

    const cleanup = () => cache.removeObservable(id, this);

    this.observable = observable.pipe(
      withCleanup(cleanup),
      tap(
        value => {
          this.read = () => value;
        },
        err => {
          this.read = () => {
            throw err;
          };
        }
      ),
      share()
    );

    this.promise = this.observable
      .pipe(
        deferUnsubscribe(1000),
        first()
      )
      .toPromise();
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
