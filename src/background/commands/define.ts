import type { Browser } from 'wxt/browser';
import type { IconName } from '@/core/items';
import type { BrowserName } from '@/shared/env';
import type { ActiveContext } from '../context';

export interface CommandContext extends ActiveContext {
  browser: BrowserName;
}

/** Side effects the UI must perform (it owns the focused document). */
export interface CommandEffect {
  copy?: string;
}

export interface CommandDefinition {
  id: string;
  icon: IconName | ((ctx: CommandContext) => IconName);
  title: (ctx: CommandContext) => string;
  /** Language-agnostic synonyms that help matching (English + French). */
  keywords?: string[];
  /** Hides the command when it makes no sense in this context. */
  when?: (ctx: CommandContext) => boolean;
  run: (ctx: CommandContext) => Promise<CommandEffect | void>;
}

export const defineCommand = (definition: CommandDefinition) => definition;

export type CurrentTab = Browser.tabs.Tab & { id: number };

/** A command acting on the current tab: only listed when there is one. */
export function defineTabCommand(definition: {
  id: string;
  icon: IconName | ((tab: CurrentTab) => IconName);
  title: (tab: CurrentTab) => string;
  keywords?: string[];
  when?: (tab: CurrentTab, ctx: CommandContext) => boolean;
  run: (tab: CurrentTab, ctx: CommandContext) => Promise<CommandEffect | void>;
}): CommandDefinition {
  const { icon, title, when, run } = definition;
  const tabOf = (ctx: CommandContext) => ctx.tab as CurrentTab;
  return {
    id: definition.id,
    keywords: definition.keywords,
    icon: (ctx) => (typeof icon === 'function' ? icon(tabOf(ctx)) : icon),
    title: (ctx) => title(tabOf(ctx)),
    when: (ctx) => ctx.tab?.id != null && (when?.(tabOf(ctx), ctx) ?? true),
    run: (ctx) => run(tabOf(ctx), ctx),
  };
}
