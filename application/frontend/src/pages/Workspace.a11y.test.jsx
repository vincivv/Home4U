import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Workspace from './Workspace';

const {
  stylesGetAllMock,
  projectCreateMock,
  projectUpdateMock,
  projectUploadPhotoMock,
  projectAnalyzeMock,
  extractImageProfileMock,
  inferDetectedTagsMock,
  normalizeRoomUploadMock,
  renderConceptPreviewMock,
} = vi.hoisted(() => ({
  stylesGetAllMock: vi.fn(),
  projectCreateMock: vi.fn(),
  projectUpdateMock: vi.fn(),
  projectUploadPhotoMock: vi.fn(),
  projectAnalyzeMock: vi.fn(),
  extractImageProfileMock: vi.fn(),
  inferDetectedTagsMock: vi.fn(),
  normalizeRoomUploadMock: vi.fn(),
  renderConceptPreviewMock: vi.fn(),
}));

vi.mock('../services/api', () => ({
  projectsAPI: {
    create: projectCreateMock,
    update: projectUpdateMock,
    uploadPhoto: projectUploadPhotoMock,
    analyze: projectAnalyzeMock,
  },
  stylesAPI: {
    getAll: stylesGetAllMock,
  },
}));

vi.mock('../utils/workspaceDesign', () => ({
  getBudgetAmount: (tier) => ({ low: 900, medium: 2600, high: 6500 }[tier] || 2600),
  extractImageProfile: extractImageProfileMock,
  inferDetectedTags: inferDetectedTagsMock,
  normalizeRoomUpload: normalizeRoomUploadMock,
  renderConceptPreview: renderConceptPreviewMock,
  ROOM_UPLOAD_SOURCE_MAX_BYTES: 40 * 1024 * 1024,
  ROOM_UPLOAD_TARGET_MAX_BYTES: 20 * 1024 * 1024,
}));

