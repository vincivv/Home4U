import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

const useAuthMock = vi.fn();
const { projectsGetAllMock, projectsCreateMock, stylesGetAllMock, searchStylesMock } = vi.hoisted(() => ({
  projectsGetAllMock: vi.fn(),
  projectsCreateMock: vi.fn(),
  stylesGetAllMock: vi.fn(),
  searchStylesMock: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../services/api', () => ({
  projectsAPI: {
    getAll: projectsGetAllMock,
    getById: vi.fn(),
    create: projectsCreateMock,
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
}));

describe('Dashboard accessibility', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    projectsGetAllMock.mockReset();
    projectsCreateMock.mockReset();
    stylesGetAllMock.mockReset();
    searchStylesMock.mockReset();

    useAuthMock.mockReturnValue({
      user: { full_name: 'Test User' },
      token: 'fake-token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    projectsGetAllMock.mockResolvedValue({ data: [] });
    projectsCreateMock.mockResolvedValue({ data: { id: 22, room_type: 'Kitchen' } });
    stylesGetAllMock.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Scandinavian',
          description: 'Cozy minimalism with natural materials and calm light.',
          reasons: ['Natural wood improves warmth and comfort'],
          detected: ['Soft daylight detected'],
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

  it('opens a labeled modal drawer and exposes DNA chip pressed state', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole('button', { name: /explore scandinavian style/i }, { timeout: 3000 }),
    );

    const dialog = await screen.findByRole('dialog', { name: /scandinavian studio/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(/select a style dna chip to highlight matching cues/i);

    const naturalWoodChip = within(dialog).getByRole('button', { name: /natural wood/i });
    expect(naturalWoodChip).toHaveAttribute('aria-pressed', 'false');

    await user.click(naturalWoodChip);

    expect(naturalWoodChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('searches the rendered dashboard styles even when backend search misses them', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard />
      </MemoryRouter>,
    );

    const searchInput = await screen.findByRole('searchbox', { name: /search design styles/i });
    await user.type(searchInput, 'japanese');

    await waitFor(() => {
      expect(searchStylesMock).toHaveBeenCalledWith('japanese', 20, 1);
    });

    const resultsGrid = await waitFor(() => {
      const grid = container.querySelector('.search-gallery-grid');
      expect(grid).not.toBeNull();
      return grid;
    });

    expect(within(resultsGrid).getByRole('heading', { name: 'Japanese' })).toBeInTheDocument();
    expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument();
  });

  it('shows a local-fallback notice when remote style search fails', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard />
      </MemoryRouter>,
    );

    searchStylesMock.mockRejectedValueOnce({ message: 'Network Error' });

    const searchInput = await screen.findByRole('searchbox', { name: /search design styles/i });
    await user.type(searchInput, 'japanese');

    const resultsGrid = await waitFor(() => {
      const grid = container.querySelector('.search-gallery-grid');
      expect(grid).not.toBeNull();
      return grid;
    });

    expect(within(resultsGrid).getByRole('heading', { name: 'Japanese' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/showing local style matches only/i);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('preserves current projects when a silent refresh fails after creating a project', async () => {
    const user = userEvent.setup();

    projectsGetAllMock.mockResolvedValueOnce({
      data: [
        {
          id: 10,
          room_type: 'Living Room',
          budget: 1800,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    projectsGetAllMock.mockRejectedValue({
      message: 'Network Error',
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Living Room' })).toBeInTheDocument();
    const initialProjectFetchCount = projectsGetAllMock.mock.calls.length;

    await user.click(screen.getAllByRole('button', { name: /\+ new project/i })[0]);
    await user.selectOptions(screen.getByRole('combobox'), 'Kitchen');
    await user.click(screen.getByRole('button', { name: /^create project$/i }));

    expect(projectsCreateMock).toHaveBeenCalledWith('Kitchen');
    await waitFor(() => {
      expect(projectsGetAllMock.mock.calls.length).toBeGreaterThan(initialProjectFetchCount);
    });
    expect(screen.getByRole('heading', { name: 'Living Room' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Kitchen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
