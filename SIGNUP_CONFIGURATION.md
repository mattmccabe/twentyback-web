# Signup Form Configuration Guide

## CloudFlare Turnstile Setup

To enable the signup form to work properly, you need to configure CloudFlare Turnstile:

### 1. Get Your Turnstile Site Key

1. Log in to your [CloudFlare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Navigate to "Turnstile" in the left sidebar
4. Click "Add site" or select an existing site
5. Copy your **Site Key** (this is public and safe to include in client-side code)

### 2. Configure the Site Key

Open `js/signup.js` and replace the placeholder:

```javascript
// Line 4 in js/signup.js
const TURNSTILE_SITE_KEY = 'YOUR_SITE_KEY_HERE'; // Replace with your actual site key
```

With your actual site key:

```javascript
const TURNSTILE_SITE_KEY = '1x00000000000000000000AA'; // Example format
```

### 3. Configure Allowed Domains

In the CloudFlare Turnstile dashboard:
- Add your production domain (e.g., `twentyback.com`)
- Add any staging/testing domains
- For local testing, you can use `localhost`

### 4. Backend Configuration

The signup form sends data to: `https://api.twentyback.com/api/auth/signup`

Your backend API should:

1. **Receive the signup request** with this structure:
```typescript
{
  email: string;        // Required
  firstName: string;    // Required
  lastName?: string;    // Optional
  company?: string;     // Optional
  captcha: string;      // Required - Turnstile token
}
```

2. **Verify the Turnstile token** by making a POST request to CloudFlare:
```
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
```

With body:
```json
{
  "secret": "YOUR_SECRET_KEY",
  "response": "CAPTCHA_TOKEN_FROM_CLIENT"
}
```

3. **Return appropriate HTTP status codes**:
- `200`: Success
- `400`: Bad request (validation failed)
- `409`: Conflict (email already exists)
- `500+`: Server error

## Testing the Form

### Local Testing

1. Start a local web server:
```bash
python3 -m http.server 8080
```

2. Open http://localhost:8080/signup.html

3. For local testing without actual Turnstile:
   - The form will show a disabled submit button until Turnstile loads
   - You can temporarily modify the JavaScript for testing (not recommended for production)

### Testing Turnstile Integration

CloudFlare provides test site keys for development:
- **Always passes**: `1x00000000000000000000AA`
- **Always fails**: `2x00000000000000000000AB`
- **Requires interaction**: `3x00000000000000000000FF`

Use these for testing your integration before going live.

## Security Best Practices

1. **Never expose your Secret Key** - it should only be used server-side
2. **Always verify the Turnstile token** on your backend
3. **Implement rate limiting** on your signup endpoint
4. **Validate all inputs** on the backend, even though client-side validation exists
5. **Use HTTPS** in production

## Troubleshooting

### Submit button stays disabled
- Check browser console for errors
- Verify the Turnstile site key is correct
- Ensure your domain is allowed in Turnstile settings

### Form submission fails
- Check the API endpoint is accessible
- Verify CORS headers are properly configured on your API
- Check the browser network tab for error details

### Turnstile widget doesn't appear
- Verify the CloudFlare script is loading: `https://challenges.cloudflare.com/turnstile/v0/api.js`
- Check for browser console errors
- Ensure JavaScript is enabled

## Form Validation Rules

The form implements the following validation:

- **Email**: Must be a valid email format (contains @ and domain)
- **First Name**: Required, letters/spaces/hyphens only
- **Last Name**: Optional, letters/spaces/hyphens only if provided
- **Company**: Optional, no validation
- **Captcha**: Required, must be completed before submission

## Customization

### Changing Form Styles

All form styles are in `styles.css` under the "Signup Form Styles" section. Key classes:
- `.signup-box`: Main form container
- `.form-input`: Input field styling
- `.form-input.error`: Error state styling
- `.submit-button`: Submit button styling

### Changing Success/Error Messages

Modify the messages in `js/signup.js`:
- Line 250+: `handleApiResponse()` function
- Line 273+: `showMessage()` function

### Adding More Fields

1. Add HTML in `signup.html` following the existing pattern
2. Update the `signupData` object in `handleFormSubmit()` (line 187+)
3. Add validation in `validateField()` if needed (line 80+)
4. Update your backend API to accept the new field

## Support

For issues or questions:
- Check CloudFlare Turnstile documentation: https://developers.cloudflare.com/turnstile/
- Review browser console for error messages
- Verify API endpoint responses in the Network tab
