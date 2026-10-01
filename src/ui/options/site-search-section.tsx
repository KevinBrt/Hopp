import { i18n } from '#i18n';
import { Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { defaultSiteSearches, isValidTemplate, parseKeywords, type SiteSearch } from '@/core/site-search';
import { updateSettings } from '@/shared/settings';
import { Button } from '../components/button';
import { Input } from '../components/input';

/** Keywords already used by an earlier site: only the first one wins. */
function duplicateKeywords(sites: SiteSearch[]): Map<string, string[]> {
  const seen = new Set<string>();
  const duplicates = new Map<string, string[]>();
  for (const site of sites) {
    for (const keyword of site.keywords) {
      if (seen.has(keyword)) duplicates.set(site.id, [...(duplicates.get(site.id) ?? []), keyword]);
      seen.add(keyword);
    }
  }
  return duplicates;
}

interface RowProps {
  site: SiteSearch;
  duplicates: string[] | undefined;
  onChange: (site: SiteSearch) => void;
  onRemove: () => void;
}

/** Edited as a draft, committed on blur: typing never revalidates mid-word. */
function useDraft(value: string): [string, (next: string) => void] {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return [draft, setDraft];
}

function SiteRow({ site, duplicates, onChange, onRemove }: RowProps) {
  const [name, setName] = useDraft(site.name);
  const [keywords, setKeywords] = useDraft(site.keywords.join(', '));
  const [url, setUrl] = useDraft(site.url);
  const invalidUrl = site.url !== '' && !isValidTemplate(site.url);

  const commit = () => {
    const next = { ...site, name: name.trim(), keywords: parseKeywords(keywords), url: url.trim() };
    if (JSON.stringify(next) !== JSON.stringify(site)) onChange(next);
  };

  return (
    <div className="space-y-1.5 px-4 py-3">
      <div className="flex items-center gap-2">
        <Input
          aria-label={i18n.t('options.siteSearch.name')}
          placeholder={i18n.t('options.siteSearch.name')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={commit}
          className="w-36"
        />
        <Input
          aria-label={i18n.t('options.siteSearch.keywords')}
          placeholder={i18n.t('options.siteSearch.keywordsPlaceholder')}
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          onBlur={commit}
          aria-invalid={!!duplicates?.length}
          className="w-28 font-mono"
        />
        <Input
          aria-label={i18n.t('options.siteSearch.url')}
          placeholder="https://example.com/search?q=%s"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onBlur={commit}
          aria-invalid={invalidUrl}
          className="flex-1"
        />
        <Button variant="ghost" aria-label={i18n.t('options.siteSearch.remove')} onClick={onRemove} className="px-2">
          <X className="size-4" />
        </Button>
      </div>
      {invalidUrl && <p className="text-[12px] text-red-500">{i18n.t('options.siteSearch.invalidUrl')}</p>}
      {duplicates?.length ? (
        <p className="text-[12px] text-red-500">{i18n.t('options.siteSearch.duplicate', [duplicates.join(', ')])}</p>
      ) : null}
    </div>
  );
}

export function SiteSearchSection({ sites }: { sites: SiteSearch[] }) {
  const save = (siteSearches: SiteSearch[]) => void updateSettings({ siteSearches });
  const duplicates = duplicateKeywords(sites);

  return (
    <>
      {sites.map((site, index) => (
        <SiteRow
          key={site.id}
          site={site}
          duplicates={duplicates.get(site.id)}
          onChange={(next) => save(sites.map((candidate, i) => (i === index ? next : candidate)))}
          onRemove={() => save(sites.filter((_, i) => i !== index))}
        />
      ))}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Button onClick={() => save([...sites, { id: crypto.randomUUID(), name: '', keywords: [], url: '' }])}>
          <Plus className="size-4" />
          {i18n.t('options.siteSearch.add')}
        </Button>
        <Button variant="ghost" onClick={() => save(defaultSiteSearches(browser.i18n.getUILanguage()))}>
          <RotateCcw className="size-3.5" />
          {i18n.t('options.siteSearch.reset')}
        </Button>
      </div>
    </>
  );
}
