import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { UserDetailModal } from './UserDetailModal';
import { UserWithSubscription } from '@/core/types';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
        'admin.userDetails': 'User Details',
        'admin.banUser': 'Ban User',
        'admin.makePremium': 'Make Premium',
        'admin.removePremium': 'Remove Premium',
        'admin.registrationDate': 'Registration Date',
        'admin.currentPlan': 'Current Plan',
        'admin.subscriptionExpires': 'Subscription Expires',
        'admin.never': 'Never',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Spy on Alert.alert
jest.spyOn(Alert, 'alert');

const makeUser = (overrides: Partial<UserWithSubscription> = {}): UserWithSubscription => ({
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2025-01-15T10:00:00Z',
  last_sign_in_at: '2025-06-01T10:00:00Z',
  role: 'free',
  subscription_status: 'active',
  ...overrides,
});

describe('UserDetailModal', () => {
  const onClose = jest.fn();
  const onBan = jest.fn().mockResolvedValue(undefined);
  const onRoleChange = jest.fn().mockResolvedValue(undefined);
  const onExpiryChange = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when user is null', () => {
    const { toJSON } = render(
      <UserDetailModal
        visible={true}
        user={null}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders user email', () => {
    const user = makeUser({ email: 'alice@example.com' });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(screen.getByText('alice@example.com')).toBeTruthy();
  });

  it('renders title', () => {
    const user = makeUser();
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(screen.getByText('User Details')).toBeTruthy();
  });

  it('shows free role badge for free user', () => {
    const user = makeUser({ role: 'free' });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(screen.getByText('free')).toBeTruthy();
  });

  it('shows premium role badge for premium user', () => {
    const user = makeUser({ role: 'premium' });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(screen.getByText('premium')).toBeTruthy();
  });

  it('shows Make Premium button for free user', () => {
    const user = makeUser({ role: 'free' });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(screen.getByText('Make Premium')).toBeTruthy();
  });

  it('shows Remove Premium button for premium user', () => {
    const user = makeUser({ role: 'premium' });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(screen.getByText('Remove Premium')).toBeTruthy();
  });

  it('shows Ban User button', () => {
    const user = makeUser();
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(screen.getByText('Ban User')).toBeTruthy();
  });

  it('shows Never when no subscription expiry', () => {
    const user = makeUser({ subscription_expires: undefined });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    expect(screen.getByText('Never')).toBeTruthy();
  });

  it('shows formatted expiry date when subscription has expiry', () => {
    const user = makeUser({ subscription_expires: '2026-12-31T00:00:00Z' });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    // Should show a date string (localized)
    expect(screen.getByText('12/31/2026')).toBeTruthy();
  });

  it('calls onRoleChange with "premium" when Make Premium is pressed for free user', async () => {
    const user = makeUser({ role: 'free' });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Make Premium'));
    });
    expect(onRoleChange).toHaveBeenCalledWith('user-1', 'premium');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onRoleChange with "free" when Remove Premium is pressed', async () => {
    const user = makeUser({ role: 'premium' });
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Remove Premium'));
    });
    expect(onRoleChange).toHaveBeenCalledWith('user-1', 'free');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Alert when Ban User is pressed', () => {
    const user = makeUser();
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    fireEvent.press(screen.getByText('Ban User'));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('calls onBan when Alert confirm is pressed', async () => {
    const user = makeUser();
    (Alert.alert as jest.Mock).mockImplementation((_title, _msg, buttons) => {
      // Find the destructive/confirm button and call its onPress
      const confirmBtn = buttons.find((b: any) => b.style === 'destructive' || b.text === 'Confirm');
      if (confirmBtn?.onPress) confirmBtn.onPress();
    });

    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Ban User'));
    });
    expect(onBan).toHaveBeenCalledWith('user-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is pressed', () => {
    const user = makeUser();
    render(
      <UserDetailModal
        visible={true}
        user={user}
        onClose={onClose}
        onBan={onBan}
        onRoleChange={onRoleChange}
        onExpiryChange={onExpiryChange}
      />
    );
    // The close button is a Pressable with Ionicons "close" icon
    // Find all buttons and pick the close one
    const buttons = screen.getAllByRole('button');
    // Close button is typically the last accessible button in the header
    fireEvent.press(buttons[buttons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });
});
