import * as firebase from 'firebase/app';
import * as React from 'react';

type FirebaseAppContextValue = firebase.app.App;

const FirebaseAppContext = React.createContext<
  FirebaseAppContextValue | undefined
>(undefined);

type BaseProps = {
  initPerformance?: boolean;
};

type InitProps = BaseProps & {
  firebaseConfig: Object;
  firebaseApp: undefined;
};

type NoInitProps = BaseProps & {
  firebaseApp: firebase.app.App;
};

export type FirebaseAppProviderProps = React.PropsWithChildren<
  InitProps | NoInitProps
>;

export function FirebaseAppProvider(props: FirebaseAppProviderProps) {
  const { initPerformance } = props;

  const firebaseApp =
    props.firebaseApp ||
    React.useMemo(() => {
      if (!firebase.apps.length) {
        firebase.initializeApp(props.firebaseConfig);
      }

      return firebase.app();
    }, [props.firebaseConfig]);

  React.useMemo(() => {
    if (initPerformance === true && !!firebase.apps.length) {
      if (!firebase.performance) {
        throw new Error(
          'firebase.performance not found. Did you forget to import it?'
        );
      }

      // initialize Performance Monitoring
      firebase.performance();
    }
  }, [initPerformance, firebaseApp]);

  return <FirebaseAppContext.Provider value={firebaseApp} {...props} />;
}

export function useFirebaseApp() {
  const firebaseApp = React.useContext(FirebaseAppContext);
  if (!firebaseApp) {
    throw new Error(
      'Cannot call useFirebaseApp unless your component is within a FirebaseAppProvider'
    );
  }

  return firebaseApp;
}
