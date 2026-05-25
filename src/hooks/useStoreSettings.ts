import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { StoreSettings, Store } from '../types';

export function useStoreSettings(storeId?: string) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'stores', storeId), (snapshot) => {
      if (snapshot.exists()) {
        const storeData = snapshot.data() as Store;
        setStore({ id: snapshot.id, ...storeData });
        setSettings(storeData.settings);
      } else {
        setStore(null);
        setSettings(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `stores/${storeId}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [storeId]);

  return { settings, store, loading };
}

export function useUserStore(userId: string | undefined) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'stores'), where('ownerId', '==', userId), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setStore({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Store);
      } else {
        setStore(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { store, loading };
}
