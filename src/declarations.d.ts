declare module 'firebase-admin' {
  namespace admin {
    namespace app {
      type App = any;
    }
    namespace auth {
      type UserRecord = any;
    }
    namespace messaging {
      type Message = any;
      type MulticastMessage = any;
    }
    const apps: any[];
    function app(): any;
    function initializeApp(options?: any): any;
    const credential: any;
    function auth(): any;
    function messaging(): any;
  }
  export = admin;
}

declare module '@aws-sdk/client-s3' {
  export const S3Client: any;
  export const PutObjectCommand: any;
  export const DeleteObjectCommand: any;
  export type S3Client = any;
  export type PutObjectCommand = any;
  export type DeleteObjectCommand = any;
}
