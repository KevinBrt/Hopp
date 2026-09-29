import { i18n } from '#i18n';
import { Search, X } from 'lucide-react';
import {
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { PaletteItem } from '@/core/items';
import { parseScopePrefix, type ScopeId } from '@/core/scopes';
import { callBackground, type Disposition } from '@/shared/messaging';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from '../components/command';
import { Kbd } from '../components/kbd';
import { useSettings } from '../hooks/use-settings';
import { copyText } from '../lib/clipboard';
import { cn } from '../lib/cn';
import { isModKey } from '../lib/platform';
import { Footer } from './footer';
import { canDismiss, scopeLabel, scopePlaceholder, sectionLabel } from './item-view';
import { ResultRow } from './result-row';
import { useCorpus } from './use-corpus';
import { useDeepHistory } from './use-deep-history';
import { useResults } from './use-results';

export interface PaletteProps {
  /** `overlay`: floating card over a page. `standalone`: fills a popup/window. */
  variant: 'overlay' | 'standalone';
  onClose: () => void;
  /** Where temporary DOM nodes go (the shadow root when in a page). */
  domRoot?: Node;
}

const COPY_NOTICE_DURATION = 700;

function dispositionFor(event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): Disposition {
  if (event.shiftKey) return 'new-window';
  if (isModKey(event)) return 'alternate';
  return 'default';
}

const isDismissShortcut = (event: KeyboardEvent) =>
  event.shiftKey && (event.key === 'Delete' || (event.key === 'Backspace' && isModKey(event)));

function ScopeChip({ scope, onClear }: { scope: ScopeId; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="group/chip flex h-6 shrink-0 items-center gap-1 rounded-md bg-primary/12 pr-1.5 pl-2 text-[12.5px] font-medium text-primary"
    >
      {scopeLabel(scope)}
      <X className="size-3 opacity-60 group-hover/chip:opacity-100" strokeWidth={2.5} />
    </button>
  );
}

export function Palette({ variant, onClose, domRoot }: PaletteProps) {
  const settings = useSettings();
  const corpus = useCorpus();

  const [input, setInput] = useState('');
  const [scope, setScope] = useState<ScopeId | null>(null);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);

  // Typing stays fluid even if ranking a huge history takes a few ms.
  const query = useDeferredValue(input);
  const extraPages = useDeepHistory(query, settings.sources.history && (scope === null || scope === 'history'));
  const sections = useResults(corpus, extraPages, removed, query, scope);
  const flat = useMemo(() => sections.flatMap((section) => section.items.map(({ item }) => item)), [sections]);

  // Selection goes back to the top when the query changes, and is kept
  // otherwise (e.g. when deep history results arrive).
  const [selectedId, setSelectedId] = useState('');
  const selectionKey = `${scope}\u0000${query}`;
  const lastSelectionKey = useRef(selectionKey);
  useLayoutEffect(() => {
    const queryChanged = lastSelectionKey.current !== selectionKey;
    lastSelectionKey.current = selectionKey;
    if (queryChanged || !flat.some((item) => item.id === selectedId)) setSelectedId(flat[0]?.id ?? '');
  }, [flat, selectionKey, selectedId]);
  const selected = flat.find((item) => item.id === selectedId);

  // Latest values for stable callbacks (rows are memoized).
  const latest = useRef({ input, flat });
  latest.current = { input, flat };
  const busy = useRef(false);
  const pointerDisposition = useRef<Disposition>('default');

  const execute = useCallback(
    async (item: PaletteItem, disposition: Disposition) => {
      if (busy.current) return;
      busy.current = true;
      try {
        const result = await callBackground('execute', { item, disposition, query: latest.current.input });
        if (result.copy && (await copyText(result.copy, domRoot))) {
          setNotice(i18n.t('palette.copied'));
          await new Promise((resolve) => setTimeout(resolve, COPY_NOTICE_DURATION));
        }
      } catch (error) {
        console.error('[hop] action failed', error);
      } finally {
        onClose();
      }
    },
    [domRoot, onClose],
  );

  const dismiss = useCallback(async (item: PaletteItem) => {
    if (!canDismiss(item)) return;
    const { flat } = latest.current;
    const index = flat.findIndex((candidate) => candidate.id === item.id);
    const next = flat[index + 1] ?? flat[index - 1];
    setRemoved((previous) => new Set(previous).add(item.id));
    if (next) setSelectedId(next.id);
    try {
      await callBackground('dismiss', { item });
    } catch (error) {
      console.error('[hop] could not dismiss', error);
      setRemoved((previous) => {
        const rollback = new Set(previous);
        rollback.delete(item.id);
        return rollback;
      });
    }
  }, []);

  const onPick = useCallback(
    (item: PaletteItem) => {
      void execute(item, pointerDisposition.current);
      pointerDisposition.current = 'default';
    },
    [execute],
  );

  const onPointerDown = useCallback((event: PointerEvent) => {
    pointerDisposition.current = dispositionFor(event);
  }, []);

  const onInputChange = (value: string) => {
    const parsed = scope ? null : parseScopePrefix(value);
    if (parsed) {
      setScope(parsed.scope);
      setInput(parsed.rest);
    } else {
      setInput(value);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        return;
      case 'Enter':
        event.preventDefault();
        if (selected) void execute(selected, dispositionFor(event));
        return;
      case 'Tab':
        // Keep the focus inside the palette.
        event.preventDefault();
        return;
      case 'Backspace':
        if (!input && scope && !event.shiftKey) {
          event.preventDefault();
          setScope(null);
          return;
        }
    }
    if (isDismissShortcut(event) && selected) {
      event.preventDefault();
      void dismiss(selected);
    }
  };

  return (
    <Command
      label="Hop"
      shouldFilter={false}
      loop
      value={selectedId}
      onValueChange={setSelectedId}
      onKeyDown={onKeyDown}
      className={cn(variant === 'overlay' ? 'rounded-[14px] shadow-palette' : 'h-full')}
    >
      <div className="flex h-[54px] shrink-0 items-center gap-3 border-b px-4">
        <Search className="size-[18px] shrink-0 text-primary" strokeWidth={2.25} />
        {scope && <ScopeChip scope={scope} onClear={() => setScope(null)} />}
        <CommandInput
          autoFocus
          value={input}
          onValueChange={onInputChange}
          placeholder={scopePlaceholder(scope)}
          spellCheck={false}
          autoComplete="off"
        />
        <Kbd>esc</Kbd>
      </div>

      <CommandList
        className={cn(
          '[&>[cmdk-list-sizer]]:px-2 [&>[cmdk-list-sizer]]:pb-1.5',
          variant === 'standalone' && 'h-auto flex-1',
        )}
      >
        {corpus &&
          sections.map((section) => (
            <CommandGroup key={section.id} heading={sectionLabel(section.id)}>
              {section.items.map((ranked) => (
                <ResultRow
                  key={ranked.item.id}
                  ranked={ranked}
                  context={corpus.context}
                  onPick={onPick}
                  onPointerDown={onPointerDown}
                />
              ))}
            </CommandGroup>
          ))}
        {corpus && query.trim() && <CommandEmpty>{i18n.t('palette.empty')}</CommandEmpty>}
      </CommandList>

      <Footer
        selected={selected}
        context={corpus?.context}
        openIn={settings.openIn}
        showScopes={!scope}
        notice={notice}
      />
    </Command>
  );
}
