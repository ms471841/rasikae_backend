const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

async function fix() {
  dotenv.config({ path: path.join(__dirname, '../.env') });
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rasikae';
  console.log(`Connecting to: ${uri}`);
  
  await mongoose.connect(uri);
  const db = mongoose.connection;
  
  const orders = await db.collection('orders').find({}).toArray();
  console.log(`Found ${orders.length} orders in total.`);
  
  let fixedCount = 0;
  for (const order of orders) {
    let updates = {};
    
    if (typeof order.userId === 'string' && order.userId.includes('{')) {
      console.log(`FOUND CORRUPT userId IN ORDER: ${order._id}`);
      const match = order.userId.match(/new ObjectId\('([a-f0-9]+)'\)/);
      if (match) {
        const correctId = match[1];
        console.log(`Fixing userId to: ${correctId}`);
        updates.userId = new mongoose.Types.ObjectId(correctId);
      }
    }
    
    if (typeof order.driverId === 'string' && order.driverId.includes('{')) {
      console.log(`FOUND CORRUPT driverId IN ORDER: ${order._id}`);
      const match = order.driverId.match(/new ObjectId\('([a-f0-9]+)'\)/);
      if (match) {
        const correctId = match[1];
        console.log(`Fixing driverId to: ${correctId}`);
        updates.driverId = new mongoose.Types.ObjectId(correctId);
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await db.collection('orders').updateOne({ _id: order._id }, { $set: updates });
      fixedCount++;
    }
  }
  
  console.log(`Done. Fixed ${fixedCount} orders.`);
  await mongoose.disconnect();
}

fix().catch(console.error);
