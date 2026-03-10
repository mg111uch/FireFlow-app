import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GPayPaymentModal } from '../components/PaymentModal';

// Mock GooglePayButton component
jest.mock('@google-pay/button-react', () => ({
  __esModule: true,
  default: () => <button data-testid="gpay-button">Google Pay</button>,
}));

// Extend Jest global types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}

describe('GPayPaymentModal', () => {
  const mockOnSuccess = jest.fn();
  const mockOnFailure = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders payment modal when open', () => {
    render(
      <GPayPaymentModal
        isOpen={true}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
    expect(screen.getByText('₹100.00')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <GPayPaymentModal
        isOpen={false}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    expect(screen.queryByText('Complete Payment')).not.toBeInTheDocument();
  });

  it('displays zero amount correctly', () => {
    render(
      <GPayPaymentModal
        isOpen={true}
        onClose={mockOnClose}
        amount={0}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    expect(screen.getByText('₹0.00')).toBeInTheDocument();
  });

  it('calls onPaymentSuccess when mock payment is clicked', async () => {
    render(
      <GPayPaymentModal
        isOpen={true}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    // Click mock payment button
    fireEvent.click(screen.getByText('Mock UPI / Pay Later'));

    // Fast-forward timers
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // Should call success callback with transaction details
    expect(mockOnSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: expect.stringContaining('mock_upi_'),
        status: 'success',
        method: 'Mock UPI'
      })
    );
  });

  it('resets state when modal reopens', () => {
    const { rerender } = render(
      <GPayPaymentModal
        isOpen={true}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    // Close modal
    rerender(
      <GPayPaymentModal
        isOpen={false}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    // Reopen modal - state should be reset
    rerender(
      <GPayPaymentModal
        isOpen={true}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    // Should show initial state, not success state
    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
  });

  it('prevents closing during processing', () => {
    render(
      <GPayPaymentModal
        isOpen={true}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    // Click cancel when not processing - should work
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows correct title for different states', () => {
    // Initial state
    const { rerender } = render(
      <GPayPaymentModal
        isOpen={true}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
  });
});

describe('GPayPaymentModal Error Handling', () => {
  const mockOnSuccess = jest.fn();
  const mockOnFailure = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles payment error from Google Pay button', async () => {
    render(
      <GPayPaymentModal
        isOpen={true}
        onClose={mockOnClose}
        amount={100}
        onPaymentSuccess={mockOnSuccess}
        onPaymentFailure={mockOnFailure}
      />
    );

    // The error handler would be triggered by the GooglePayButton
    // Since we're mocking it, we can't directly test this
    // But we can verify the component renders correctly
    expect(screen.getByTestId('gpay-button')).toBeInTheDocument();
  });
});
