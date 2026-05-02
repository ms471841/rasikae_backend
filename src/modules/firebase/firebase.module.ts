import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export const FIREBASE_APP = 'FIREBASE_APP';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FIREBASE_APP,
      useFactory: (configService: ConfigService) => {
        const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
        let privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY');

        // Handle private key newlines correctly if passed from env
        if (privateKey) {
          privateKey = privateKey.trim();
          // Remove potential surrounding quotes from env variables
          if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
          }
          if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
          }
          privateKey = privateKey.replace(/\\n/g, '\n');
        }

        if (!projectId || !clientEmail || !privateKey) {
          console.warn(
            'Firebase Admin credentials not fully provided in env. Falling back to default app if running in GCP.',
          );
          if (admin.apps.length > 0) return admin.app();
          return admin.initializeApp();
        }

        if (admin.apps.length > 0) return admin.app();

        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [FIREBASE_APP],
})
export class FirebaseModule {}
