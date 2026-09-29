import { useEffect, useState } from 'react';
import type { Corpus } from '@/core/corpus';
import { callBackground } from '@/shared/messaging';

// Last corpus of this page: reopening shows it instantly while a fresh one loads.
let lastCorpus: Corpus | null = null;

export function useCorpus(): Corpus | null {
  const [corpus, setCorpus] = useState(lastCorpus);
  useEffect(() => {
    let alive = true;
    callBackground('getCorpus')
      .then((fresh) => {
        lastCorpus = fresh;
        if (alive) setCorpus(fresh);
      })
      .catch((error: unknown) => console.error('[hop] could not load the corpus', error));
    return () => {
      alive = false;
    };
  }, []);
  return corpus;
}
