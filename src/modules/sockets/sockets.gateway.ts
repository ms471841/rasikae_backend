import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private lastUpdateMap = new Map<string, { time: number; lat: number; lng: number }>();

  constructor(private readonly driversService: DriversService) {}

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

  @SubscribeMessage('joinVendorRoom')
  handleJoinVendorRoom(
    @MessageBody() data: { uid: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`vendor_${data.uid}`);
    console.log(`Client ${client.id} joined vendor room: vendor_${data.uid}`);
    return { event: 'joinedRoom', data: `Joined vendor_${data.uid}` };
  }

  @SubscribeMessage('joinDriverRoom')
  handleJoinDriverRoom(
    @MessageBody() data: { uid: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`driver_${data.uid}`);
    (client as any).firebaseUid = data.uid; // Store UID for session tracking
    console.log(`Client ${client.id} joined driver room: driver_${data.uid}`);
    return { event: 'joinedRoom', data: `Joined driver_${data.uid}` };
  }

  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @MessageBody() data: { orderId: string; lat: number; lng: number },
    @ConnectedSocket() client: Socket,
  ) {
    // 1. Broadcast real-time location to the order room (immediate feedback)
    client.to(`order_${data.orderId}`).emit('locationUpdated', {
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });

    // 2. Persistent Save with Throttling (Hybrid approach)
    const firebaseUid = (client as any).firebaseUid;
    if (!firebaseUid) return;

    const lastUpdate = this.lastUpdateMap.get(firebaseUid);
    const now = Date.now();
    
    // Save to DB if: No previous record, 30s passed, or moved > 100m
    const shouldSave = !lastUpdate || 
                       (now - lastUpdate.time) > 30000 || 
                       this.calculateDistance(lastUpdate.lat, lastUpdate.lng, data.lat, data.lng) > 100;

    if (shouldSave) {
      try {
        const driver = await this.driversService.findByFirebaseUid(firebaseUid);
        await this.driversService.updateLocation(driver._id.toString(), {
          coordinates: [data.lng, data.lat] // GeoJSON is [lng, lat]
        });
        
        // Update the throttling map
        this.lastUpdateMap.set(firebaseUid, { time: now, lat: data.lat, lng: data.lng });
        console.log(`Saved location for driver ${firebaseUid} to DB (Hybrid Sync)`);
      } catch (error) {
        console.error(`Failed to update driver location in DB: ${error.message}`);
      }
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  emitOrderStatus(orderId: string, status: string) {
    this.server.to(`order_${orderId}`).emit('orderStatusUpdated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  emitOrderStatusToVendor(vendorId: string, orderId: string, status: string) {
    this.server.to(`vendor_${vendorId}`).emit('orderStatusUpdated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  emitNewOrder(vendorId: string, order: any) {
    this.server.to(`vendor_${vendorId}`).emit('newOrder', {
      order,
      timestamp: new Date().toISOString(),
    });
  }

  emitNewOrderToDriver(driverIdOrUid: string, order: any) {
    this.server.to(`driver_${driverIdOrUid}`).emit('newAssignment', {
      order,
      timestamp: new Date().toISOString(),
    });
  }
}
