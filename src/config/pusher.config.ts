import Pusher from 'pusher';

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '1403689',
  key: process.env.PUSHER_KEY || '67678fab751961ef6d68',
  secret: process.env.PUSHER_SECRET || 'dd87d1976ef3266e7cd2',
  cluster: process.env.PUSHER_CLUSTER || 'ap1',
  useTLS: true,
});