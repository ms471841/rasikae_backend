import mongoose, { Schema } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// 1. Simple .env parser to ensure we load the database URI correctly
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if any
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        }
        // Handle escaped newlines
        value = value.replace(/\\n/g, '\n');
        process.env[key] = value;
      }
    }
    console.log('✅ Loaded environment variables from .env');
  } else {
    console.warn('⚠️ No .env file found. Relying on system environment variables.');
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in the environment or .env file!');
  process.exit(1);
}

// 2. Define standard Mongoose schemas matching the application definitions
const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    image: { type: String },
    description: { type: String },
    color: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CuisineSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    image: { type: String },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CategoryModel = mongoose.model('Category', CategorySchema);
const CuisineModel = mongoose.model('Cuisine', CuisineSchema);

// 3. Define dataset for Categories
const categoriesData = [
  {
    name: 'Pizza',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400',
    description: 'Cheesy, delicious pizzas with fresh toppings.',
    color: '#FFF4EB',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400',
    description: 'Juicy patties, fresh veggies, and toasted buns.',
    color: '#FFFAF0',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Biryani & Pulao',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400',
    description: 'Aromatically spiced long-grain rice dishes cooked to perfection.',
    color: '#FFF9E6',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Desserts',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=400',
    description: 'Sweet treats, cakes, ice creams, and traditional sweets.',
    color: '#FFF0F5',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Beverages',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400',
    description: 'Refreshing soft drinks, juices, mocktails, and milkshakes.',
    color: '#E6F7FF',
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'North Indian',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=400',
    description: 'Rich gravies, paneer, buttery naans, and robust spices.',
    color: '#FFF7E6',
    sortOrder: 6,
    isActive: true,
  },
  {
    name: 'South Indian',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400',
    description: 'Crispy dosas, fluffy idlis, vada, and authentic sambar.',
    color: '#F6FFED',
    sortOrder: 7,
    isActive: true,
  },
  {
    name: 'Chinese & Asian',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=400',
    description: 'Stir-fried noodles, dim sums, manchurian, and flavorful broths.',
    color: '#FFF1F0',
    sortOrder: 8,
    isActive: true,
  },
  {
    name: 'Rolls & Wraps',
    image: 'https://images.unsplash.com/photo-1626700051175-6518c4793f4f?auto=format&fit=crop&q=80&w=400',
    description: 'Convenient, delicious rolls and wraps loaded with fillings.',
    color: '#F9F0FF',
    sortOrder: 9,
    isActive: true,
  },
  {
    name: 'Healthy & Salads',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400',
    description: 'Nutritious salads, protein-packed bowls, and guilt-free meals.',
    color: '#F6FFED',
    sortOrder: 10,
    isActive: true,
  },
];

// 4. Define dataset for Cuisines
const cuisinesData = [
  {
    name: 'Indian',
    description: 'A celebration of diverse regional flavors, aromatic spices, and rich culinary heritage.',
    image: 'https://images.unsplash.com/photo-1585938338392-50a59970d8ee?auto=format&fit=crop&q=80&w=400',
    tags: ['Spicy', 'Curry', 'Traditional', 'North Indian', 'South Indian'],
    isActive: true,
  },
  {
    name: 'Italian',
    description: 'Simple, high-quality ingredients like olive oil, fresh tomatoes, cheese, and pasta.',
    image: 'https://images.unsplash.com/photo-1498579150354-97050a2bb596?auto=format&fit=crop&q=80&w=400',
    tags: ['Pasta', 'Pizza', 'Cheese', 'Mediterranean'],
    isActive: true,
  },
  {
    name: 'Chinese',
    description: 'Balanced flavors of sweet, sour, salty, bitter, and umami using fresh stir-fries and steaming.',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=400',
    tags: ['Noodles', 'Rice', 'Wok', 'Asian'],
    isActive: true,
  },
  {
    name: 'Mexican',
    description: 'Bold and vibrant flavors with ingredients like corn, beans, chili peppers, and fresh avocados.',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=400',
    tags: ['Tacos', 'Spicy', 'Guacamole', 'Vibrant'],
    isActive: true,
  },
  {
    name: 'Japanese',
    description: 'Artistry in food focusing on fresh seafood, rice, delicate seasoning, and elegant presentation.',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=400',
    tags: ['Sushi', 'Ramen', 'Healthy', 'Asian'],
    isActive: true,
  },
  {
    name: 'Continental',
    description: 'European culinary traditions featuring roasted meats, creamy sauces, and baked delicacies.',
    image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&q=80&w=400',
    tags: ['Steak', 'Baked', 'European', 'Continental'],
    isActive: true,
  },
  {
    name: 'Middle Eastern',
    description: 'Aromatic dishes with olive oil, chickpeas, lamb, and rich spices like sumac and za\'atar.',
    image: 'https://images.unsplash.com/photo-1547058881-aa0edd92aab3?auto=format&fit=crop&q=80&w=400',
    tags: ['Shawarma', 'Hummus', 'Kebab', 'Healthy'],
    isActive: true,
  },
];

async function seed() {
  try {
    console.log('Connecting to database...');
    // Connect with Mongoose
    await mongoose.connect(MONGODB_URI!);
    console.log('✨ Connected to MongoDB successfully.');

    // Seed Categories
    console.log('\n--- Seeding Categories ---');
    for (const category of categoriesData) {
      const result = await CategoryModel.findOneAndUpdate(
        { name: category.name },
        { $set: category },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`🍔 Category [${category.name}] seeded successfully.`);
    }

    // Seed Cuisines
    console.log('\n--- Seeding Cuisines ---');
    for (const cuisine of cuisinesData) {
      const result = await CuisineModel.findOneAndUpdate(
        { name: cuisine.name },
        { $set: cuisine },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`🌮 Cuisine [${cuisine.name}] seeded successfully.`);
    }

    console.log('\n🎉 Database seeding finished successfully!');
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

seed();
