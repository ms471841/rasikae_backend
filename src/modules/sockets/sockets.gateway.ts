import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const orderId = client.handshake.query.orderId;
    if (orderId) {
      client.join(`order_${orderId}`);
      console.log(`Client ${client.id} joined room: order_${orderId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinOrderRoom')
  handleJoinOrderRoom(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order_${data.orderId}`);
    return { event: 'joinedRoom', data: `Joined order_${data.orderId}` };
  }

  @SubscribeMessage('updateLocation')
  handleUpdateLocation(
    @MessageBody() data: { orderId: string; lat: number; lng: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast the updated location to everyone in the order room except the sender
    client.to(`order_${data.orderId}`).emit('locationUpdated', {
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to be called from other modules (like OrdersService)
  emitOrderStatus(orderId: string, status: string) {
    this.server.to(`order_${orderId}`).emit('orderStatusUpdated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
