import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CuisinesService } from './cuisines.service';
import { CuisinesController } from './cuisines.controller';
import { Cuisine, CuisineSchema } from './schemas/cuisine.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cuisine.name, schema: CuisineSchema }]),
    UsersModule,
  ],
  controllers: [CuisinesController],
  providers: [CuisinesService],
})
export class CuisinesModule {}
