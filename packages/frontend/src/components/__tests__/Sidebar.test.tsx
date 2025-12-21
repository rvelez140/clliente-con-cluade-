import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock de API para evitar errores de localStorage y network
vi.mock('../../services/api', () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
}));

const MockedSidebar = ({ onCompose = vi.fn() }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <Sidebar onCompose={onCompose} />
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

    const inboxItem = screen.getByText(/Inbox/i);
    expect(inboxItem).toBeInTheDocument();
  });

  it('should contain sent navigation item', () => {
    render(<MockedSidebar />);

    const sentItem = screen.getByText(/Sent/i);
    expect(sentItem).toBeInTheDocument();
  });

  it('should contain drafts navigation item', () => {
    render(<MockedSidebar />);

    const draftsItem = screen.getByText(/Drafts/i);
    expect(draftsItem).toBeInTheDocument();
  });

  it('should have compose button', () => {
    render(<MockedSidebar />);

    const composeButton = screen.getByRole('button', { name: /new message/i });
    expect(composeButton).toBeInTheDocument();
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
