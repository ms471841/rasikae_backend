import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from '../src/modules/orders/schemas/order.schema';
import { Model } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const orderModel = app.get<Model<any>>(getModelToken(Order.name));
  
  const allOrders = await orderModel.find({}).exec();
  console.log(`Found ${allOrders.length} orders.`);
  
  for (const order of allOrders) {
    if (typeof order.userId === 'string' && order.userId.includes('{')) {
      console.log(`FOUND CORRUPT ORDER: ${order._id}`);
      console.log(`Corrupt userId: ${order.userId}`);
      
      // Try to fix it if it contains an ID
      const match = order.userId.match(/new ObjectId\('([a-f0-9]+)'\)/);
      if (match) {
        const correctId = match[1];
        console.log(`Fixing to: ${correctId}`);
        await orderModel.updateOne({ _id: order._id }, { $set: { userId: correctId } });
      }
    }
  }
  
  await app.close();
}

bootstrap();
