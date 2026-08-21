import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';

@Global()
@Module({
  providers: [
    {
      provide: 'RAZORPAY_INSTANCE',
      useFactory: (configService: ConfigService) => {
        const keyId = configService.get<string>('RAZORPAY_KEY_ID');
        const keySecret = configService.get<string>('RAZORPAY_KEY_SECRET');

        if (!keyId || !keySecret) {
          // We provide a fallback or log a warning for local dev until keys are in .env
          console.warn('Razorpay keys missing in environment variables.');
          return null;
        }

        return new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['RAZORPAY_INSTANCE'],
})
export class RazorpayModule {}
