import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../../firebase/firebase.module';
import { UsersService } from '../../users/users.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_APP) private firebaseApp: admin.app.App,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token = '';
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if (request.query.token) {
      token = request.query.token;
    }

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    try {
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(token);
      
      // Fetch DB User
      try {
        const dbUser = await this.usersService.getProfile(decodedToken.uid);
        request.user = dbUser;
      } catch (err) {
        // If DB user doesn't exist yet, we still attach decoded token so `/users/sync` can work!
        request.user = decodedToken;
      }
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }
}
