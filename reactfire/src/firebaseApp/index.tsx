import firebase from 'firebase/app';
import React from 'react';
import { Resource } from '..';

type FirebaseAppContextValue = firebase.app.App;

const FirebaseAppContext = React.createContext<
  FirebaseAppContextValue | undefined
>(undefined);

export type FirebaseAppProviderProps = {
  children?: React.ReactNode;
  firebaseApp: firebase.app.App;
};

export function FirebaseAppProvider(props: FirebaseAppProviderProps) {
  return (
    <FirebaseAppContext.Provider value={props.firebaseApp}>
      {props.children}
    </FirebaseAppContext.Provider>
  );
}

export function useFirebaseApp(): Resource<firebase.app.App> {
  const firebaseApp = React.useContext(FirebaseAppContext);

  return React.useMemo(
    () => ({
      read() {
        if (firebaseApp) return firebaseApp;

        throw new Error(
          'Cannot call useFirebaseApp unless your component is within a FirebaseAppProvider'
        );
      }
    }),
    [firebaseApp]
  );
}
