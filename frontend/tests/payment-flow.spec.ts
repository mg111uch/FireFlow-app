import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  const mockFormWithPrice = {
    id: 1,
    title: 'Paid Service Form',
    description: 'A form with price',
    price: 100,
    creator_id: 1,
    creator_username: 'testuser',
    questions: [
      { id: 1, question_text: 'What is your name?', question_type: 'text' },
      { id: 2, question_text: 'Select service type', question_type: 'radio', options: [
        { id: 1, option_text: 'Basic' },
        { id: 2, option_text: 'Premium' }
      ]}
    ]
  };

  const mockFormFree = {
    id: 2,
    title: 'Free Service Form',
    description: 'A free form',
    price: 0,
    creator_id: 1,
    creator_username: 'testuser',
    questions: [
      { id: 1, question_text: 'What is your name?', question_type: 'text' }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Mock the form API response
    await page.route('**/api/forms/*', async (route) => {
      const formId = route.request().url().split('/').pop();
      if (formId === '1') {
        await route.fulfill({ status: 200, body: JSON.stringify(mockFormWithPrice) });
      } else if (formId === '2') {
        await route.fulfill({ status: 200, body: JSON.stringify(mockFormFree) });
      } else {
        await route.continue();
      }
    });

    // Mock the form submission API
    await page.route('**/api/forms/*/submit', async (route) => {
      const body = route.request().postDataJSON();
      
      // If there's paymentDetails with failed status, return error
      if (body.paymentDetails && body.paymentDetails.status === 'failed') {
        await route.fulfill({ 
          status: 400, 
          body: JSON.stringify({ error: 'Payment not completed.' }) 
        });
        return;
      }
      
      await route.fulfill({ 
        status: 201, 
        body: JSON.stringify({ message: 'Form submitted successfully!', submissionId: 123 }) 
      });
    });
  });

  test('shows "Pay ₹100 & Submit" button when form has price', async ({ page }) => {
    await page.goto('/services/forms/1/fill');
    
    // Wait for the form to load
    await expect(page.getByText('Paid Service Form')).toBeVisible();
    
    // Check button text for paid form
    await expect(page.getByRole('button', { name: /Pay ₹100/i })).toBeVisible();
  });

  test('shows "Submit" button when form is free', async ({ page }) => {
    await page.goto('/services/forms/2/fill');
    
    // Wait for the form to load
    await expect(page.getByText('Free Service Form')).toBeVisible();
    
    // Check button text for free form
    await expect(page.getByRole('button', { name: /^Submit$/i })).toBeVisible();
  });

  test('opens payment modal when clicking pay button on paid form', async ({ page }) => {
    await page.goto('/services/forms/1/fill');
    
    // Fill in some answers first
    await page.getByLabel('What is your name?').fill('John Doe');
    
    // Click the pay button
    await page.getByRole('button', { name: /Pay ₹100/i }).click();
    
    // Modal should open
    await expect(page.getByText('Complete Payment')).toBeVisible();
    await expect(page.getByText('₹100.00')).toBeVisible();
  });

  test('can close payment modal when not processing', async ({ page }) => {
    await page.goto('/services/forms/1/fill');
    
    // Open modal
    await page.getByRole('button', { name: /Pay ₹100/i }).click();
    await expect(page.getByText('Complete Payment')).toBeVisible();
    
    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.getByText('Complete Payment')).not.toBeVisible();
  });

  test('mock payment button triggers success flow', async ({ page }) => {
    await page.goto('/services/forms/1/fill');
    
    // Fill in answers
    await page.getByLabel('What is your name?').fill('John Doe');
    
    // Open payment modal
    await page.getByRole('button', { name: /Pay ₹100/i }).click();
    
    // Click mock payment
    await page.getByRole('button', { name: /Mock UPI/i }).click();
    
    // Wait for success message
    await expect(page.getByText('Payment Successful')).toBeVisible();
  });

  test('free form submits directly without payment modal', async ({ page }) => {
    // Set up alert handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Form submitted successfully!');
      await dialog.accept();
    });
    
    await page.goto('/services/forms/2/fill');
    
    // Fill in answers
    await page.getByLabel('What is your name?').fill('John Doe');
    
    // Click submit
    await page.getByRole('button', { name: /^Submit$/i }).click();
    
    // No modal should appear, form should submit directly
    await expect(page.getByText('Complete Payment')).not.toBeVisible();
  });

  test('validation: shows error when form is submitted without answers', async ({ page }) => {
    await page.goto('/services/forms/1/fill');
    
    // Try to submit without filling answers
    await page.getByRole('button', { name: /Pay ₹100/i }).click();
    
    // Modal should open (price > 0 triggers modal regardless of answers)
    // But if we test free form:
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Now try free form without answers
    await page.goto('/services/forms/2/fill');
    await page.getByRole('button', { name: /^Submit$/i }).click();
    
    // Should show validation error
    await expect(page.getByText('Please answer all questions')).toBeVisible();
  });
});

test.describe('Payment Modal Component', () => {
  test('displays correct amount in payment modal', async ({ page }) => {
    // Navigate to a page with payment modal
    await page.goto('/services/forms/1/fill');
    
    // Fill answer and open modal
    await page.getByLabel('What is your name?').fill('Test');
    await page.getByRole('button', { name: /Pay/i }).click();
    
    // Verify amount is displayed
    await expect(page.getByText('₹100.00')).toBeVisible();
  });

  test('shows processing state during mock payment', async ({ page }) => {
    await page.goto('/services/forms/1/fill');
    
    await page.getByLabel('What is your name?').fill('Test');
    await page.getByRole('button', { name: /Pay/i }).click();
    
    // Click mock payment
    await page.getByRole('button', { name: /Mock UPI/i }).click();
    
    // Should show processing state
    await expect(page.getByText('Processing transaction')).toBeVisible();
  });

  test('shows success state after payment completes', async ({ page }) => {
    await page.goto('/services/forms/1/fill');
    
    await page.getByLabel('What is your name?').fill('Test');
    await page.getByRole('button', { name: /Pay/i }).click();
    
    // Click mock payment and wait
    await page.getByRole('button', { name: /Mock UPI/i }).click();
    
    // Wait for success message (it has a delay)
    await expect(page.getByText('Payment Successful')).toBeVisible({ timeout: 5000 });
  });
});
