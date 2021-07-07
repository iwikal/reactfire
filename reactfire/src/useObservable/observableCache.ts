import { Observable } from 'rxjs';
import { share, tap, first, finalize } from 'rxjs/operators';
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

function resourcify<T>() {
  return (source: Observable<T>) =>
    new Observable<Resource<T>>(subscriber =>
      source.subscribe(
        value => subscriber.next({ read: () => value }),
        error =>
          subscriber.next({
            read: () => {
              throw error;
            }
          }),
        () => subscriber.complete()
      )
    );
}

export class CacheEntry<T> {
  readonly observable: Observable<Resource<T>>;
  readonly promise: Promise<void>;
  resource: Resource<T>;

  constructor(observable: Observable<T>, timeout: number, cleanup: () => void) {
    this.resource = {
      read: () => {
        throw this.promise;
      }
    };

    this.observable = observable.pipe(
      resourcify(),
      finalize(cleanup),
      tap(resource => (this.resource = resource)),
      share(),
      deferUnsubscribe(timeout)
    );

    this.promise = this.observable
      .pipe(first())
      .toPromise()
      .then(resource => void resource.read());
  }
}

export class ObservableCache {
  activeObservables: Map<string, CacheEntry<any>>;
  timeout: number;

  constructor({ timeout = 30000 } = {}) {
    this.activeObservables = new Map();
    this.timeout = timeout;
  }

  insert<T>(key: string, observable: Observable<T>): CacheEntry<T> {
    const entry: CacheEntry<T> = new CacheEntry(observable, this.timeout, () =>
      this.remove(key, entry)
    );
    this.activeObservables.set(key, entry);
    return entry;
  }

  getOrInsert<T>(key: string, observable: Observable<T>): CacheEntry<T> {
    const entry =
      this.activeObservables.get(key) || this.insert(key, observable);

    return entry as CacheEntry<T>;
  }

  remove(key: string, instance: CacheEntry<unknown>) {
    if (this.activeObservables.get(key) === instance) {
      this.activeObservables.delete(key);
    }
  }
}
