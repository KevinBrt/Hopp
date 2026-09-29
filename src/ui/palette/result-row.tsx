import { i18n } from '#i18n';
import { Pin, Volume2, VolumeX } from 'lucide-react';
import { memo, type PointerEvent, type ReactNode } from 'react';
import type { PaletteContext } from '@/core/corpus';
import type { PaletteItem } from '@/core/items';
import type { RankedItem } from '@/core/ranker';
import { CommandItem } from '../components/command';
import { formatRelativeTime } from '../lib/format';
import { ItemIcon } from './item-icon';
import { actionLabel, describeItem } from './item-view';

function Highlighted({ text, ranges }: { text: string; ranges?: number[] }) {
  if (!ranges?.length) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < ranges.length; i += 2) {
    const start = Math.max(cursor, ranges[i]!);
    const end = Math.min(text.length, ranges[i + 1]!);
    if (start >= end) continue;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={start} className="bg-transparent text-highlight">
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return parts;
}

function TabBadges({ item }: { item: PaletteItem }) {
  if (item.kind !== 'tab') return null;
  const Audio = item.muted ? VolumeX : item.audible ? Volume2 : null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-subtle-foreground">
      {item.pinned && <Pin aria-label={i18n.t('palette.pinned')} className="size-3.5" />}
      {Audio && <Audio aria-label={i18n.t(item.muted ? 'palette.muted' : 'palette.audible')} className="size-3.5" />}
    </span>
  );
}

interface ResultRowProps {
  ranked: RankedItem;
  context: PaletteContext;
  onPick: (item: PaletteItem) => void;
  onPointerDown: (event: PointerEvent) => void;
}

export const ResultRow = memo(function ResultRow({ ranked, context, onPick, onPointerDown }: ResultRowProps) {
  const { item, highlights } = ranked;
  const view = describeItem(item, context);

  return (
    <CommandItem value={item.id} onSelect={() => onPick(item)} onPointerDown={onPointerDown}>
      <ItemIcon item={item} context={context} />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate font-medium">
          <Highlighted text={view.title} ranges={highlights} />
        </span>
        {view.subtitle && <span className="min-w-0 shrink-[2] truncate text-[12px] text-muted-foreground">{view.subtitle}</span>}
      </span>
      <TabBadges item={item} />
      {/* Meta when idle, the action when selected (pure CSS: no re-render on hover). */}
      {view.time && (
        <span className="shrink-0 text-[12px] text-subtle-foreground group-data-[selected=true]:hidden">
          {formatRelativeTime(view.time)}
        </span>
      )}
      <span className="hidden shrink-0 text-[12px] text-muted-foreground group-data-[selected=true]:inline">
        {actionLabel(view.action)}
      </span>
    </CommandItem>
  );
});
