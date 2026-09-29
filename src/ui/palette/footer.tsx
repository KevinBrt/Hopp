import { i18n } from '#i18n';
import { Check } from 'lucide-react';
import type { PaletteContext } from '@/core/corpus';
import type { PaletteItem } from '@/core/items';
import { SCOPES } from '@/core/scopes';
import type { OpenTarget } from '@/shared/settings';
import { Kbd } from '../components/kbd';
import { IS_MAC, MOD_LABEL } from '../lib/platform';
import { actionLabel, canDismiss, describeItem, scopeLabel, supportsDisposition } from './item-view';

const DISMISS_KEYS = IS_MAC ? '⇧⌦' : `${i18n.t('palette.keys.shift')} ${i18n.t('palette.keys.delete')}`;

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Kbd>{keys}</Kbd>
      <span>{label}</span>
    </span>
  );
}

interface FooterProps {
  selected: PaletteItem | undefined;
  context: PaletteContext | undefined;
  openIn: OpenTarget;
  showScopes: boolean;
  notice: string | null;
}

export function Footer({ selected, context, openIn, showScopes, notice }: FooterProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-4 border-t px-3 text-[11.5px] text-muted-foreground">
      <div className="flex min-w-0 items-center gap-1">
        {notice ? (
          <span className="flex items-center gap-1.5 text-foreground">
            <Check className="size-3.5 text-primary" strokeWidth={2.5} />
            {notice}
          </span>
        ) : (
          showScopes && (
            <>
              {SCOPES.map((scope) => (
                <Kbd key={scope.id} title={scopeLabel(scope.id)} className="font-mono">
                  {scope.prefix}
                </Kbd>
              ))}
              <span className="ml-1">{i18n.t('palette.hints.filter')}</span>
            </>
          )
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3.5">
        <Hint keys="↑↓" label={i18n.t('palette.hints.navigate')} />
        {selected && context && (
          <Hint keys="↵" label={actionLabel(describeItem(selected, context).action).toLocaleLowerCase()} />
        )}
        {selected && supportsDisposition(selected) && (
          <Hint
            keys={`${MOD_LABEL} ↵`}
            label={i18n.t(openIn === 'new-tab' ? 'palette.hints.currentTab' : 'palette.hints.newTab')}
          />
        )}
        {selected && canDismiss(selected) && (
          <Hint
            keys={DISMISS_KEYS}
            label={i18n.t(selected.kind === 'tab' ? 'palette.hints.closeTab' : 'palette.hints.remove')}
          />
        )}
      </div>
    </div>
  );
}
