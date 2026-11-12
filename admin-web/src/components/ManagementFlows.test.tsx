import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityLogManagement } from './ActivityLogManagement';
import { AdminEventManagement } from './AdminEventManagement';
import { SecurityStaffManagement } from './SecurityStaffManagement';
import { StudentManagement } from './StudentManagement';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('student account management', () => {
  it('creates a normalized account, updates the list, and searches by the submitted query', async () => {
    const user = userEvent.setup();
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      const parsed = new URL(url, 'http://localhost');

      if (parsed.pathname === '/api/v1/admin/students' && init?.method === 'POST') {
        return jsonResponse({ student: {
          id: 4,
          name: 'Ari Student',
          student_number: '2026-00004',
          email: 'ari@example.edu',
          created_at: null,
        } }, 201);
      }
      if (parsed.pathname === '/api/v1/admin/students' && parsed.searchParams.has('search')) {
        return jsonResponse({
          students: [{ id: 4, name: 'Ari Student', student_number: '2026-00004', email: 'ari@example.edu', created_at: null }],
          meta: { current_page: 1, per_page: 25, last_page: 1, total: 1 },
        });
      }
      if (parsed.pathname === '/api/v1/admin/students') {
        return jsonResponse({ students: [], meta: { current_page: 1, per_page: 25, last_page: 1, total: 0 } });
      }

      throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<StudentManagement token="admin-token" />);

    await user.type(screen.getByLabelText('Full name'), ' Ari Student ');
    await user.type(screen.getByLabelText('Student number'), '2026-00004');
    await user.type(screen.getByLabelText('Institutional email'), ' ARI@EXAMPLE.EDU ');
    await user.type(screen.getByLabelText('Initial password'), 'A-Strong-Password-4');
    await user.type(screen.getByLabelText('Confirm initial password'), 'A-Strong-Password-4');
    await user.click(screen.getByRole('button', { name: 'Create student account' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Student account created.');
    const createRequest = requests.find(({ url, init }) => url.endsWith('/admin/students') && init?.method === 'POST');
    expect(JSON.parse(String(createRequest?.init?.body))).toEqual({
      name: 'Ari Student',
      student_number: '2026-00004',
      email: 'ari@example.edu',
      password: 'A-Strong-Password-4',
      password_confirmation: 'A-Strong-Password-4',
    });

    await user.type(screen.getByLabelText('Search students'), '2026-00004');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Ari Student')).toBeInTheDocument();
    expect(requests.some(({ url }) => url.includes('search=2026-00004'))).toBe(true);
  });
});

describe('security staff management', () => {
  it('rejects mismatched passwords, creates staff, and confirms deactivation', async () => {
    const user = userEvent.setup();
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      const parsed = new URL(url, 'http://localhost');

      if (parsed.pathname === '/api/v1/admin/security-staff' && init?.method === 'POST') {
        return jsonResponse({ staff: { id: 8, name: 'Rin Staff', email: 'rin@example.edu', is_active: true } }, 201);
      }
      if (parsed.pathname === '/api/v1/admin/security-staff/8/status') {
        return jsonResponse({ staff: { id: 8, name: 'Rin Staff', email: 'rin@example.edu', is_active: false } });
      }
      if (parsed.pathname === '/api/v1/admin/security-staff') {
        return jsonResponse({ staff: [] });
      }

      throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SecurityStaffManagement token="admin-token" />);

    await user.type(screen.getByLabelText('Full name'), 'Rin Staff');
    await user.type(screen.getByLabelText('Institutional email'), 'RIN@EXAMPLE.EDU');
    await user.type(screen.getByLabelText('Initial password'), 'A-Strong-Password-8');
    await user.type(screen.getByLabelText('Confirm initial password'), 'A-Different-Password');
    await user.click(screen.getByRole('button', { name: 'Create staff account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The passwords do not match.');
    expect(requests.some(({ init }) => init?.method === 'POST')).toBe(false);

    await user.clear(screen.getByLabelText('Confirm initial password'));
    await user.type(screen.getByLabelText('Confirm initial password'), 'A-Strong-Password-8');
    await user.click(screen.getByRole('button', { name: 'Create staff account' }));
    expect(await screen.findByText('Rin Staff')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('Staff account created.');

    await user.click(screen.getByRole('button', { name: 'Deactivate Rin Staff' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('disconnected scanner may keep using its cached gate manifest'));
    expect(await screen.findByText('Inactive')).toBeInTheDocument();
    expect(requests.some(({ url, init }) => url.endsWith('/security-staff/8/status')
      && init?.method === 'PATCH'
      && JSON.parse(String(init.body)).is_active === false)).toBe(true);
  });
});

describe('activity log filters', () => {
  it('sends selected type and event filters to the API', async () => {
    const user = userEvent.setup();
    const requestedActivityUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname === '/api/v1/admin/events') {
        return jsonResponse({ events: [{ id: 9, name: 'Winter Assembly' }] });
      }
      if (parsed.pathname === '/api/v1/admin/activity-logs') {
        requestedActivityUrls.push(url);
        return jsonResponse({
          entries: [{
            id: 'scan-21', type: 'scan', event: { id: 9, name: 'Winter Assembly' },
            actor: { id: 2, name: 'Gate Staff' }, subject: 'Ticket #21',
            action: 'ticket_admitted', outcome: 'recorded', detail: null,
            occurred_at: '2026-11-12T08:30:00+08:00',
          }],
          has_more: false,
          limit: 100,
        });
      }

      throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ActivityLogManagement token="admin-token" />);

    await user.selectOptions(screen.getByLabelText('Activity type'), 'scan');
    await user.selectOptions(screen.getByLabelText('Event'), '9');
    expect(await screen.findByText('Ticket Admitted')).toBeInTheDocument();
    expect(requestedActivityUrls.some((url) => {
      const query = new URL(url, 'http://localhost').searchParams;
      return query.get('type') === 'scan' && query.get('event_id') === '9';
    })).toBe(true);
  });
});

describe('event gate and ticket management', () => {
  it('requires a reason before rescheduling a scheduled event', async () => {
    const user = userEvent.setup();
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const event = {
      id: 5,
      venue_id: 3,
      venue: { id: 3, name: 'North Gym' },
      name: 'Winter Assembly',
      description: null,
      starts_at: '2026-12-18T10:00:00+08:00',
      ends_at: '2026-12-18T12:00:00+08:00',
      status: 'scheduled',
      configuration_version: 2,
      event_gates: [],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      const parsed = new URL(url, 'http://localhost');

      if (parsed.pathname === '/api/v1/admin/events/5' && init?.method === 'PATCH') {
        return jsonResponse({ ...event, configuration_version: 3, starts_at: '2026-12-19T12:30:00Z' });
      }
      if (parsed.pathname === '/api/v1/admin/events/5/tickets') {
        return jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } });
      }
      if (parsed.pathname === '/api/v1/admin/events') return jsonResponse({ events: [event] });
      if (parsed.pathname === '/api/v1/admin/event-options') {
        return jsonResponse({ venues: [{ id: 3, name: 'North Gym', location_details: null, gates: [] }], security_staff: [] });
      }

      throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminEventManagement token="admin-token" />);

    await screen.findByRole('heading', { name: 'Winter Assembly' });
    await waitFor(() => expect(screen.getByLabelText('Event name')).toHaveValue('Winter Assembly'));
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-12-19T12:30' } });
    await waitFor(() => expect(screen.getByLabelText(/Change reason/)).toBeRequired());
    await user.click(screen.getByRole('button', { name: 'Save event changes' }));
    expect(screen.getByLabelText(/Change reason/)).toBeRequired();
    expect(requests.some(({ init }) => init?.method === 'PATCH')).toBe(false);

    await user.type(screen.getByLabelText(/Change reason/), 'Venue access was delayed.');
    await user.click(screen.getByRole('button', { name: 'Save event changes' }));
    expect(await screen.findByText('Event details saved. This change is recorded in the event change log.')).toBeInTheDocument();

    const update = requests.find(({ init }) => init?.method === 'PATCH');
    expect(JSON.parse(String(update?.init?.body))).toMatchObject({ reason: 'Venue access was delayed.' });
    expect(JSON.parse(String(update?.init?.body)).starts_at).toBeTruthy();
  });

  it('assigns a gate and staff, issues a ticket, then revokes it with an audit reason', async () => {
    const user = userEvent.setup();
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const gate = {
      id: 100,
      venue_gate_id: 7,
      code: 'NORTH',
      name: 'North Gate',
      capacity: 100,
      ticket_count: 1,
      security_staff: [{ id: 8, name: 'Rin Staff', email: 'rin@example.edu', is_active: true }],
    };
    const event = {
      id: 5,
      venue_id: 3,
      venue: { id: 3, name: 'North Gym' },
      name: 'Winter Assembly',
      description: null,
      starts_at: '2026-12-18T10:00:00+08:00',
      ends_at: '2026-12-18T12:00:00+08:00',
      status: 'draft',
      configuration_version: 1,
      event_gates: [],
    };
    const issuedEvent = { ...event, configuration_version: 2, event_gates: [gate] };
    const issuedTicket = {
      id: 21,
      student: { id: 4, name: 'Ari Student', student_number: '2026-00004' },
      gate: { event_gate_id: 100, code: 'NORTH', name: 'North Gate' },
      status: 'issued',
    };
    let isRevoked = false;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      const parsed = new URL(url, 'http://localhost');

      if (parsed.pathname === '/api/v1/admin/events/5/gates' && init?.method === 'PUT') {
        return jsonResponse(issuedEvent);
      }
      if (parsed.pathname === '/api/v1/admin/events/5/tickets' && init?.method === 'POST') {
        return jsonResponse({
          configuration_version: 3,
          ticket: { id: 21, student_number: '2026-00004', event_gate_id: 100, status: 'issued' },
        }, 201);
      }
      if (parsed.pathname === '/api/v1/admin/events/5/tickets/21/revoke') {
        isRevoked = true;
        return jsonResponse({
          configuration_version: 4,
          ticket: { ...issuedTicket, status: 'revoked' },
        });
      }
      if (parsed.pathname === '/api/v1/admin/events/5/tickets') {
        return jsonResponse({ data: [{ ...issuedTicket, status: isRevoked ? 'revoked' : 'issued' }], meta: { current_page: 1, last_page: 1, total: 1 } });
      }
      if (parsed.pathname === '/api/v1/admin/events') return jsonResponse({ events: [event] });
      if (parsed.pathname === '/api/v1/admin/event-options') {
        return jsonResponse({
          venues: [{ id: 3, name: 'North Gym', location_details: null, gates: [{ id: 7, code: 'NORTH', name: 'North Gate' }] }],
          security_staff: [{ id: 8, name: 'Rin Staff', email: 'rin@example.edu', is_active: true }],
        });
      }

      throw new Error(`Unexpected API request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminEventManagement token="admin-token" />);

    expect(await screen.findByRole('heading', { name: 'Winter Assembly' })).toBeInTheDocument();
    const gateField = screen.getByRole('group', { name: 'NORTH North Gate' });
    await user.click(within(gateField).getByRole('checkbox'));
    await user.type(screen.getByLabelText(/Ticket capacity/), '100');
    await user.click(screen.getByLabelText(/Rin Staff/));
    await user.click(screen.getByRole('button', { name: 'Save gate assignments' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Gate and staff assignments saved.');

    const gateRequest = requests.find(({ url, init }) => url.endsWith('/events/5/gates') && init?.method === 'PUT');
    expect(JSON.parse(String(gateRequest?.init?.body))).toMatchObject({
      gates: [{ venue_gate_id: 7, capacity: 100, security_staff_ids: [8] }],
    });

    await user.type(screen.getByLabelText('Student number'), '2026-00004');
    await user.click(screen.getByRole('button', { name: 'Issue student ticket' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Ticket #21 issued to student 2026-00004.');
    const issueRequest = requests.find(({ url, init }) => url.endsWith('/events/5/tickets') && init?.method === 'POST');
    expect(JSON.parse(String(issueRequest?.init?.body))).toEqual({ student_number: '2026-00004', event_gate_id: 100 });

    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    await user.type(screen.getByLabelText('Reason for revocation'), 'Duplicate ticket request');
    await user.click(screen.getByRole('button', { name: 'Revoke ticket' }));
    expect(await screen.findByText(/Ticket #21 revoked\./)).toBeInTheDocument();
    const revokeRequest = requests.find(({ url, init }) => url.endsWith('/tickets/21/revoke') && init?.method === 'PATCH');
    expect(JSON.parse(String(revokeRequest?.init?.body))).toEqual({ reason: 'Duplicate ticket request' });
    expect(await screen.findByText('Revoked')).toBeInTheDocument();
  });
});
