import UAParser from 'ua-parser-js';

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  deviceType: string;
  raw: string;
}

/**
 * Parse user-agent string to extract device information
 * @param userAgent - User-agent string from request headers
 * @returns Parsed device information
 */
export function parseDeviceInfo(userAgent: string): DeviceInfo {
  const parser = new (UAParser as any)(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || 'Unknown',
    device: result.device.model || 'Unknown',
    deviceType: result.device.type || 'desktop',
    raw: userAgent,
  };
}

/**
 * Format device info as a human-readable string
 * @param deviceInfo - Parsed device information
 * @returns Formatted string
 */
export function formatDeviceInfo(deviceInfo: DeviceInfo): string {
  const parts: string[] = [];

  if (deviceInfo.browser !== 'Unknown') {
    parts.push(`${deviceInfo.browser} ${deviceInfo.browserVersion}`);
  }

  if (deviceInfo.os !== 'Unknown') {
    parts.push(`on ${deviceInfo.os} ${deviceInfo.osVersion}`);
  }

  if (deviceInfo.device !== 'Unknown') {
    parts.push(`(${deviceInfo.device})`);
  } else if (deviceInfo.deviceType !== 'desktop') {
    parts.push(`(${deviceInfo.deviceType})`);
  }

  return parts.join(' ') || 'Unknown Device';
}
