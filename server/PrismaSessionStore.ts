import { PrismaClient } from '@prisma/client';
import session from 'express-session';

const prisma = new PrismaClient();

export class PrismaSessionStore extends session.Store {
  constructor() {
    super();
  }

  async get(sid: string, callback: (err: any, session?: session.SessionData | null) => void) {
    try {
      const record = await prisma.session.findUnique({ where: { sid } });
      if (!record) return callback(null, null);
      // Deserialize session data from JSON
      callback(null, JSON.parse(record.data as unknown as string));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, sess: session.SessionData, callback?: (err?: any) => void) {
    try {
      const jsonData = JSON.stringify(sess);
      await prisma.session.upsert({
        where: { sid },
        update: { data: jsonData },
        create: { sid, data: jsonData },
      });
      callback && callback();
    } catch (err) {
      callback && callback(err);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await prisma.session.delete({ where: { sid } });
      callback && callback();
    } catch (err) {
      callback && callback(err);
    }
  }

  async all(callback: (err: any, sessions?: { [sid: string]: session.SessionData }) => void) {
    try {
      const records = await prisma.session.findMany();
      const sessions: { [sid: string]: session.SessionData } = {};
      records.forEach(r => {
        sessions[r.sid] = JSON.parse(r.data as unknown as string);
      });
      callback(null, sessions);
    } catch (err) {
      callback(err);
    }
  }
}
