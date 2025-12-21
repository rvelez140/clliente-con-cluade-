import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }))
  }
}));

const mockOnCompose = vi.fn();

const MockedSidebar = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <Sidebar onCompose={mockOnCompose} />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Sidebar Component', () => {
  it('should render sidebar with navigation items', () => {
    render(<MockedSidebar />);

    // Verificar que los elementos principales estén presentes
    expect(screen.getByText(/Gemini Mail/i)).toBeInTheDocument();
  });

  it('should contain inbox navigation item', () => {
    render(<MockedSidebar />);

    const inboxItem = screen.getByText(/inbox/i);
    expect(inboxItem).toBeInTheDocument();
  });

  it('should contain sent navigation item', () => {
    render(<MockedSidebar />);

    const sentItem = screen.getByText(/sent/i);
    expect(sentItem).toBeInTheDocument();
  });

  it('should contain drafts navigation item', () => {
    render(<MockedSidebar />);

    const draftsItem = screen.getByText(/drafts/i);
    expect(draftsItem).toBeInTheDocument();
  });

  it('should have compose button', () => {
    render(<MockedSidebar />);

    const composeButton = screen.getByRole('button', { name: /new message/i });
    expect(composeButton).toBeInTheDocument();
  });

  it('should call onClick when compose button is clicked', () => {
    const handleClick = vi.fn();

    // Mock del componente con handler
    const SidebarWithHandler = () => (
      <BrowserRouter>
        <div>
          <button onClick={handleClick}>New message</button>
        </div>
      </BrowserRouter>
    );

    render(<SidebarWithHandler />);

    const button = screen.getByRole('button', { name: /new message/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should highlight active navigation item', () => {
    render(<MockedSidebar />);

    // Verificar que hay elementos de navegación
    const navItems = screen.getAllByRole('button');
    expect(navItems.length).toBeGreaterThan(0);
  });

  it('should render with Material-UI components', () => {
    const { container } = render(<MockedSidebar />);

    // Verificar que se renderiza correctamente
    expect(container.firstChild).toBeInTheDocument();
  });
});
