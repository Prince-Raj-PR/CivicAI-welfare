# SMTP Email Configuration Guide

This guide explains how to configure SMTP for email verification in CivicAI.

## Gmail Setup (Recommended for Development)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Factor Authentication if not already enabled

### Step 2: Generate App Password
1. In Google Account Security settings
2. Go to "App passwords"
3. Select "Mail" and "Other (custom name)"
4. Enter "CivicAI" as the app name
5. Copy the generated 16-character password

### Step 3: Update Environment Variables
Update your `backend/.env` file:

```env
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-16-character-app-password
FROM_EMAIL=noreply@civicai.com
FROM_NAME=CivicAI Team
```

## Alternative SMTP Providers

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-access-key
SMTP_PASS=your-ses-secret-key
```

## Testing SMTP Configuration

### Test Endpoint
```bash
curl http://localhost:8000/api/v1/test/email
```

### Expected Success Response
```json
{
  "success": true,
  "message": "SMTP configuration is working correctly",
  "details": {
    "success": true,
    "message": "SMTP configuration is valid"
  }
}
```

### Expected Error Response
```json
{
  "success": false,
  "error": "SMTP configuration failed",
  "details": {
    "success": false,
    "error": "Invalid login: 535-5.7.8 Username and Password not accepted..."
  }
}
```

## Email Templates

The system includes three email templates:

1. **Verification Email** - Sent after registration
2. **Password Reset Email** - Sent when user requests password reset
3. **Welcome Email** - Sent after email verification

## Security Notes

- Never commit real SMTP credentials to version control
- Use environment variables for all sensitive configuration
- Consider using dedicated email service providers for production
- Implement rate limiting for email sending
- Monitor email delivery rates and bounce rates

## Troubleshooting

### Common Issues

1. **"Username and Password not accepted"**
   - Ensure 2FA is enabled on Gmail
   - Use App Password, not regular password
   - Check username format (full email address)

2. **"Connection timeout"**
   - Check SMTP host and port
   - Verify firewall settings
   - Try different SMTP provider

3. **"Self signed certificate"**
   - Set `SMTP_SECURE=false` for port 587
   - Set `SMTP_SECURE=true` for port 465

4. **Emails going to spam**
   - Configure SPF, DKIM, and DMARC records
   - Use reputable email service provider
   - Avoid spam trigger words in subject/content

## Production Recommendations

1. Use dedicated email service (SendGrid, Mailgun, AWS SES)
2. Set up proper DNS records (SPF, DKIM, DMARC)
3. Implement email delivery monitoring
4. Use email templates with proper branding
5. Add unsubscribe links where required
6. Implement bounce and complaint handling