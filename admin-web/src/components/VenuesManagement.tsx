import { AlertCircle, Building2, Check, Loader2, Plus } from 'lucide-react';
import { useVenues } from '../hooks/useVenues';
import { VenueCard } from './venues/VenueCard';
import { VenueForm } from './venues/VenueForm';

interface VenuesManagementProps {
  token: string;
  /** Refetches GET /admin/event-options so new venues appear in the new-event form. */
  onVenuesChanged: () => Promise<void>;
}

export function VenuesManagement({ token, onVenuesChanged }: VenuesManagementProps) {
  const venues = useVenues(token, onVenuesChanged);

  return (
    <section className="venues-view" aria-labelledby="venues-page-title">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">VENUE SETUP</p>
          <h1 id="venues-page-title">Venues</h1>
          <p className="dashboard-subtitle">Add the places where events happen and the gates their staff will scan at.</p>
        </div>
        <div className="staff-total-pill"><Building2 size={16} /><span>{venues.venues.length} venues</span></div>
      </header>

      {venues.error && <div className="notice notice--error" role="alert"><AlertCircle size={18} /><span>{venues.error}</span></div>}
      {venues.notice && <div className="notice notice--success" role="status"><Check size={18} /><span>{venues.notice}</span></div>}

      <div className="venues-layout">
        <section className="surface-card panel venue-create-panel" aria-labelledby="venue-create-title">
          <div className="panel-heading">
            <div><span className="eyebrow">New venue</span><h2 id="venue-create-title">Add a venue</h2></div>
            <span className="panel-icon"><Plus size={19} /></span>
          </div>
          <VenueForm idPrefix="new-venue" submitLabel="Create venue" onSubmit={venues.create} />
        </section>

        <div className="venue-list-wrap">
          {venues.isLoading ? (
            <div className="staff-loading" role="status"><Loader2 size={20} className="spin" /> Loading venues…</div>
          ) : venues.venues.length > 0 ? (
            <ul className="venue-list">
              {venues.venues.map((venue) => <VenueCard key={venue.id} venue={venue} actions={venues} />)}
            </ul>
          ) : (
            <div className="surface-card staff-empty-state">
              <span className="staff-empty-icon"><Building2 size={21} /></span>
              <strong>No venues to show</strong>
              <p>Create a venue, then add its gates.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
