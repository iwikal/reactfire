import { auth, User } from 'firebase/app';
import * as React from 'react';
import { user } from 'rxfire/auth';
import {
  Resource,
  preloadAuth,
  preloadObservable,
  useAuth,
  useObservable
} from '..';
import { from } from 'rxjs';

export function preloadUser(firebaseApp: firebase.app.App) {
  return preloadAuth(firebaseApp).then((auth: any) => {
    const result = preloadObservable(
      user(auth() as firebase.auth.Auth),
      'auth: user'
    );
    return result.promise;
  });
}

/**
 * Subscribe to Firebase auth state changes, including token refresh
 *
 * @param auth - the [firebase.auth](https://firebase.google.com/docs/reference/js/firebase.auth) object
 */
export function useUser(auth?: auth.Auth): Resource<User> {
  const definedAuth = auth || useAuth()();

  return useObservable(user(definedAuth), 'auth: user');
}

export function useIdTokenResult(
  user: User,
  forceRefresh: boolean = false
): Resource<auth.IdTokenResult> {
  if (!user) {
    throw new Error('you must provide a user');
  }

  const idToken$ = from(user.getIdTokenResult(forceRefresh));

  return useObservable(idToken$, `${user.uid}-claims`);
}

interface Claims {
  [key: string]: any
}

export interface AuthCheckProps {
  auth?: auth.Auth;
  fallback: React.ReactNode;
  children: React.ReactNode;
  requiredClaims?: Claims
}

export interface ClaimsCheckProps {
  user: User;
  fallback: React.ReactNode;
  children: React.ReactNode;
  requiredClaims?: Claims
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
