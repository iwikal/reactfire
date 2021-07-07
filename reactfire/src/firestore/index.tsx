import React from 'react';
import { firestore } from 'firebase/app';
import { Observable } from 'rxjs';
import { skipWhile } from 'rxjs/operators';
import { useObservable } from '../useObservable';
import { CacheEntry } from '../useObservable/observableCache';
import { Resource } from '../resource';
import { ReactFireOptions } from '../options';

function queryObservable<T>(
  query: firestore.Query<T>,
  options: ReactFireOptions = {}
) {
  const { skipCache = false } = options;
  const observable = new Observable<firestore.QuerySnapshot<T>>(subscriber =>
    query.onSnapshot({ includeMetadataChanges: skipCache }, subscriber)
  );

  if (skipCache) {
    return observable.pipe(skipWhile(snap => snap.metadata.fromCache));
  } else {
    return observable;
  }
}

type Bucket = Map<firestore.Query<unknown>, CacheEntry<unknown>>;

class QueryCache {
  private buckets = new Map<string, Bucket>();
  private readonly timeout = 30000;

  private insert<T>(query: firestore.Query<T>, options: ReactFireOptions = {}) {
    const entry: CacheEntry<firestore.QuerySnapshot<T>> = new CacheEntry(
      queryObservable(query, options),
      this.timeout,
      () => this.remove(query, options, entry)
    );
    const hash = hashOptions(options);
    const bucket: Bucket = this.buckets.get(hash) || new Map();
    this.buckets.set(hash, bucket);
    bucket.set(query, entry);
    return entry;
  }

  // FIXME: take options into consideration
  private get<T>(
    query: firestore.Query<T>,
    options: ReactFireOptions = {}
  ): CacheEntry<firestore.QuerySnapshot<T>> | undefined {
    const bucket = this.buckets.get(hashOptions(options));
    if (!bucket) return undefined;

    const entry = bucket.get(query);
    if (entry) return entry as CacheEntry<firestore.QuerySnapshot<T>>;

    const q: firestore.Query<unknown> = query;
    for (const [query, entry] of bucket) {
      if (q.isEqual(query)) {
        return entry as CacheEntry<firestore.QuerySnapshot<T>>;
      }
    }
  }

  getOrInsert<T>(
    query: firestore.Query<T>,
    options: ReactFireOptions | undefined
  ): CacheEntry<firestore.QuerySnapshot<T>> {
    return this.get(query, options) || this.insert(query, options);
  }

  private remove<T>(
    query: firestore.Query<T>,
    options: ReactFireOptions,
    entry: CacheEntry<firestore.QuerySnapshot<T>>
  ) {
    if (this.get(query) === entry) {
      const bucket = this.buckets.get(hashOptions(options));
      if (bucket) bucket.delete(query);
    }
  }
}

/**
 * Suscribe to Firestore Document changes
 *
 * @param ref - Reference to the document you want to listen to
 * @param options
 */
export function useFirestoreDoc<T = firestore.DocumentData>(
  ref: firestore.DocumentReference<T>,
  options?: ReactFireOptions
): Resource<firestore.DocumentSnapshot<T>> {
  const { skipCache = false } = options || {};

  const queryId = 'firestore doc: ' + ref.path;

  const observable = new Observable<firestore.DocumentSnapshot<T>>(subscriber =>
    ref.onSnapshot({ includeMetadataChanges: skipCache }, subscriber)
  );

  return useObservable(
    skipCache
      ? observable.pipe(skipWhile(snap => snap.metadata.fromCache))
      : observable,
    queryId + hashOptions(options)
  );
}

const queryCache = new QueryCache();

/**
 * Subscribe to a Firestore collection
 *
 * @param ref - Reference to the collection you want to listen to
 * @param options
 */
export function useFirestoreCollection<T = firestore.DocumentData>(
  query: firestore.Query<T>,
  options?: ReactFireOptions
): Resource<firestore.QuerySnapshot<T>> {
  const entry = queryCache.getOrInsert(query, options);

  const [, setResource] = React.useState(entry.resource);

  React.useEffect(() => {
    const subscription = entry.observable.subscribe(setResource);
    return () => subscription.unsubscribe();
  }, [entry.observable]);

  return entry.resource;
}

function hashOptions(options?: ReactFireOptions): string {
  const { skipCache = false } = options || {};
  return `|skipCache:${skipCache}`;
}
