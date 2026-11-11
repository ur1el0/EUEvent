import { StatusBanner } from './ui/StatusBanner';
import { getManifestFreshnessCopy, type ManifestFreshness } from '../services/manifestFreshness';

/** Full freshness banner, shown only when the manifest warns or refuses. */
export function ManifestFreshnessNotice({ freshness }: { freshness: ManifestFreshness }) {
  if (freshness.decision === 'fresh') return null;

  const copy = getManifestFreshnessCopy(freshness);

  return (
    <StatusBanner
      tone={freshness.decision === 'refuse' ? 'error' : 'warning'}
      title={copy.title}
      message={copy.detail}
      style={{ marginBottom: 10 }}
    />
  );
}
