import { Injectable, Inject, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';
import { UsersService } from '../users/users.service';
import { FcmAction } from '../users/dto/update-fcm-token.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(FIREBASE_APP) private readonly firebaseApp: admin.app.App,
    private readonly usersService: UsersService,
  ) {}

  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    const tokens = await this.usersService.getTokens([userId]);
    if (tokens.length === 0) {
      this.logger.warn(`No FCM tokens found for user ${userId}`);
      return;
    }

    await this.sendToTokens(tokens, payload, userId);
  }

  async sendToMultipleUsers(
    userIds: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    const tokens = await this.usersService.getTokens(userIds);
    if (tokens.length === 0) {
      this.logger.warn(`No FCM tokens found for the specified users`);
      return;
    }

    await this.sendToTokens(tokens, payload);
  }

  async sendToTopic(
    topic: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    try {
      const response = await this.firebaseApp.messaging().send(message);
      this.logger.log(`Successfully sent message to topic ${topic}: ${response}`);
    } catch (error) {
      this.logger.error(`Error sending message to topic ${topic}:`, error);
    }
  }

  private async sendToTokens(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
    userId?: string,
  ): Promise<void> {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    try {
      const response = await this.firebaseApp.messaging().sendEachForMulticast(message);
      this.logger.log(`Successfully sent multicast message. Success count: ${response.successCount}`);

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            this.logger.error(`Token at index ${idx} failed: ${resp.error?.message} (${errorCode})`);
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0 && userId) {
          this.logger.log(`Cleaning up ${failedTokens.length} stale tokens for user ${userId}`);
          for (const token of failedTokens) {
            await this.usersService.updateFcmToken(userId, {
              token,
              action: FcmAction.REMOVE,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error sending multicast message:', error);
    }
  }
}
