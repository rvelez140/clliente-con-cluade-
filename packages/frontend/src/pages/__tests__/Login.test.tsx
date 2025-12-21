import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';

// Mock de react-router-dom
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

// Mock del AuthContext
const mockLoginWithGoogle = vi.fn();
const mockLoginWithMicrosoft = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    loginWithGoogle: mockLoginWithGoogle,
    loginWithMicrosoft: mockLoginWithMicrosoft,
  }),
}));

const MockedLogin = () => (
  <BrowserRouter>
    <Login />
  </BrowserRouter>
);

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login page with Gemini Mail branding', () => {
    render(<MockedLogin />);

    expect(screen.getByText(/Gemini Mail/i)).toBeInTheDocument();
    expect(screen.getByText(/Personalize your experience/i)).toBeInTheDocument();
  });

  it('should render Google login button', () => {
    render(<MockedLogin />);

    const googleButton = screen.getByText(/Continue with Google/i);
    expect(googleButton).toBeInTheDocument();
  });

  it('should render Microsoft login button', () => {
    render(<MockedLogin />);

    const microsoftButton = screen.getByText(/Continue with Microsoft/i);
    expect(microsoftButton).toBeInTheDocument();
  });

  it('should render VPS login button', () => {
    render(<MockedLogin />);

    const vpsButton = screen.getByText(/Self-hosted \/ VPS/i);
    expect(vpsButton).toBeInTheDocument();
  });

  it('should call loginWithGoogle when Google button is clicked', async () => {
    render(<MockedLogin />);

    const googleButton = screen.getByText(/Continue with Google/i);
    fireEvent.click(googleButton);

    expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('should call loginWithMicrosoft when Microsoft button is clicked', async () => {
    render(<MockedLogin />);

    const microsoftButton = screen.getByText(/Continue with Microsoft/i);
    fireEvent.click(microsoftButton);

    expect(mockLoginWithMicrosoft).toHaveBeenCalledTimes(1);
  });

  it('should navigate to /vps-login when VPS button is clicked', () => {
    render(<MockedLogin />);

    const vpsButton = screen.getByText(/Self-hosted \/ VPS/i);
    fireEvent.click(vpsButton);

    expect(mockedNavigate).toHaveBeenCalledWith('/vps-login');
  });

  it('should have three authentication options', () => {
    render(<MockedLogin />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('should render with proper styling', () => {
    const { container } = render(<MockedLogin />);

    expect(container.firstChild).toBeInTheDocument();
  });
});
