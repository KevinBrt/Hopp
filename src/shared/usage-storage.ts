import { storage } from 'wxt/utils/storage';
import { emptyUsage, type UsageData } from '@/core/usage';

/** Learned picks. Local only: it can grow to tens of KB and is personal. */
export const usageItem = storage.defineItem<UsageData>('local:usage', {
  fallback: emptyUsage(),
  version: 1,
});
