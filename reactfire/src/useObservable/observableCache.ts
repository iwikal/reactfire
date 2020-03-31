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

  constructor(observable: Observable<T>, id: string, cache: ObservableCache) {
    this.resource = {
      read: () => {
        throw this.promise;
      }
    };

    this.observable = observable.pipe(
      resourcify(),
      finalize(() => cache.removeObservable(id, this)),
      tap(resource => (this.resource = resource)),
      share(),
      deferUnsubscribe(1000)
    );

    this.promise = this.observable
      .pipe(first())
      .toPromise()
      .then(resource => void resource.read());
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
