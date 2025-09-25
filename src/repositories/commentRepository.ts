import { getDB } from '../config/database.js';

const db = getDB();
const COMMENTS_TABLE = 'comments';
const COMMENT_LIKES_TABLE = 'comment_likes';

export interface CommentRecord {
  id: number;
  uuid: string;
  video_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  likes_count: number;
  dislikes_count: number;
  replies_count: number;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CommentWithDetails extends CommentRecord {
  user_first_name?: string;
  user_last_name?: string;
  user_avatar?: string;
  user_like?: 'like' | 'dislike' | null;
  replies?: CommentWithDetails[];
}

export async function createComment(data: {
  video_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
}) {
  const [id] = await db(COMMENTS_TABLE).insert({
    video_id: data.video_id,
    user_id: data.user_id,
    parent_id: data.parent_id || null,
    content: data.content,
  });

  // Update parent comment replies count if this is a reply
  if (data.parent_id) {
    await db(COMMENTS_TABLE)
      .where({ id: data.parent_id })
      .increment('replies_count', 1);
  }

  return db<CommentRecord>(COMMENTS_TABLE).where({ id }).first();
}

export async function getVideoComments(
  videoId: number, 
  userId?: number, 
  limit = 20, 
  offset = 0
) {
  let query = db<CommentWithDetails>(COMMENTS_TABLE + ' as c')
    .select([
      'c.*',
      'u.first_name as user_first_name',
      'u.last_name as user_last_name',
      'u.avatar_url as user_avatar',
    ])
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .where('c.video_id', videoId)
    .where('c.parent_id', null) // Only top-level comments
    .where('c.is_deleted', false)
    .orderBy('c.is_pinned', 'desc')
    .orderBy('c.created_at', 'desc');

  if (userId) {
    query = query.select([
      db.raw(`(
        SELECT type FROM comment_likes 
        WHERE comment_id = c.id AND user_id = ? 
        LIMIT 1
      ) as user_like`, [userId])
    ]);
  }

  return query.limit(limit).offset(offset);
}

export async function getCommentReplies(
  parentId: number, 
  userId?: number, 
  limit = 10, 
  offset = 0
) {
  let query = db<CommentWithDetails>(COMMENTS_TABLE + ' as c')
    .select([
      'c.*',
      'u.first_name as user_first_name',
      'u.last_name as user_last_name',
      'u.avatar_url as user_avatar',
    ])
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .where('c.parent_id', parentId)
    .where('c.is_deleted', false)
    .orderBy('c.created_at', 'asc');

  if (userId) {
    query = query.select([
      db.raw(`(
        SELECT type FROM comment_likes 
        WHERE comment_id = c.id AND user_id = ? 
        LIMIT 1
      ) as user_like`, [userId])
    ]);
  }

  return query.limit(limit).offset(offset);
}

export async function findCommentByUUID(uuid: string) {
  return db<CommentRecord>(COMMENTS_TABLE)
    .where({ uuid })
    .where({ is_deleted: false })
    .first();
}

export async function updateComment(id: number, content: string) {
  await db(COMMENTS_TABLE)
    .where({ id })
    .update({ 
      content,
      updated_at: db.fn.now()
    });
  
  return db<CommentRecord>(COMMENTS_TABLE).where({ id }).first();
}

export async function deleteComment(id: number, userId: number, isAdmin = false) {
  const comment = await db<CommentRecord>(COMMENTS_TABLE).where({ id }).first();
  if (!comment) return null;

  if (!isAdmin && comment.user_id !== userId) {
    const err: any = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  await db(COMMENTS_TABLE)
    .where({ id })
    .update({ is_deleted: true });

  // Update parent comment replies count if this was a reply
  if (comment.parent_id) {
    await db(COMMENTS_TABLE)
      .where({ id: comment.parent_id })
      .decrement('replies_count', 1);
  }

  return { deleted: true };
}

export async function toggleCommentLike(commentId: number, userId: number, type: 'like' | 'dislike') {
  // Check if user already liked/disliked this comment
  const existing = await db(COMMENT_LIKES_TABLE)
    .where({ comment_id: commentId, user_id: userId })
    .first();

  if (existing) {
    if (existing.type === type) {
      // Remove the like/dislike
      await db(COMMENT_LIKES_TABLE)
        .where({ comment_id: commentId, user_id: userId })
        .del();
      
      // Decrement count
      const field = type === 'like' ? 'likes_count' : 'dislikes_count';
      await db(COMMENTS_TABLE)
        .where({ id: commentId })
        .decrement(field, 1);
      
      return { action: 'removed', type };
    } else {
      // Change like to dislike or vice versa
      await db(COMMENT_LIKES_TABLE)
        .where({ comment_id: commentId, user_id: userId })
        .update({ type });
      
      // Update counts
      if (type === 'like') {
        await db(COMMENTS_TABLE)
          .where({ id: commentId })
          .increment('likes_count', 1)
          .decrement('dislikes_count', 1);
      } else {
        await db(COMMENTS_TABLE)
          .where({ id: commentId })
          .increment('dislikes_count', 1)
          .decrement('likes_count', 1);
      }
      
      return { action: 'changed', type };
    }
  } else {
    // Add new like/dislike
    await db(COMMENT_LIKES_TABLE).insert({
      comment_id: commentId,
      user_id: userId,
      type,
    });
    
    // Increment count
    const field = type === 'like' ? 'likes_count' : 'dislikes_count';
    await db(COMMENTS_TABLE)
      .where({ id: commentId })
      .increment(field, 1);
    
    return { action: 'added', type };
  }
}

export async function pinComment(commentId: number, videoId: number, channelId: number, userId: number) {
  // Check if user owns the video's channel
  const video = await db('videos as v')
    .select('v.id')
    .leftJoin('channels as c', 'v.channel_id', 'c.id')
    .where('v.id', videoId)
    .where('c.user_id', userId)
    .first();

  if (!video) {
    const err: any = new Error('You can only pin comments on your own videos');
    err.status = 403;
    throw err;
  }

  // Unpin other comments for this video first
  await db(COMMENTS_TABLE)
    .where({ video_id: videoId })
    .update({ is_pinned: false });

  // Pin this comment
  await db(COMMENTS_TABLE)
    .where({ id: commentId })
    .update({ is_pinned: true });

  return { pinned: true };
}

export async function getUserComments(userId: number, limit = 20, offset = 0) {
  return db<CommentWithDetails>(COMMENTS_TABLE + ' as c')
    .select([
      'c.*',
      'v.title as video_title',
      'v.uuid as video_uuid',
    ])
    .leftJoin('videos as v', 'c.video_id', 'v.id')
    .where('c.user_id', userId)
    .where('c.is_deleted', false)
    .orderBy('c.created_at', 'desc')
    .limit(limit)
    .offset(offset);
}