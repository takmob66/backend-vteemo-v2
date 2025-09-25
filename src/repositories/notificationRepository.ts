import { getDB } from '../config/database.js';

const db = getDB();
const TABLE = 'notifications';

export interface NotificationRecord {
  id: number;
  uuid: string;
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_id?: number;
  related_type?: string;
  action_url?: string;
  is_read: boolean;
  created_at: Date;
}

export async function createNotification(data: {
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_id?: number;
  related_type?: string;
  action_url?: string;
}) {
  const [id] = await db(TABLE).insert({
    user_id: data.user_id,
    type: data.type,
    title: data.title,
    message: data.message,
    related_id: data.related_id || null,
    related_type: data.related_type || null,
    action_url: data.action_url || null,
  });

  return db<NotificationRecord>(TABLE).where({ id }).first();
}

export async function getUserNotifications(userId: number, limit = 20, offset = 0) {
  return db<NotificationRecord>(TABLE)
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function getUnreadNotificationsCount(userId: number) {
  const result = await db(TABLE)
    .where({ user_id: userId, is_read: false })
    .count('id as count')
    .first();
  
  return Number(result?.count || 0);
}

export async function markNotificationAsRead(notificationId: number, userId: number) {
  const updated = await db(TABLE)
    .where({ id: notificationId, user_id: userId })
    .update({ is_read: true });
  
  return updated > 0;
}

export async function markAllNotificationsAsRead(userId: number) {
  await db(TABLE)
    .where({ user_id: userId, is_read: false })
    .update({ is_read: true });
  
  return { marked: true };
}

export async function deleteNotification(notificationId: number, userId: number) {
  const deleted = await db(TABLE)
    .where({ id: notificationId, user_id: userId })
    .del();
  
  return deleted > 0;
}

// Notification helper functions
export async function notifyVideoUpload(channelId: number, videoId: number, videoTitle: string) {
  // Get all subscribers of this channel
  const subscribers = await db('channel_subscriptions as cs')
    .select('cs.user_id')
    .leftJoin('users as u', 'cs.user_id', 'u.id')
    .where('cs.channel_id', channelId)
    .where('cs.notifications_enabled', true)
    .where('u.email_notifications', true);

  const channel = await db('channels').where({ id: channelId }).first();
  
  for (const subscriber of subscribers) {
    await createNotification({
      user_id: subscriber.user_id,
      type: 'video_uploaded',
      title: 'New Video',
      message: `${channel.name} uploaded: ${videoTitle}`,
      related_id: videoId,
      related_type: 'video',
      action_url: `/watch/${videoId}`,
    });
  }
}

export async function notifyCommentReply(parentCommentId: number, replyId: number, replierName: string) {
  const parentComment = await db('comments as c')
    .select('c.user_id', 'v.title', 'v.uuid')
    .leftJoin('videos as v', 'c.video_id', 'v.id')
    .where('c.id', parentCommentId)
    .first();

  if (parentComment) {
    await createNotification({
      user_id: parentComment.user_id,
      type: 'comment_reply',
      title: 'New Reply',
      message: `${replierName} replied to your comment on "${parentComment.title}"`,
      related_id: replyId,
      related_type: 'comment',
      action_url: `/watch/${parentComment.uuid}`,
    });
  }
}

export async function notifyVideoLike(videoId: number, likerName: string) {
  const video = await db('videos as v')
    .select('v.title', 'v.uuid', 'c.user_id')
    .leftJoin('channels as c', 'v.channel_id', 'c.id')
    .where('v.id', videoId)
    .first();

  if (video) {
    await createNotification({
      user_id: video.user_id,
      type: 'video_liked',
      title: 'Video Liked',
      message: `${likerName} liked your video "${video.title}"`,
      related_id: videoId,
      related_type: 'video',
      action_url: `/watch/${video.uuid}`,
    });
  }
}

export async function notifyNewSubscriber(channelId: number, subscriberName: string) {
  const channel = await db('channels').where({ id: channelId }).first();

  if (channel) {
    await createNotification({
      user_id: channel.user_id,
      type: 'new_subscriber',
      title: 'New Subscriber',
      message: `${subscriberName} subscribed to your channel`,
      related_id: channelId,
      related_type: 'channel',
      action_url: `/channel/${channel.handle}`,
    });
  }
}