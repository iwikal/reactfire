import { render, waitForElement, cleanup, act } from '@testing-library/react';

import * as React from 'react';
import '@testing-library/jest-dom/extend-expect';
import * as firebase from '@firebase/testing';
import {
  useFirestoreDoc,
  useFirestoreCollection,
  FirebaseAppProvider
} from '..';

describe('Firestore', () => {
  let app: import('firebase').app.App;

  beforeAll(async () => {
    app = firebase.initializeTestApp({
      projectId: '12345',
      databaseName: 'my-database',
      auth: { uid: 'alice' }
    }) as import('firebase').app.App;
    // TODO(davideast): Wait for rc and analytics to get included in test app
  });

  afterEach(async () => {
    cleanup();
    await firebase.clearFirestoreData({ projectId: '12345' });
  });

  test('sanity check - emulator is running', () => {
    // IF THIS TEST FAILS, MAKE SURE YOU'RE RUNNING THESE TESTS BY DOING:
    // yarn test

    return app
      .firestore()
      .collection('test')
      .add({ a: 'hello' });
  });

  describe('useFirestoreDoc', () => {
    it('can get a Firestore document [TEST REQUIRES EMULATOR]', async () => {
      const mockData = { a: 'hello' };

      const ref = app
        .firestore()
        .collection('testDoc')
        .doc('test1');

      await ref.set(mockData);

      const ReadFirestoreDoc = () => {
        const doc = useFirestoreDoc(ref).read();

        return <h1 data-testid="readSuccess">{doc.data().a}</h1>;
      };
      const { getByTestId } = render(
        <FirebaseAppProvider firebaseApp={app}>
          <React.Suspense fallback={<h1 data-testid="fallback">Fallback</h1>}>
            <ReadFirestoreDoc />
          </React.Suspense>
        </FirebaseAppProvider>
      );

      await waitForElement(() => getByTestId('readSuccess'));

      expect(getByTestId('readSuccess')).toContainHTML(mockData.a);
    });
  });

  describe('useFirestoreCollection', () => {
    it('can get a Firestore collection [TEST REQUIRES EMULATOR]', async () => {
      const mockData1 = { a: 'hello' };
      const mockData2 = { a: 'goodbye' };

      const ref = app.firestore().collection('testCollection');

      await act(() => ref.add(mockData1));
      await act(() => ref.add(mockData2));

      const ReadFirestoreCollection = () => {
        const collection = useFirestoreCollection(ref).read();

        return (
          <ul data-testid="readSuccess">
            {collection.docs.map(doc => (
              <li key={doc.id} data-testid="listItem">
                doc.data().a
              </li>
            ))}
          </ul>
        );
      };
      const { getAllByTestId } = render(
        <FirebaseAppProvider firebaseApp={app}>
          <React.Suspense fallback={<h1 data-testid="fallback">Fallback</h1>}>
            <ReadFirestoreCollection />
          </React.Suspense>
        </FirebaseAppProvider>
      );

      await waitForElement(() => getAllByTestId('listItem'));

      expect(getAllByTestId('listItem').length).toEqual(2);
    });
  });
});
