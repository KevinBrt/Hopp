import {
  AppWindow,
  ArrowUpRight,
  Bookmark,
  Clipboard,
  Copy,
  Download,
  EyeOff,
  History,
  Keyboard,
  Pin,
  PinOff,
  Plus,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SquareX,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import type { PaletteContext } from '@/core/corpus';
import type { IconName, PaletteItem } from '@/core/items';
import { hostname } from '@/core/url';
import { cn } from '../lib/cn';

const COMMAND_ICONS: Record<IconName, LucideIcon> = {
  'app-window': AppWindow,
  bookmark: Bookmark,
  clipboard: Clipboard,
  copy: Copy,
  download: Download,
  'eye-off': EyeOff,
  history: History,
  keyboard: Keyboard,
  pin: Pin,
  'pin-off': PinOff,
  plus: Plus,
  puzzle: Puzzle,
  refresh: RefreshCw,
  'rotate-ccw': RotateCcw,
  settings: Settings,
  'square-x': SquareX,
  volume: Volume2,
  'volume-off': VolumeX,
  x: X,
};

// Same hues as the letter tiles of the mockup: stable per site.
const TILE_COLORS = ['#7c5cdb', '#3b82f6', '#22a06b', '#e0703a', '#d9468f', '#0ea5a4', '#d4a017', '#e5484d'];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Tile({ className, children, style }: { className?: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      className={cn('flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground', className)}
      style={style}
    >
      {children}
    </span>
  );
}

function LetterTile({ label, seed }: { label: string; seed: string }) {
  const letter = (label.trim()[0] ?? '?').toLocaleUpperCase();
  return (
    <Tile className="text-[12px] font-semibold text-white" style={{ background: TILE_COLORS[hash(seed) % TILE_COLORS.length] }}>
      {letter}
    </Tile>
  );
}

// Chrome's local favicon cache (`favicon` permission), exposed to pages via web_accessible_resources.
const faviconApiUrl = (pageUrl: string) =>
  `chrome-extension://${browser.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`;

const isLoadableIcon = (url: string | undefined): url is string => !!url && /^(https?|data):/.test(url);

interface FaviconProps {
  pageUrl: string;
  /** For tabs: what the tab reports. `null` means "the page has no favicon". */
  favIconUrl?: string | null;
  label: string;
  api: boolean;
}

/**
 * Tries each favicon source in turn, then falls back to a letter tile.
 * Chrome's local cache comes first (no network, no page CSP), but it answers
 * a grey globe for pages without favicon: a tab known to have none goes
 * straight to the tile.
 */
function Favicon({ pageUrl, favIconUrl, label, api }: FaviconProps) {
  const sources = useMemo(() => {
    if (favIconUrl === null) return [];
    const list: string[] = [];
    if (api) list.push(faviconApiUrl(pageUrl));
    if (isLoadableIcon(favIconUrl)) list.push(favIconUrl);
    return list;
  }, [pageUrl, favIconUrl, api]);
  const [failed, setFailed] = useState(0);
  const src = sources[failed];

  const host = hostname(pageUrl);
  if (!src) return <LetterTile label={label || host} seed={host} />;
  return (
    <Tile className="bg-transparent">
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        className="size-4 rounded-[3px]"
        onError={() => setFailed((count) => count + 1)}
      />
    </Tile>
  );
}

export const ItemIcon = memo(function ItemIcon({ item, context }: { item: PaletteItem; context: PaletteContext }) {
  switch (item.kind) {
    case 'tab':
      return (
        <Favicon pageUrl={item.url} favIconUrl={item.favIconUrl ?? null} label={item.title} api={context.faviconApi} />
      );
    case 'page':
      return <Favicon pageUrl={item.url} label={item.title} api={context.faviconApi} />;
    case 'command': {
      const Icon = COMMAND_ICONS[item.icon];
      return (
        <Tile>
          <Icon className="size-3.5" strokeWidth={2} />
        </Tile>
      );
    }
    case 'navigate':
      return (
        <Tile>
          <ArrowUpRight className="size-3.5" strokeWidth={2} />
        </Tile>
      );
    case 'search':
      return (
        <Tile className="text-primary">
          <Search className="size-3.5" strokeWidth={2.25} />
        </Tile>
      );
    case 'site-search':
      return <Favicon pageUrl={item.url} label={item.siteName} api={context.faviconApi} />;
  }
});
