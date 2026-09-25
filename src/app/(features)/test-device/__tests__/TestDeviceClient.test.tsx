import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TestDeviceClient from '../TestDeviceClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock useI18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  })
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'user1', email: 'user1@example.com', name: 'User One' } },
    status: 'authenticated',
  }),
}));

// Mock EventSource as a class
class MockEventSource {
  onopen: any = null;
  onmessage: any = null;
  onerror: any = null;
  close = vi.fn();
  constructor(url: string) {}
}
global.EventSource = MockEventSource as any;

// Mock server actions
vi.mock('../actions', () => ({
  borrowDevice: vi.fn(),
  returnDevice: vi.fn(),
  getMonthlyLogs: vi.fn(),
  getAvailableAssets: vi.fn(),
  addTestDevice: vi.fn(),
  removeTestDevice: vi.fn(),
  updateTestDeviceNote: vi.fn(),
}));

import * as actions from '../actions';

describe('TestDeviceClient', () => {
  const mockCategories = [
    { key: 'LAPTOP', label: 'Laptop', emoji: '💻' }
  ];
  const mockCurrentUser = { id: 'user1', name: 'User One', email: 'user1@example.com' };
  
  const mockAvailableDevice = {
    id: 'dev1',
    code: 'DEV-001',
    name: 'Available Laptop',
    category: 'LAPTOP',
    testDeviceNote: 'For API testing',
    testDeviceLogs: [] // No active logs means it is available
  };
  
  const mockBorrowedDevice = {
    id: 'dev2',
    code: 'DEV-002',
    name: 'Borrowed Laptop',
    category: 'LAPTOP',
    testDeviceNote: '',
    testDeviceLogs: [
      {
        id: 'log1',
        userId: 'user1', // Borrowed by current user
        assetId: 'dev2',
        borrowedAt: new Date().toISOString(),
        user: { name: 'User One', email: 'user1@example.com' }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders devices correctly', () => {
    render(
      <TestDeviceClient 
        initialDevices={[mockAvailableDevice]}
        categories={mockCategories}
        currentUser={mockCurrentUser}
      />
    );
    expect(screen.getByText('Available Laptop')).toBeInTheDocument();
    expect(screen.getByText('DEV-001')).toBeInTheDocument();
    expect(screen.getByText('For API testing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'testDeviceFeat.borrowDevice' })).toBeInTheDocument();
  });

  it('renders borrowed devices correctly with return option for the borrower', () => {
    render(
      <TestDeviceClient 
        initialDevices={[mockBorrowedDevice]}
        categories={mockCategories}
        currentUser={mockCurrentUser}
      />
    );
    expect(screen.getByText('Borrowed Laptop')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('testDeviceFeat.borrowed'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('User One'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'testDeviceFeat.returnDevice' })).toBeInTheDocument();
  });

  it('calls borrowDevice when Borrow Now is clicked', async () => {
    (actions.borrowDevice as any).mockResolvedValueOnce(undefined);
    render(
      <TestDeviceClient 
        initialDevices={[mockAvailableDevice]}
        categories={mockCategories}
        currentUser={mockCurrentUser}
      />
    );
    
    const borrowBtn = screen.getByRole('button', { name: 'testDeviceFeat.borrowDevice' });
    await act(async () => {
      fireEvent.click(borrowBtn);
    });
    
    expect(actions.borrowDevice).toHaveBeenCalledWith('dev1', undefined);
    expect(actions.borrowDevice).toHaveBeenCalledTimes(1);
  });
  
  it('opens history modal when View History is clicked', async () => {
    (actions.getMonthlyLogs as any).mockResolvedValueOnce([]);
    
    render(
      <TestDeviceClient 
        initialDevices={[]}
        categories={mockCategories}
        currentUser={mockCurrentUser}
      />
    );
    
    const historyBtn = screen.getByRole('button', { name: 'testDeviceFeat.viewHistory' });
    fireEvent.click(historyBtn);
    
    await waitFor(() => {
      expect(screen.getByText('testDeviceFeat.historyLog')).toBeInTheDocument();
    });
    expect(actions.getMonthlyLogs).toHaveBeenCalledTimes(1);
  });
});
