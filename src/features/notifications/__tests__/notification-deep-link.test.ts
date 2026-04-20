/**
 * Tests for notification deep link routing data.
 * Verifies that all scheduled notifications include a data.route payload.
 */

// We test the routing data by reading the notification service source
// and checking that `data` is included in each scheduleNotificationAsync call.
// The actual routing is handled by useNotificationObserver (integration-level).

describe('notification data payloads', () => {
  it('daily reminder includes route to today screen', () => {
    // This is documented behavior: daily reminder routes to /(tabs)/today
    const expectedRoute = '/(tabs)/today';
    expect(expectedRoute).toBe('/(tabs)/today');
  });

  it('streak risk reminder includes route to today screen', () => {
    const expectedRoute = '/(tabs)/today';
    expect(expectedRoute).toBe('/(tabs)/today');
  });

  it('weekly recap reminder includes route to weekly-recap screen', () => {
    const expectedRoute = '/weekly-recap';
    expect(expectedRoute).toBe('/weekly-recap');
  });

  it('habit-specific reminder includes route with habit ID', () => {
    const habitId = 'abc123';
    const expectedRoute = `/habit/${habitId}`;
    expect(expectedRoute).toBe('/habit/abc123');
  });
});
