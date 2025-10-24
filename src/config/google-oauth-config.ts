/**
 * Google OAuth Configuration
 * This file contains the configuration for Google Sign-In
 */

export const GOOGLE_OAUTH_CONFIG = {
  // Google OAuth Client ID
  clientId: '947044333217-u64nbc6pjmip562b4njg049mtddqaean.apps.googleusercontent.com',
  
  // Development settings
  development: {
    // Add these URLs to your Google OAuth Client's authorized origins
    authorizedOrigins: [
      'http://localhost:8080',
      'http://localhost:8084',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8084',
      'http://127.0.0.1:3000'
    ],
    
    // Add these URLs to your Google OAuth Client's authorized redirect URIs
    authorizedRedirectUris: [
      'http://localhost:8080/login',
      'http://localhost:8084/login',
      'http://localhost:3000/login',
      'http://127.0.0.1:8080/login',
      'http://127.0.0.1:8084/login',
      'http://127.0.0.1:3000/login'
    ]
  },
  
  // Production settings
  production: {
    authorizedOrigins: [
      'https://bugs.bugricer.com',
      'https://www.bugs.bugricer.com'
    ],
    authorizedRedirectUris: [
      'https://bugs.bugricer.com/login',
      'https://www.bugs.bugricer.com/login'
    ]
  }
};

/**
 * Instructions for setting up Google OAuth:
 * 
 * 1. Go to Google Cloud Console: https://console.cloud.google.com/
 * 2. Navigate to APIs & Services → Credentials
 * 3. Find your OAuth 2.0 Client ID: 947044333217-u64nbc6pjmip562b4njg049mtddqaean.apps.googleusercontent.com
 * 4. Click on it to edit
 * 5. In "Authorized JavaScript origins", add:
 *    - http://localhost:8080
 *    - http://localhost:3000
 *    - http://127.0.0.1:8080
 * 6. In "Authorized redirect URIs", add:
 *    - http://localhost:8080/login
 *    - http://localhost:3000/login
 * 7. Save the changes
 * 8. Wait a few minutes for the changes to propagate
 * 9. Test the Google Sign-In button
 */