describe('Workspace accessibility', () => {
  beforeEach(() => {
    stylesGetAllMock.mockReset();
    projectCreateMock.mockReset();
    projectUpdateMock.mockReset();
    projectUploadPhotoMock.mockReset();
    projectAnalyzeMock.mockReset();
    extractImageProfileMock.mockReset();
    inferDetectedTagsMock.mockReset();
    normalizeRoomUploadMock.mockReset();
    renderConceptPreviewMock.mockReset();
    stylesGetAllMock.mockResolvedValue({ data: [] });
    projectCreateMock.mockResolvedValue({
      data: { id: 17, room_type: 'Living Room', budget: 0, photo_url: null },
    });
    projectUpdateMock.mockResolvedValue({
      data: { id: 17, room_type: 'Living Room', budget: 2600, photo_url: null },
    });
    projectUploadPhotoMock.mockResolvedValue({
      data: { id: 17, room_type: 'Living Room', budget: 2600, photo_url: '/uploads/project_17.png' },
    });
    projectAnalyzeMock.mockResolvedValue({
      data: {
        project: { id: 17, room_type: 'Living Room', budget: 2600, photo_url: '/uploads/project_17.png' },
        selected_style: { id: 3, name: 'Scandinavian', description: 'Cozy minimalism with natural materials and calm light.' },
        summary: 'Scandinavian scored 82% for this living room based on saved design signals.',
        image_profile: {
          width: 800,
          height: 600,
          aspect_ratio: 1.333,
          average_brightness: 0.55,
          average_saturation: 0.32,
          warmth_bias: 0.08,
          dominant_hex: '#b0a79b',
        },
        suggested_tags: [
          { id: 1, name: 'neutral', confidence: 0.82, source: 'selected-style' },
        ],
        style_scores: [
          { style_id: 3, style_name: 'Scandinavian', score_value: 82, matched_tags: ['neutral'] },
        ],
        recommendations: [
          { id: 91, room_project_id: 17, description: 'Anchor the living room around neutral cues.', priority_score: 9.4, estimated_cost: 884, is_completed: false, created_at: '2026-01-01T00:00:00Z' },
        ],
      },
    });
    extractImageProfileMock.mockResolvedValue({
      width: 800,
      height: 600,
      aspect_ratio: 1.333,
      average_brightness: 0.55,
      average_saturation: 0.32,
      warmth_bias: 0.08,
      dominant_hex: '#b0a79b',
    });
    inferDetectedTagsMock.mockReturnValue(['neutral', 'clean']);
    normalizeRoomUploadMock.mockImplementation(async (file) => ({
      file,
      previewUrl: 'data:image/png;base64,room-preview',
      optimized: false,
      notice: '',
    }));
    renderConceptPreviewMock.mockResolvedValue('data:image/png;base64,concept');
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders an accessible before and after concept preview after generating a plan', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/workspace',
            search: '?style=scandinavian',
            state: {
              selectedStyle: {
                name: 'Scandinavian',
                slug: 'scandinavian',
                description: 'Cozy minimalism with natural materials and calm light.',
              },
            },
          },
        ]}
      >
        <Workspace />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /living room/i }));

    const generateButton = screen.getByRole('button', { name: /generate plan/i });
    expect(generateButton).toBeEnabled();

    await user.click(generateButton);

    const preview = await screen.findByRole('region', { name: /before and after concept preview/i }, { timeout: 4000 });
    expect(within(preview).getByRole('img', { name: /before/i })).toBeInTheDocument();
    expect(within(preview).getByRole('img', { name: /after/i })).toBeInTheDocument();
    expect(within(preview).getByText(/82% style match/i)).toBeInTheDocument();
  }, 8000);

  it('rejects non-image uploads before the backend run begins', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/workspace',
            search: '?style=scandinavian',
            state: {
              selectedStyle: {
                name: 'Scandinavian',
                slug: 'scandinavian',
                description: 'Cozy minimalism with natural materials and calm light.',
              },
            },
          },
        ]}
      >
        <Workspace />
      </MemoryRouter>,
    );

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const textFile = new File(['notes'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/choose a png, jpg, or webp image/i);
    expect(projectCreateMock).not.toHaveBeenCalled();
    expect(screen.getByText(/room load failed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /living room/i }));
  });

  it('accepts normalized room uploads and surfaces the optimization notice', async () => {
    const { container } = render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/workspace',
            search: '?style=scandinavian',
            state: {
              selectedStyle: {
                name: 'Scandinavian',
                slug: 'scandinavian',
                description: 'Cozy minimalism with natural materials and calm light.',
              },
            },
          },
        ]}
      >
        <Workspace />
      </MemoryRouter>,
    );

    normalizeRoomUploadMock.mockResolvedValueOnce({
      file: new File(['optimized-image'], 'loft-optimized.webp', { type: 'image/webp' }),
      previewUrl: 'data:image/webp;base64,optimized-preview',
      optimized: true,
      notice: 'Large image optimized from 24 MB to 7.6 MB for upload.',
    });

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const imageFile = new File(['room'], 'loft.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [imageFile] } });

    expect(await screen.findByText(/loaded asset: loft\.png/i)).toBeInTheDocument();
    expect(await screen.findByText(/large image optimized from 24 mb to 7\.6 mb for upload/i)).toBeInTheDocument();
    expect(screen.getByText(/room loaded/i)).toBeInTheDocument();
  });

  it('restores the previous plan when a rerun fails', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/workspace',
            search: '?style=scandinavian',
            state: {
              selectedStyle: {
                name: 'Scandinavian',
                slug: 'scandinavian',
                description: 'Cozy minimalism with natural materials and calm light.',
              },
            },
          },
        ]}
      >
        <Workspace />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /living room/i }));

    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    expect(await screen.findByRole('region', { name: /before and after concept preview/i }, { timeout: 4000 })).toBeInTheDocument();

    projectAnalyzeMock.mockRejectedValueOnce({
      response: {
        status: 503,
        data: { detail: 'Analysis service is temporarily unavailable.' },
      },
    });

    await user.click(screen.getByRole('button', { name: /generate plan/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/analysis service is temporarily unavailable/i);
    expect(screen.getByText('Previous plan restored', { selector: '.status' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/still available while you retry/i);
    expect(screen.getByRole('region', { name: /before and after concept preview/i })).toBeInTheDocument();
  }, 8000);
});
