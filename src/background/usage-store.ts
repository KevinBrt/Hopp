import { emptyUsage, forgetItem, recordPick, type UsageData } from '@/core/usage';
import { usageItem } from '@/shared/usage-storage';

// Writes are serialized so concurrent picks never overwrite each other.
let queue: Promise<unknown> = Promise.resolve();

function update(change: (data: UsageData) => UsageData): Promise<void> {
  const next = queue.then(async () => usageItem.setValue(change(await usageItem.getValue())));
  queue = next.catch((error: unknown) => console.error('[hop] usage update failed', error));
  return next;
}

export const getUsage = (): Promise<UsageData> => usageItem.getValue();

export const recordUsage = (key: string, query: string) =>
  update((data) => recordPick(data, key, query, Date.now()));

export const forgetUsage = (key: string) => update((data) => forgetItem(data, key));

export const clearUsage = () => update(() => emptyUsage());
