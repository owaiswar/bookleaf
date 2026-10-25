import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI in .env');
    process.exit(1);
  }

  console.log('Attempting MongoDB connection with 8s timeout...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('CONNECTION_SUCCESS! Database:', mongoose.connection.name);
    console.log('Collections in database:');
    const cols = await mongoose.connection.db?.listCollections().toArray();
    console.log(cols?.map(c => c.name));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('CONNECTION_FAILED');
    console.error('Error Name:', err.name);
    console.error('Message:', err.message);
    if (err.reason && err.reason.servers) {
      console.error('Server errors:');
      for (const [server, info] of (err.reason.servers as Map<string, any>).entries()) {
        console.error(` - ${server}: ${(info as any).error?.message || (info as any).type}`);
      }
    }
    process.exit(1);
  }
}

test();
