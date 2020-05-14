import { firestore } from 'firebase/app';
import { Observable } from 'rxjs';
import { skipWhile } from 'rxjs/operators';
import { useObservable } from '../useObservable';
import { Resource } from '../resource';
import { ReactFireOptions } from '../options';

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
    queryId + getHashFromOptions(options)
  );
}

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
  const { skipCache = false } = options || {};

  const queryId = getHashFromFirestoreQuery(query);

  const observable = new Observable<firestore.QuerySnapshot<T>>(subscriber =>
    query.onSnapshot({ includeMetadataChanges: skipCache }, subscriber)
  );

  return useObservable(
    skipCache
      ? observable.pipe(skipWhile(snap => snap.metadata.fromCache))
      : observable,
    queryId + getHashFromOptions(options)
  );
}

// The Firestore SDK has an undocumented _query
// object that has a method to generate a hash for a query,
// which we need for useObservable
// https://github.com/firebase/firebase-js-sdk/blob/5beb23cd47312ffc415d3ce2ae309cc3a3fde39f/packages/firestore/src/core/query.ts#L221
interface _QueryWithId extends firestore.Query {
  _query: {
    canonicalId(): string;
  };
}

function getHashFromFirestoreQuery(query: firestore.Query) {
  const hash = (query as _QueryWithId)._query.canonicalId();
  return `firestore: ${hash}`;
}

function getHashFromOptions(options?: ReactFireOptions): string {
  const { skipCache = false } = options || {};
  return `|skipCache:${skipCache}`;
}
