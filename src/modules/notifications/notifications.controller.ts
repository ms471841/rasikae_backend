import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('broadcast')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async broadcastMessage(
    @Body('topic') topic: string,
    @Body('payload') payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    if (!topic || !payload || !payload.title || !payload.body) {
      throw new Error('Invalid payload configuration for broadcast.');
    }
    
    await this.notificationsService.sendToTopic(topic, payload);
    return { success: true, message: `Broadcast successfully initiated to topic: ${topic}` };
  }
}
