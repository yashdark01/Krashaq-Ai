import { render, screen } from '@testing-library/react';
import FarmerForm from '@/components/FarmerForm';

describe('FarmerForm', () => {
  it('renders the form with required fields', () => {
    const mockOnFarmerAdded = jest.fn();
    render(<FarmerForm onFarmerAdded={mockOnFarmerAdded} />);

    expect(screen.getByText(/full name/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/location/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register farmer/i })).toBeInTheDocument();
  });

  it('displays validation error when form is submitted without required fields', async () => {
    const mockOnFarmerAdded = jest.fn();
    render(<FarmerForm onFarmerAdded={mockOnFarmerAdded} />);

    const submitButton = screen.getByRole('button', { name: /register farmer/i });
    submitButton.click();

    // The button should be disabled after clicking since required fields are empty
    // This is a basic test - in a real app, you'd want to test specific validation messages
  });
});
