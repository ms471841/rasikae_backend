import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { OrdersService } from '../orders/orders.service';
import { forwardRef, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private lastUpdateMap = new Map<
    string,
    { time: number; lat: number; lng: number }
  >();

  constructor(
    private readonly driversService: DriversService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(FIREBASE_APP) private readonly firebaseApp: admin.app.App,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader =
        client.handshake.auth?.token || client.handshake.headers?.authorization;
      let token = '';
      if (authHeader) {
        token = authHeader.startsWith('Bearer ')
          ? authHeader.split('Bearer ')[1]
          : authHeader;
      }
      if (token) {
        const decoded = await this.firebaseApp.auth().verifyIdToken(token);
        let dbUser = null;
        try {
          dbUser = await this.usersService.getProfile(decoded.uid);
        } catch {
          dbUser = null;
        }
        client.data.user = dbUser || decoded;
        client.data.firebaseUid = decoded.uid;
      }
    } catch (e) {
      // Guest / unauthenticated socket connection
    }
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
      const user = client.data?.user;

      if (user && user.role !== 'admin') {
        const orderUserId =
          (order as any).userId?._id?.toString() ||
          (order as any).userId?.toString();
        const orderDriverId =
          (order as any).driverId?._id?.toString() ||
          (order as any).driverId?.toString();
        const orderVendorId = (order as any).restaurantId?.ownerId?.toString();

        let isDriver = false;
        if (user._id) {
          const driver = await this.driversService
            .findByUserId(user._id.toString())
            .catch(() => null);
          if (driver && driver._id.toString() === orderDriverId) {
            isDriver = true;
          }
        }

        const isCustomer =
          (user._id && user._id.toString() === orderUserId) ||
          user.firebaseUid === (order as any).userId?.firebaseUid;
        const isVendor = user._id && user._id.toString() === orderVendorId;

        if (!isCustomer && !isVendor && !isDriver) {
          return { event: 'error', data: 'Unauthorized to join order room' };
        }
      }

      client.join(`order_${data.orderId}`);
      return { event: 'joinedRoom', data: `Joined order_${data.orderId}` };
    } catch {
      return { event: 'error', data: 'Order not found' };
    }
  }

  @SubscribeMessage('joinVendorRoom')
  handleJoinVendorRoom(
    @MessageBody() data: { uid: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data?.user;
    const uid = data?.uid;
    if (!user || (user.role !== 'admin' && user.firebaseUid !== uid)) {
      return { event: 'error', data: 'Unauthorized to join vendor room' };
    }
    client.join(`vendor_${uid}`);
    return { event: 'joinedRoom', data: `Joined vendor_${uid}` };
  }

  @SubscribeMessage('joinDriverRoom')
  handleJoinDriverRoom(
    @MessageBody() data: { uid: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data?.user;
    const uid = data?.uid;
    if (!user || (user.role !== 'admin' && user.firebaseUid !== uid)) {
      return { event: 'error', data: 'Unauthorized to join driver room' };
    }
    client.join(`driver_${uid}`);
    client.data.firebaseUid = uid;
    return { event: 'joinedRoom', data: `Joined driver_${uid}` };
  }

  @SubscribeMessage('joinAdminRoom')
  handleJoinAdminRoom(
    @MessageBody() data: { token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data?.user;
    if (!user || user.role !== 'admin') {
      return { event: 'error', data: 'Unauthorized: Admin access required' };
    }
    client.join(`admin`);
    return { event: 'joinedRoom', data: `Joined admin stream` };
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(
    @MessageBody() data: { userId?: string; firebaseUid?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data?.user;
    if (!user) {
      return { event: 'error', data: 'Unauthorized' };
    }
    const isOwner =
      (data?.userId && user._id?.toString() === data.userId) ||
      (data?.firebaseUid && user.firebaseUid === data.firebaseUid);
    if (user.role !== 'admin' && !isOwner) {
      return { event: 'error', data: 'Unauthorized' };
    }
    if (data?.userId) client.join(`user_${data.userId}`);
    if (data?.firebaseUid) client.join(`user_${data.firebaseUid}`);
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
    const shouldSave =
      !lastUpdate ||
      now - lastUpdate.time > 30000 ||
      this.calculateDistance(
        lastUpdate.lat,
        lastUpdate.lng,
        data.lat,
        data.lng,
      ) > 100;

    if (shouldSave) {
      try {
        const driver = await this.driversService.findByFirebaseUid(firebaseUid);
        await this.driversService.updateLocation(driver._id.toString(), {
          coordinates: [data.lng, data.lat], // GeoJSON is [lng, lat]
        });

        // Update the throttling map
        this.lastUpdateMap.set(firebaseUid, {
          time: now,
          lat: data.lat,
          lng: data.lng,
        });

        // 3. Broadcast to Admin OCC (Global Visibility)
        this.server.to(`admin`).emit('driverLocationUpdated', {
          driverId: driver._id.toString(),
          uid: firebaseUid,
          lat: data.lat,
          lng: data.lng,
          orderId: data.orderId,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `Saved location for driver ${firebaseUid} to DB and broadcast to Admin`,
        );
      } catch (error) {
        console.error(
          `Failed to update driver location in DB: ${error.message}`,
        );
      }
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
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
    console.log(
      `[Socket] Broadcasting newAdminOrder for ${serializedOrder._id}. Admin room size: ${adminRoom?.size || 0}`,
    );

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
