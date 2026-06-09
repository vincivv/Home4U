import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from './App';

const useAuthMock = vi.fn();
const { projectsGetAllMock, stylesGetAllMock, searchStylesMock } = vi.hoisted(() => ({
  projectsGetAllMock: vi.fn(),
  stylesGetAllMock: vi.fn(),
  searchStylesMock: vi.fn(),
}));

vi.mock('./context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('./services/api', () => ({
  authAPI: {
    signup: vi.fn(),
    login: vi.fn(),
  },
  projectsAPI: {
    getAll: projectsGetAllMock,
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  stylesAPI: {
    getAll: stylesGetAllMock,
    getById: vi.fn(),
    getTags: vi.fn(),
    getAllTags: vi.fn(),
  },
  searchAPI: {
    searchStyles: searchStylesMock,
  },
  recommendationsAPI: {
    getByProject: vi.fn(),
    create: vi.fn(),
    markComplete: vi.fn(),
    generate: vi.fn(),
  },
  healthAPI: {
    check: vi.fn(),
  },
  default: {},
}));

vi.mock('./components/ApiStatusBanner', () => ({
  default: () => null,
}));

vi.mock('./pages/Workspace', async () => {
  const { useLocation } = await import('react-router-dom');

  return {
    default: function MockWorkspace() {
      const location = useLocation();

      return (
        <section>
          <h1>Mock Workspace</h1>
          <output data-testid="workspace-route-state">{JSON.stringify({
            search: location.search,
            state: location.state,
          })}</output>
        </section>
      );
    },
  };
});

const PathProbe = () => {
  const { pathname, search, state } = useLocation();
  return (
    <>
      <output data-testid="path-probe">{pathname}</output>
      <output data-testid="search-probe">{search}</output>
      <output data-testid="state-probe">{JSON.stringify(state || null)}</output>
    </>
  );
};

const renderAppAt = (path = '/login') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <PathProbe />
    </MemoryRouter>
  );

beforeEach(() => {
  useAuthMock.mockReset();
  projectsGetAllMock.mockReset();
  stylesGetAllMock.mockReset();
  searchStylesMock.mockReset();
  useAuthMock.mockReturnValue({
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
  projectsGetAllMock.mockResolvedValue({ data: [] });
  stylesGetAllMock.mockResolvedValue({
    data: [
      {
        id: 3,
        name: 'Scandinavian',
        description: 'Cozy minimalism with natural materials and calm light.',
      },
    ],
  });
  searchStylesMock.mockResolvedValue({
    data: { results: [], total: 0, page: 1, has_more: false },
  });
});

afterEach(() => {
  cleanup();
});

describe('App smoke routing', () => {
  it('renders the public landing page on /', async () => {
    renderAppAt('/');
    expect(await screen.findByRole('heading', { name: /plan interior projects/i }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId('path-probe')).toHaveTextContent('/');
  });

  it('renders login on /login', () => {
    renderAppAt('/login');
    expect(screen.getByRole('heading', { name: /sign in to home4u/i })).toBeInTheDocument();
    expect(screen.getByTestId('path-probe')).toHaveTextContent('/login');
  });

  it('renders registration mode on /register', () => {
    renderAppAt('/register');
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByTestId('path-probe')).toHaveTextContent('/register');
  });

  it('switches route from /login to /register when toggling auth mode', async () => {
    const user = userEvent.setup();
    renderAppAt('/login');

    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    expect(await screen.findByRole('heading', { name: /create your account/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByTestId('path-probe')).toHaveTextContent('/register');
  });

  it('redirects unauthenticated access from /dashboard to /login', async () => {
    renderAppAt('/dashboard');
    expect(await screen.findByRole('heading', { name: /sign in to home4u/i })).toBeInTheDocument();
    expect(screen.getByTestId('path-probe')).toHaveTextContent('/login');
  });

  it('shows protected navigation for authenticated sessions and allows logout navigation', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();

    useAuthMock.mockReturnValue({
      user: { full_name: 'Test User' },
      token: 'fake-token',
      loading: false,
      login: vi.fn(),
      logout,
    });

    renderAppAt('/workspace');

    expect(screen.getAllByRole('link', { name: /workspace/i }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /test/i }));
    await user.click(await screen.findByRole('button', { name: /^logout$/i }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: /sign in to home4u/i }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId('path-probe')).toHaveTextContent('/login');
  });

  it('passes selected style search params and route state from dashboard to workspace', async () => {
    const user = userEvent.setup();

    useAuthMock.mockReturnValue({
      user: { full_name: 'Test User' },
      token: 'fake-token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderAppAt('/dashboard?style=scandinavian');

    await user.click(
      await screen.findByRole('button', { name: /open design workspace/i }, { timeout: 3000 }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('path-probe')).toHaveTextContent('/workspace');
    });
    expect(screen.getByTestId('search-probe')).toHaveTextContent('?style=scandinavian');
    expect(screen.getByTestId('state-probe')).toHaveTextContent('"slug":"scandinavian"');
    expect(screen.getByTestId('state-probe')).toHaveTextContent('"name":"Scandinavian"');
  });

  it('redirects the retired walkthrough route into workspace for authenticated sessions', async () => {
    useAuthMock.mockReturnValue({
      user: { full_name: 'Test User' },
      token: 'fake-token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderAppAt('/virtual-tour');

    await waitFor(() => {
      expect(screen.getByTestId('path-probe')).toHaveTextContent('/workspace');
    });
  });
});
