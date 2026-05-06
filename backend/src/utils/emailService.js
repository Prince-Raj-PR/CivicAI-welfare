import nodemailer from 'nodemailer'
import crypto from 'crypto'

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Generate verification OTP (6 digits)
export const generateVerificationOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Generate password reset OTP (6 digits)
export const generateResetOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send verification email with OTP
export const sendVerificationEmail = async (email, firstName, otp) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Verify Your CivicAI Account - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .otp-box { background: white; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Email Verification</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Thank you for registering with CivicAI! To complete your registration, please use the verification code below:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Valid for 10 minutes</p>
              </div>

              <div class="warning">
                <p style="margin: 0;"><strong>⚠️ Security Tips:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Never share this code with anyone</li>
                  <li>CivicAI will never ask for your code via phone or email</li>
                  <li>This code expires in 10 minutes</li>
                </ul>
              </div>

              <p>If you didn't create an account with CivicAI, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} CivicAI. All rights reserved.</p>
              <p>Making welfare programs accessible through AI</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName},
        
        Thank you for registering with CivicAI!
        
        Your verification code is: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't create an account with CivicAI, please ignore this email.
        
        Best regards,
        CivicAI Team
      `
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Verification OTP email sent:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending verification email:', error)
    throw new Error('Failed to send verification email')
  }
}
// Send password reset email with OTP
export const sendPasswordResetEmail = async (email, firstName, otp) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Reset Your CivicAI Password - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .otp-box { background: white; border: 2px dashed #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #dc2626; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>We received a request to reset your CivicAI account password.</p>
              <p>Use the code below to reset your password:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your Reset Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Valid for 10 minutes</p>
              </div>

              <div class="warning">
                <p style="margin: 0;"><strong>⚠️ Important Security Information:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This code expires in 10 minutes</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you create a new one</li>
                  <li>Never share this code with anyone</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} CivicAI. All rights reserved.</p>
              <p>If you have any questions, contact our support team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName},
        
        We received a request to reset your CivicAI account password.
        
        Your reset code is: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this reset, please ignore this email.
        
        Best regards,
        CivicAI Team
      `
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Password reset OTP email sent:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}

// Send welcome email (after verification)
export const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to CivicAI - Your Account is Ready!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to CivicAI</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #059669; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to CivicAI!</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Congratulations! Your email has been verified and your CivicAI account is now active.</p>
              
              <h3>What you can do now:</h3>
              
              <div class="feature">
                <h4>🔍 Discover Programs</h4>
                <p>Browse through hundreds of welfare programs and find ones that match your situation.</p>
              </div>
              
              <div class="feature">
                <h4>🤖 AI Eligibility Check</h4>
                <p>Use our AI-powered system to check your eligibility for multiple programs instantly.</p>
              </div>
              
              <div class="feature">
                <h4>📊 Track Applications</h4>
                <p>Keep track of your applications and get updates on their status.</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/programs" class="button">Start Exploring Programs</a>
              </div>
              
              <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} CivicAI. All rights reserved.</p>
              <p>Making welfare programs accessible through AI</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName},
        
        Welcome to CivicAI! Your account is now active.
        
        You can now:
        - Discover welfare programs
        - Check eligibility with AI
        - Track your applications
        
        Get started: ${process.env.FRONTEND_URL}/programs
        
        Best regards,
        CivicAI Team
      `
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Welcome email sent:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    throw new Error('Failed to send welcome email')
  }
}

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    console.log('✅ SMTP configuration is valid')
    return { success: true, message: 'SMTP configuration is valid' }
  } catch (error) {
    console.error('❌ SMTP configuration error:', error)
    return { success: false, error: error.message }
  }
}