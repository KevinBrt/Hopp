import { i18n } from '#i18n';
import { useState, type ReactNode } from 'react';
import { BROWSER } from '@/shared/env';
import { callBackground } from '@/shared/messaging';
import { SEARCH_ENGINE_IDS, SEARCH_ENGINES, type SearchEngineId } from '@/shared/search-engines';
import { updateSettings, type OpenTarget, type Settings, type SourceId, type ThemePreference } from '@/shared/settings';
import { Button } from '../components/button';
import { Segmented } from '../components/segmented';
import { Switch } from '../components/switch';
import { ThemeRoot } from '../components/theme-root';
import { useSettings } from '../hooks/use-settings';
import { CAN_EDIT_SHORTCUT_INLINE, ShortcutField } from './shortcut-field';

const save = (patch: Partial<Settings>) => void updateSettings(patch);

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        {description && <p className="text-[12.5px] text-muted-foreground">{description}</p>}
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-surface">{children}</div>
    </section>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-foreground">{label}</div>
        {description && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</div>}
      </div>
      {children}
    </div>
  );
}

const SOURCE_LABELS: Record<SourceId, () => string> = {
  tabs: () => i18n.t('options.sources.tabs'),
  history: () => i18n.t('options.sources.history'),
  bookmarks: () => i18n.t('options.sources.bookmarks'),
  topSites: () => i18n.t('options.sources.topSites'),
  commands: () => i18n.t('options.sources.commands'),
};

function engineLabel(id: SearchEngineId): string {
  if (id === 'browser') return i18n.t('options.engine.browser');
  if (id === 'custom') return i18n.t('options.engine.custom');
  return SEARCH_ENGINES[id].name;
}

function LearningRow() {
  const [cleared, setCleared] = useState(false);
  const clear = () => void callBackground('clearUsage').then(() => setCleared(true));
  return (
    <Row label={i18n.t('options.learning.label')} description={i18n.t('options.learning.description')}>
      <Button onClick={clear} disabled={cleared}>
        {i18n.t(cleared ? 'options.learning.cleared' : 'options.learning.clear')}
      </Button>
    </Row>
  );
}

export function OptionsApp() {
  const settings = useSettings();

  return (
    <ThemeRoot>
      <div className="min-h-screen bg-background font-sans text-[14px] text-foreground antialiased">
        <main className="mx-auto max-w-2xl space-y-8 px-6 py-12">
          <header className="flex items-center gap-3 px-1">
            <img src="/icon/48.png" alt="" className="size-10" />
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight">{i18n.t('options.title')}</h1>
              <p className="text-[13px] text-muted-foreground">{i18n.t('options.subtitle')}</p>
            </div>
          </header>

          <Section title={i18n.t('options.sections.shortcut')}>
            <Row
              label={i18n.t('options.shortcut.label')}
              description={
                CAN_EDIT_SHORTCUT_INLINE
                  ? i18n.t('options.shortcut.description')
                  : `${i18n.t('options.shortcut.description')} ${i18n.t('options.shortcut.chromeHint')}`
              }
            >
              <ShortcutField />
            </Row>
          </Section>

          <Section title={i18n.t('options.sections.newTab')}>
            <Row
              label={i18n.t('options.newTab.label')}
              description={i18n.t(
                BROWSER === 'chrome' ? 'options.newTab.descriptionChrome' : 'options.newTab.descriptionFirefox',
              )}
            >
              <Switch
                aria-label={i18n.t('options.newTab.label')}
                checked={settings.newTabPalette}
                onCheckedChange={(newTabPalette) => save({ newTabPalette })}
              />
            </Row>
          </Section>

          <Section title={i18n.t('options.sections.appearance')}>
            <Row label={i18n.t('options.theme.label')}>
              <Segmented<ThemePreference>
                aria-label={i18n.t('options.theme.label')}
                value={settings.theme}
                onValueChange={(theme) => save({ theme })}
                options={[
                  { value: 'system', label: i18n.t('options.theme.system') },
                  { value: 'light', label: i18n.t('options.theme.light') },
                  { value: 'dark', label: i18n.t('options.theme.dark') },
                ]}
              />
            </Row>
            <Row label={i18n.t('options.blur.label')} description={i18n.t('options.blur.description')}>
              <Switch
                aria-label={i18n.t('options.blur.label')}
                checked={settings.blurBackdrop}
                onCheckedChange={(blurBackdrop) => save({ blurBackdrop })}
              />
            </Row>
          </Section>

          <Section title={i18n.t('options.sections.search')}>
            <Row label={i18n.t('options.openIn.label')} description={i18n.t('options.openIn.description')}>
              <Segmented<OpenTarget>
                aria-label={i18n.t('options.openIn.label')}
                value={settings.openIn}
                onValueChange={(openIn) => save({ openIn })}
                options={[
                  { value: 'new-tab', label: i18n.t('options.openIn.newTab') },
                  { value: 'current-tab', label: i18n.t('options.openIn.currentTab') },
                ]}
              />
            </Row>
            <Row label={i18n.t('options.engine.label')}>
              <select
                aria-label={i18n.t('options.engine.label')}
                value={settings.searchEngine}
                onChange={(event) => save({ searchEngine: event.target.value as SearchEngineId })}
                className="h-8 rounded-lg border bg-muted px-2.5 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SEARCH_ENGINE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {engineLabel(id)}
                  </option>
                ))}
              </select>
            </Row>
            {settings.searchEngine === 'custom' && (
              <Row label={i18n.t('options.engine.customUrl')} description={i18n.t('options.engine.customHint')}>
                <input
                  type="url"
                  defaultValue={settings.customSearchUrl}
                  placeholder="https://example.com/?q=%s"
                  onBlur={(event) => save({ customSearchUrl: event.target.value.trim() })}
                  className="h-8 w-64 rounded-lg border bg-muted px-2.5 text-[13px] text-foreground outline-none placeholder:text-subtle-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Row>
            )}
          </Section>

          <Section title={i18n.t('options.sections.sources')} description={i18n.t('options.sources.description')}>
            {(Object.keys(SOURCE_LABELS) as SourceId[]).map((source) => (
              <Row key={source} label={SOURCE_LABELS[source]()}>
                <Switch
                  aria-label={SOURCE_LABELS[source]()}
                  checked={settings.sources[source]}
                  onCheckedChange={(enabled) => save({ sources: { ...settings.sources, [source]: enabled } })}
                />
              </Row>
            ))}
          </Section>

          <Section title={i18n.t('options.sections.privacy')}>
            <LearningRow />
          </Section>

          <section className="space-y-2 px-1 text-[12.5px] text-muted-foreground">
            <h2 className="text-[13px] font-semibold text-foreground">{i18n.t('options.tips.title')}</h2>
            <p>{i18n.t('options.tips.scopes')}</p>
            <p>{i18n.t('options.tips.remove')}</p>
          </section>
        </main>
      </div>
    </ThemeRoot>
  );
}
