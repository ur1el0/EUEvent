import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

describe('administrator sign-in form', () => {
  it('trims the email and submits the password', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginPage onLogin={onLogin} />);

    await user.type(screen.getByRole('textbox', { name: 'Institutional email' }), '  admin@example.edu  ');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onLogin).toHaveBeenCalledWith('admin@example.edu', 'StrongPassword123!');
  });

  it('shows a login error and re-enables the submit action', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockRejectedValue(new Error('This dashboard is for administrator accounts.'));
    render(<LoginPage onLogin={onLogin} />);

    await user.type(screen.getByRole('textbox', { name: 'Institutional email' }), 'staff@example.edu');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This dashboard is for administrator accounts.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
