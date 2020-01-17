import * as React from 'react';
import { storage } from 'firebase/app';
import { getDownloadURL } from 'rxfire/storage';
import { Observable } from 'rxjs';
import { useObservable, useFirebaseApp } from '..';

/**
 * modified version of rxFire's _fromTask
 *
 * @param task
 */
function _fromTask(task: storage.UploadTask) {
  return new Observable<storage.UploadTaskSnapshot>(subscriber => {
    const progress = (snap: storage.UploadTaskSnapshot) => {
      return subscriber.next(snap);
    };
    task.on('state_changed', progress, subscriber.error, subscriber.complete);

    // I REMOVED THE UNSUBSCRIBE RETURN BECAUSE IT CANCELS THE UPLOAD
    // https://github.com/firebase/firebase-js-sdk/issues/1659
  });
}

/**
 * Subscribe to the progress of a storage task
 *
 * @param task - the task you want to listen to
 * @param ref - reference to the blob the task is acting on
 */
export function useStorageTask(
  task: storage.UploadTask,
  ref: storage.Reference
): storage.UploadTaskSnapshot {
  return useObservable(_fromTask(task), 'storage upload: ' + ref.toString());
}

/**
 * Subscribe to a storage ref's download URL
 *
 * @param ref - reference to the blob you want to download
 */
export function useStorageDownloadURL(ref: storage.Reference): string {
  return useObservable(
    getDownloadURL(ref),
    'storage download:' + ref.toString()
  );
}

type StorageImageProps = {
  storagePath: string;
  storage?: firebase.storage.Storage;
};

export function StorageImage(
  props: StorageImageProps &
    React.DetailedHTMLProps<
      React.ImgHTMLAttributes<HTMLImageElement>,
      HTMLImageElement
    >
) {
  let { storage, storagePath, ...imgProps } = props;

  storage = storage || useFirebaseApp().storage();

  const imgSrc = useStorageDownloadURL(storage.ref(storagePath));
  return <img src={imgSrc} {...imgProps} />;
}
