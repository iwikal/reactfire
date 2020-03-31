import { database } from 'firebase/app';
import { list, object, QueryChange } from 'rxfire/database';
import { useObservable } from '../useObservable';
import { Resource } from '../resource';

/**
 * Subscribe to a Realtime Database object
 *
 * @param ref - Reference to the DB object you want to listen to
 */
export function useDatabaseObject(
  ref: database.Reference
): Resource<QueryChange> {
  return useObservable(object(ref), `RTDB: ${ref.toString()}`);
}

// Realtime Database has an undocumented method
// that helps us build a unique ID for the query
// https://github.com/firebase/firebase-js-sdk/blob/aca99669dd8ed096f189578c47a56a8644ac62e6/packages/database/src/api/Query.ts#L601
interface _QueryWithId extends database.Query {
  queryIdentifier(): string;
}

/**
 * Subscribe to a Realtime Database list
 *
 * @param ref - Reference to the DB List you want to listen to
 */
export function useDatabaseList(
  ref: database.Reference | database.Query
): Resource<QueryChange[]> {
  const queryId = (ref as _QueryWithId).queryIdentifier();
  const hash = `RTDB: ${ref.toString()}|${queryId}`;

  return useObservable(list(ref), hash);
}
