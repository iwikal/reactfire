import { firestore } from 'firebase/app';
import { fromDocRef, fromCollectionRef } from 'rxfire/firestore';
import { Resource, ReactFireOptions, useObservable } from '..';
import { skipWhile } from 'rxjs/operators';

/**
 * Suscribe to Firestore Document changes
 *
 * @param ref - Reference to the document you want to listen to
 * @param options
 */
export function useFirestoreDoc(
  ref: firestore.DocumentReference,
  options?: ReactFireOptions
): Resource<firestore.DocumentSnapshot> {
  const { skipCache = false } = options || {};

  const queryId = 'firestore doc: ' + ref.path;

  const observable = fromDocRef(ref, { includeMetadataChanges: true });

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
export function useFirestoreCollection(
  query: firestore.Query,
  options?: ReactFireOptions
): Resource<firestore.QuerySnapshot> {
  const { skipCache = false } = options || {};

  const queryId = getHashFromFirestoreQuery(query);

  const observable = fromCollectionRef(
    query,
    options && {
      includeMetadataChanges: skipCache
    }
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
