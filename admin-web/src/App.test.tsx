import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const metrics = {
  total_issued: 12,
  total_admitted: 5,
  pending_sync_estimate: null,
  gates: [{ gate_id: 3, name: 'North Gate', admitted: 5, capacity: 100 }],
  anomalies_count: 0,
  recent_anomalies: [],
};

afterEach(() => vi.unstubAllGlobals());

describe('administrator application flow', () => {
  it('signs in, opens each workspace, creates an event, and signs out', async () => {
    const user = userEvent.setup();
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      const parsedUrl = new URL(url, 'http://localhost');

      if (parsedUrl.pathname === '/api/v1/auth/login') {
        return jsonResponse({
          token: 'admin-token',
          user: { id: 1, name: 'Event Administrator', student_number: null, role: 'administrator' },
        });
      }
      if (parsedUrl.pathname === '/api/v1/auth/logout') return jsonResponse({ message: 'Signed out.' });
      if (parsedUrl.pathname === '/api/v1/admin/metrics') return jsonResponse(metrics);
      if (parsedUrl.pathname === '/api/v1/admin/security-staff') return jsonResponse({ staff: [] });
      if (parsedUrl.pathname === '/api/v1/admin/students') {
        return jsonResponse({ students: [], meta: { current_page: 1, per_page: 25, last_page: 1, total: 0 } });
      }
      if (parsedUrl.pathname === '/api/v1/admin/events' && init?.method === 'POST') {
        const event = {
          id: 10,
          venue_id: 4,
          venue: { id: 4, name: 'North Gym' },
          name: 'Winter Assembly',
          description: null,
          starts_at: '2026-12-18T10:00:00+08:00',
          ends_at: '2026-12-18T12:00:00+08:00',
          status: 'draft',
          configuration_version: 1,
          event_gates: [],
        };
        return jsonResponse(event, 201);
      }
      if (parsedUrl.pathname === '/api/v1/admin/events') return jsonResponse({ events: [] });
      if (parsedUrl.pathname === '/api/v1/admin/event-options') {
        return jsonResponse({
          venues: [{ id: 4, name: 'North Gym', location_details: null, gates: [] }],
          security_staff: [],
        });
      }
      if (parsedUrl.pathname === '/api/v1/admin/activity-logs') {
        return jsonResponse({ entries: [], has_more: false, limit: 100 });
      }

      throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await user.type(screen.getByRole('textbox', { name: 'Institutional email' }), 'admin@example.edu');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Operations overview' })).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Security staff' }));
    expect(await screen.findByRole('heading', { name: 'Security staff' })).toBeInTheDocument();
    expect(await screen.findByText('No staff accounts yet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Students' }));
    expect(await screen.findByRole('heading', { name: 'Student accounts' })).toBeInTheDocument();
    expect(await screen.findByText('No student accounts yet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Events & gates' }));
    expect(await screen.findByRole('heading', { name: 'Events & gates' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New event' }));
    const form = screen.getByRole('heading', { name: 'Create draft event' }).closest('section');
    expect(form).not.toBeNull();
    const eventForm = within(form as HTMLElement);
    fireEvent.change(eventForm.getByLabelText('Event name'), { target: { value: 'Winter Assembly' } });
    fireEvent.change(eventForm.getByLabelText('Starts'), { target: { value: '2026-12-18T10:00' } });
    fireEvent.change(eventForm.getByLabelText('Ends'), { target: { value: '2026-12-18T12:00' } });
    await user.click(eventForm.getByRole('button', { name: 'Create draft' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Draft event created.');
    const createRequest = requests.find(({ url, init }) => url === '/api/v1/admin/events' && init?.method === 'POST');
    expect(createRequest).toBeDefined();
    expect(JSON.parse(String(createRequest?.init?.body))).toMatchObject({
      venue_id: 4,
      name: 'Winter Assembly',
      description: null,
    });

    await user.click(screen.getByRole('button', { name: 'Audit log' }));
    expect(await screen.findByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
    expect(await screen.findByText('No matching activity')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Live dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Operations overview' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(requests.some(({ url }) => url === '/api/v1/auth/logout')).toBe(true);
  });
});
