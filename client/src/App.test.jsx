import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>
  );
}

describe('frontend routes', () => {
  it('renders the landing page and registration entry point', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /a clearer view of your everyday business/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/register');
  });

  it('redirects protected pages to sign in without a token', async () => {
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: /sign in to your shop/i })).toBeInTheDocument();
  });
});
