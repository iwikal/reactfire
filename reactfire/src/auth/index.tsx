import React from 'react';
import firebase from 'firebase/app';
import { user } from 'rxfire/auth';
import { Resource } from '../resource';
import { useObservable } from '../useObservable';
import { defer } from 'rxjs';
import { useFirebaseApp } from '../firebaseApp';

/**
 * Subscribe to Firebase auth state changes, including token refresh
 *
 * @param auth - the [firebase.auth](https://firebase.google.com/docs/reference/js/firebase.auth) object
 */
export function useUser(auth?: firebase.auth.Auth): Resource<firebase.User> {
  const appResource = useFirebaseApp();
  const definedAuth = auth || appResource.read().auth();

  return useObservable(user(definedAuth), 'auth: user');
}

export function useIdTokenResult(
  user: firebase.User,
  forceRefresh: boolean = false
): Resource<firebase.auth.IdTokenResult> {
  if (!user) {
    throw new Error('you must provide a user');
  }

  const idToken$ = defer(() => user.getIdTokenResult(forceRefresh));

  return useObservable(idToken$, `${user.uid}-claims`);
}

interface Claims {
  [key: string]: any;
}

export interface AuthCheckProps {
  auth?: firebase.auth.Auth;
  fallback: React.ReactNode;
  children: React.ReactNode;
  requiredClaims?: Claims;
}

export interface ClaimsCheckProps {
  user: firebase.User;
  fallback: React.ReactNode;
  children: React.ReactNode;
  requiredClaims?: Claims;
}

export function ClaimsCheck({
  user,
  fallback,
  children,
  requiredClaims = {}
}: ClaimsCheckProps) {
  const { claims } = useIdTokenResult(user, false).read();
  const missingClaims: Claims = {};

  Object.keys(requiredClaims).forEach(claim => {
    if (requiredClaims[claim] !== claims[claim]) {
      missingClaims[claim] = {
        expected: requiredClaims[claim],
        actual: claims[claim]
      };
    }
  });

  if (Object.keys(missingClaims).length === 0) {
    return <>{children}</>;
  } else {
    return <>{fallback}</>;
  }
}

export function AuthCheck({
  auth,
  fallback,
  children,
  requiredClaims
}: AuthCheckProps): JSX.Element {
  const user = useUser(auth).read();

  if (user) {
    return requiredClaims ? (
      <ClaimsCheck
        user={user}
        fallback={fallback}
        requiredClaims={requiredClaims}
      >
        {children}
      </ClaimsCheck>
    ) : (
      <>{children}</>
    );
  } else {
    return <>{fallback}</>;
  }
}
