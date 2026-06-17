import React from 'react';
import { useSiteSettings, useSiteSetting } from '../hooks/use-site-settings';

/**
 * Example component showing how to use site settings
 *
 * USAGE EXAMPLES:
 *
 * 1. Get all settings:
 *    const { settings, loading } = useSiteSettings();
 *
 * 2. Get specific setting:
 *    const siteName = useSiteSetting('siteName', 'Default Name');
 *    const logo = useSiteSetting('logo', '/default-logo.png');
 *    const facebook = useSiteSetting('socialMedia.facebook', '');
 *
 * 3. Use i
Loading site settings...</div>;
  }

  return (
    <div>
      <h1>Site Settings Example</h1>

      {/* Using all settings object */}
<div>
  <h2>Site Information</h2>
  <p>Site Name: {settings.siteName}</p>
  <p>Description: {settings.siteDescription}</p>
  <p>Contact Email: {settings.contactEmail}</p>
  <p>Contact Phone: {settings.contactPhone}</p>
</div>

{/* Using specific settings */ }
<div>
  <h2>Logo</h2>
  <img src={logo} alt={siteName} style={{ maxWidth: '200px' }} />
</div>

{/* Social Media Links */ }
<div>
  <h2>Social Media</h2>
  {facebook && (
    <a href={facebook} target="_blank" rel="noopener noreferrer">
      Facebook
    </a>
  )}
  {settings.socialMedia.instagram && (
    <a href={settings.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
      Instagram
    </a>
  )}
  {settings.socialMedia.twitter && (
    <a href={settings.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
      Twitter
    </a>
  )}
</div>

{/* Footer */ }
<div>
  <h2>Footer</h2>
  <p>{settings.footerText}</p>
  <p>{settings.copyrightText}</p>
</div>

{/* Analytics */ }
<div>
  <h2>Analytics</h2>
  <p>GTM ID: {settings.gtmId || 'Not configured'}</p>
  <p>GA ID: {settings.gaId || 'Not configured'}</p>
</div>
    </div >
  );
}
