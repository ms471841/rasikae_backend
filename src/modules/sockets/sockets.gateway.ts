import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { OrdersService } from '../orders/orders.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private lastUpdateMap = new Map<string, { time: number; lat: number; lng: number }>();

  constructor(
    private readonly driversService: DriversService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinOrderRoom')
  async handleJoinOrderRoom(
    @MessageBody() data: { orderId: string; uid?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const order = await this.ordersService.getOrderById(data.orderId);
      
      // Basic security: Check if order belongs to user or is assigned to driver
      // For now, if no uid, we allow (compatibility), but if uid is provided we check.
      if (data.uid) {
        const driver = await this.driversService.findByFirebaseUid(data.uid).catch(() => null);
        const orderUserId = (order as any).userId?._id?.toString() || (order as any).userId?.toString();
        const orderDriverId = (order as any).driverId?._id?.toString() || (order as any).driverId?.toString();
        
        const isOwner = order.userId && (order as any).userId.firebaseUid === data.uid;
        const isAssignedDriver = driver && orderDriverId === driver._id.toString();

        if (!isOwner && !isAssignedDriver) {
          console.warn(`Unauthorized join attempt for order ${data.orderId} by uid ${data.uid}`);
          return { event: 'error', data: 'Unauthorized' };
        }
      }

      client.join(`order_${data.orderId}`);
      console.log(`Client ${client.id} authorized for order_${data.orderId}`);
      return { event: 'joinedRoom', data: `Joined order_${data.orderId}` };
    } catch (error) {
      return { event: 'error', data: 'Order not found' };
    }
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

  @SubscribeMessage('joinAdminRoom')
  handleJoinAdminRoom(
    @MessageBody() data: { token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`admin`);
    console.log(`[Socket] Admin ${client.id} joined 'admin' room. Total in room:`, this.server.sockets.adapter.rooms.get('admin')?.size);
    return { event: 'joinedRoom', data: `Joined admin stream` };
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(
    @MessageBody() data: { userId?: string; firebaseUid?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.userId) {
      client.join(`user_${data.userId}`);
      console.log(`Client ${client.id} joined user room: user_${data.userId}`);
    }
    if (data?.firebaseUid) {
      client.join(`user_${data.firebaseUid}`);
      console.log(`Client ${client.id} joined user room: user_${data.firebaseUid}`);
    }
    return { event: 'joinedRoom', data: `Joined user room` };
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
        
        // 3. Broadcast to Admin OCC (Global Visibility)
        this.server.to(`admin`).emit('driverLocationUpdated', {
          driverId: driver._id.toString(),
          uid: firebaseUid,
          lat: data.lat,
          lng: data.lng,
          orderId: data.orderId,
          timestamp: new Date().toISOString(),
        });

        console.log(`Saved location for driver ${firebaseUid} to DB and broadcast to Admin`);
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

  emitOrderStatus(orderId: string, status: string, order?: any) {
    const payload = {
      orderId,
      status,
      order: order ? JSON.parse(JSON.stringify(order)) : null,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`order_${orderId}`).emit('orderStatusUpdated', payload);
    this.server.to(`admin`).emit('orderStatusUpdated', payload);
  }


  emitOrderStatusToVendor(vendorId: string, orderId: string, status: string) {
    this.server.to(`vendor_${vendorId}`).emit('orderStatusUpdated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  emitOrderStatusToDriver(driverUid: string, orderId: string, status: string) {
    this.server.to(`driver_${driverUid}`).emit('orderStatusUpdated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }


  emitNewOrder(vendorId: string, order: any) {
    // Ensure the order is serialized to a plain object with string IDs
    const serializedOrder = JSON.parse(JSON.stringify(order));
    
    const payload = {
      order: serializedOrder,
      timestamp: new Date().toISOString(),
    };

    // Emit to vendor
    this.server.to(`vendor_${vendorId}`).emit('newOrder', payload);
    
    // Emit to admin
    const adminRoom = this.server.sockets.adapter.rooms.get('admin');
    console.log(`[Socket] Broadcasting newAdminOrder for ${serializedOrder._id}. Admin room size: ${adminRoom?.size || 0}`);
    
    // Using this.server.to('admin') is correct, but let's be sure
    this.server.to('admin').emit('newAdminOrder', payload);
  }


  emitNewOrderToDriver(driverIdOrUid: string, order: any) {
    this.server.to(`driver_${driverIdOrUid}`).emit('newAssignment', {
      order,
      timestamp: new Date().toISOString(),
    });
  }

  emitCartUpdated(userId: string, cart: any, firebaseUid?: string) {
    const serializedCart = cart ? JSON.parse(JSON.stringify(cart)) : null;
    const payload = {
      cart: serializedCart,
      timestamp: new Date().toISOString(),
    };
    if (userId) {
      this.server.to(`user_${userId}`).emit('cartUpdated', payload);
    }
    if (firebaseUid && firebaseUid !== userId) {
      this.server.to(`user_${firebaseUid}`).emit('cartUpdated', payload);
    }
  }
}
