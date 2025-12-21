import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

// Mock del AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    logout: vi.fn(),
  }),
}));

// Mock del ThemeContext
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    currentTheme: {
      colors: {
        primary: '#1976d2',
        secondary: '#dc004e',
        background: '#ffffff',
        text: '#000000',
        border: '#e0e0e0',
      },
    },
    setTheme: vi.fn(),
    toggleDarkMode: vi.fn(),
    isDarkMode: false,
  }),
}));

const MockedSidebar = () => (
  <BrowserRouter>
    <Sidebar onCompose={vi.fn()} />
  </BrowserRouter>
);

describe('Sidebar Component', () => {
  it('should render sidebar with branding', () => {
    const { container } = render(<MockedSidebar />);

    // Verificar que el sidebar se renderiza
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render navigation items', () => {
    render(<MockedSidebar />);

    // Verificar que hay botones de navegación
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render with compose callback', () => {
    const mockCompose = vi.fn();

    render(
      <BrowserRouter>
        <Sidebar onCompose={mockCompose} />
      </BrowserRouter>
    );

    // Verificar que el componente se renderiza sin errores
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render with Material-UI components', () => {
    const { container } = render(<MockedSidebar />);

    // Verificar que se renderiza correctamente
    expect(container.firstChild).toBeInTheDocument();
  });
});
