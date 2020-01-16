import { Observable } from 'rxjs';
import { share, tap, first } from 'rxjs/operators';

export class CacheEntry<T> {
  readonly observable: Observable<T>;
  readonly promise: Promise<T>;
  read: () => T;

  constructor(observable: Observable<T>) {
    this.read = () => {
      throw this.promise;
    };

    this.observable = observable.pipe(share()).pipe(
      tap(value => {
        this.read = () => value;
      })
    );

    this.promise = this.observable
      .pipe(first())
      .toPromise()
      .catch(err => {
        this.read = () => {
          throw err;
        };
        throw err;
      });
  }
}

/*
 * this will probably be replaced by something
 * like react-cache (https://www.npmjs.com/package/react-cache)
 * once that is stable.
 *
 * Full Suspense roadmap: https://reactjs.org/blog/2018/11/27/react-16-roadmap.html
 */
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

  createObservable<T>(
    observable: Observable<T>,
    observableId: string
  ): CacheEntry<T> {
    if (this.activeObservables.get(observableId) !== undefined) {
      throw new Error(`observable "${observableId}" is already in use.`);
    }

    const entry = new CacheEntry(observable);
    this.activeObservables.set(observableId, entry);

    return entry;
  }

  createDedupedObservable<T>(
    getObservable: () => Observable<T>,
    observableId: string
  ): CacheEntry<T> {
    let observable = this.activeObservables.get(observableId);

    if (observable === undefined) {
      observable = this.createObservable(getObservable(), observableId);
    }

    return observable;
  }

  removeObservable(observableId: string) {
    this.activeObservables.delete(observableId);
  }
}
