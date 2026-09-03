import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.host', ''),
      port: this.configService.get('email.port', 587),
      secure: false,
      auth: {
        user: this.configService.get('email.user', ''),
        pass: this.configService.get('email.pass', ''),
      },
    });
  }

  async sendConfirmationEmail(email: string, name: string, token: string) {
    const confirmationUrl = `${this.configService.get('backend_url')}/api/auth/verify-email?token=${token}`;

    const html = `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for registering. Please click the link below to verify your email:</p>
      <a href="${confirmationUrl}">${confirmationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to: email,
      subject: 'Verify Your Email',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {

    const resetUrl = `${this.configService.get('web_url')}/reset-password?token=${token}`;

    const html = `
      <h1>Reset Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to: email,
      subject: 'Reset Password',
      html,
    });
  }


  async sendEventInviteEmail(email: string, token: string, eventName: string) {

    const acceptUrl = `${this.configService.get('backend_url')}/api/event/accept/${token}`

    const html = `
      <h1>Event Invitation</h1>
      <p>You have been invited to an event ${eventName}. Click the link below to join:</p>
      <a href="${acceptUrl}">Join</a>
      <p>This link will expire in 24 hours.</p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to: email,
      subject: 'Event Invitation',
      html,
    });
  }
}
