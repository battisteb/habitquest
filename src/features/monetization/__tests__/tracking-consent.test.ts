const mockRequest = jest.fn();

jest.mock('expo-tracking-transparency', () => ({
  requestTrackingPermissionsAsync: () => mockRequest(),
}));

function loadWithPlatform(os: 'ios' | 'android') {
  let mod: typeof import('../utils/tracking-consent') | undefined;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    mod = require('../utils/tracking-consent');
  });
  return mod!;
}

describe('tracking-consent', () => {
  afterEach(() => {
    mockRequest.mockReset();
  });

  it('allows personalized ads on Android without a prompt', async () => {
    const { requestTrackingConsent, canPersonalizeAds } = loadWithPlatform('android');
    expect(canPersonalizeAds()).toBe(true);
    await expect(requestTrackingConsent()).resolves.toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('defaults to non-personalized ads on iOS until consent is given', async () => {
    mockRequest.mockResolvedValue({ granted: true });
    const { requestTrackingConsent, canPersonalizeAds } = loadWithPlatform('ios');

    expect(canPersonalizeAds()).toBe(false);
    await expect(requestTrackingConsent()).resolves.toBe(true);
    expect(canPersonalizeAds()).toBe(true);
  });

  it('stays non-personalized on iOS when the user declines', async () => {
    mockRequest.mockResolvedValue({ granted: false });
    const { requestTrackingConsent, canPersonalizeAds } = loadWithPlatform('ios');

    await requestTrackingConsent();
    expect(canPersonalizeAds()).toBe(false);
  });

  it('stays non-personalized on iOS when the prompt fails', async () => {
    mockRequest.mockRejectedValue(new Error('unavailable'));
    const { requestTrackingConsent, canPersonalizeAds } = loadWithPlatform('ios');

    await expect(requestTrackingConsent()).resolves.toBe(false);
    expect(canPersonalizeAds()).toBe(false);
  });
});
