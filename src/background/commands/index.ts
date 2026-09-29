/**
 * Command registry. To add commands, write a `defineCommand` /
 * `defineTabCommand` list and add it to `COMMANDS`: they become searchable
 * right away. Order matters: it is the default order in the `>` scope.
 */
import type { CommandItem } from '@/core/items';
import { browserCommands } from './browser-commands';
import type { CommandContext, CommandDefinition, CommandEffect } from './define';
import { hopCommands } from './hop-commands';
import { tabCommands } from './tab-commands';

const COMMANDS: readonly CommandDefinition[] = [...browserCommands, ...tabCommands, ...hopCommands];

const byId = new Map(COMMANDS.map((command) => [command.id, command]));

export function listCommandItems(ctx: CommandContext): CommandItem[] {
  return COMMANDS.filter((command) => command.when?.(ctx) ?? true).map((command) => ({
    kind: 'command',
    id: `cmd:${command.id}`,
    commandId: command.id,
    title: command.title(ctx),
    icon: typeof command.icon === 'function' ? command.icon(ctx) : command.icon,
    keywords: command.keywords ?? [],
  }));
}

export async function runCommand(id: string, ctx: CommandContext): Promise<CommandEffect> {
  const command = byId.get(id);
  if (!command) throw new Error(`Unknown command "${id}"`);
  if (command.when && !command.when(ctx)) throw new Error(`Command "${id}" is not available here`);
  return (await command.run(ctx)) ?? {};
}

export type { CommandContext } from './define';
