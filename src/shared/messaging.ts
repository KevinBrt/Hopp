/**
 * Typed request/response messaging between the UI (content script, popup,
 * options) and the background. Add a method to `BackgroundApi`, implement it
 * in `background/api.ts`, then call it with `callBackground`.
 */
import { browser } from 'wxt/browser';
import type { Corpus } from '@/core/corpus';
import type { PageItem, PaletteItem, TabItem } from '@/core/items';

/** How the user asked to open the item. */
export type Disposition = 'default' | 'alternate' | 'new-window';

export interface ExecuteRequest {
  item: PaletteItem;
  disposition: Disposition;
  /** The query typed when the item was picked (used for learning). */
  query: string;
}

export interface ExecuteResult {
  /** Text the UI must copy to the clipboard (needs a focused document). */
  copy?: string;
}

export interface BackgroundApi {
  getCorpus(): Promise<Corpus>;
  searchHistory(input: { query: string }): Promise<PageItem[]>;
  execute(input: ExecuteRequest): Promise<ExecuteResult>;
  /** Closes a tab or removes a page from history. */
  dismiss(input: { item: TabItem | PageItem }): Promise<void>;
  clearUsage(): Promise<void>;
}

type Method = keyof BackgroundApi;
type Input<M extends Method> = Parameters<BackgroundApi[M]>;
type Output<M extends Method> = Awaited<ReturnType<BackgroundApi[M]>>;

interface RpcMessage<M extends Method = Method> {
  hop: 'rpc';
  method: M;
  input: Input<M>[0];
}

type RpcResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export async function callBackground<M extends Method>(method: M, ...input: Input<M>): Promise<Output<M>> {
  const message: RpcMessage<M> = { hop: 'rpc', method, input: input[0] };
  const response = (await browser.runtime.sendMessage(message)) as RpcResponse<Output<M>> | undefined;
  if (!response) throw new Error(`No response for "${method}"`);
  if (!response.ok) throw new Error(response.error);
  return response.data;
}

function isRpcMessage(message: unknown): message is RpcMessage {
  return typeof message === 'object' && message !== null && (message as RpcMessage).hop === 'rpc';
}

export function exposeBackgroundApi(api: BackgroundApi): void {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isRpcMessage(message)) return;
    const handler = api[message.method] as (input: unknown) => Promise<unknown>;
    handler(message.input).then(
      (data) => sendResponse({ ok: true, data } satisfies RpcResponse<unknown>),
      (error: unknown) => {
        console.error(`[hop] ${message.method} failed`, error);
        sendResponse({ ok: false, error: String(error) } satisfies RpcResponse<unknown>);
      },
    );
    // Keeps the channel open for the async response (works in Chrome and Firefox).
    return true;
  });
}

/**
 * Messages sent by the background to a palette overlay. Content scripts get
 * them per tab; extension pages get every runtime message, so they check
 * `tabId` to know if it is meant for them.
 */
export interface PaletteMessage {
  hop: 'toggle';
  tabId?: number;
}

export function isPaletteMessage(message: unknown): message is PaletteMessage {
  return typeof message === 'object' && message !== null && (message as PaletteMessage).hop === 'toggle';
}
