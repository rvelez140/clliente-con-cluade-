import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../contexts/AuthContext';
import * as authApi from '../../services/api';

// Mock del módulo de API
vi.mock('../../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn()
  }
}));

// Mock de react-router-dom
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

const MockedLogin = () => (
  <BrowserRouter>
    <AuthProvider>
      <Login />
    </AuthProvider>
  </BrowserRouter>
);

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    render(<MockedLogin />);

    expect(screen.getByText(/Gemini Mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('should have email and password inputs', () => {
    render(<MockedLogin />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should allow typing in email input', () => {
    render(<MockedLogin />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(emailInput.value).toBe('test@example.com');
  });

  it('should allow typing in password input', () => {
    render(<MockedLogin />);

    const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;

    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(passwordInput.value).toBe('password123');
  });

  it('should submit form with valid credentials', async () => {
    const mockResponse = {
      data: {
        token: 'mock_token',
        user: { id: '1', email: 'test@example.com' },
      },
    };

    vi.mocked(authApi.authApi.login).mockResolvedValueOnce(mockResponse);

    render(<MockedLogin />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authApi.authApi.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });
  });

  it('should show error message on failed login', async () => {
    vi.mocked(authApi.authApi.login).mockRejectedValueOnce({
      response: { data: { error: 'Credenciales inválidas' } },
    });

    render(<MockedLogin />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
    });
  });

  it('should have a tab to switch to register', () => {
    render(<MockedLogin />);

    const registerTab = screen.getByText(/registrarse/i);
    expect(registerTab).toBeInTheDocument();
  });

  it('should disable submit button while loading', async () => {
    vi.mocked(authApi.authApi.login).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<MockedLogin />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // El botón debería estar deshabilitado mientras se procesa
    expect(submitButton).toBeDisabled();
  });
});
