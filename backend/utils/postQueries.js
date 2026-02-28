// y
// Reusable SQL for Post Details
// This avoids repeating the same complex JOINs and subqueries in multiple routes.
const getPostQueryFields = (userId) => `
  p.id, p.title, p.content, p.user_id, p.community_id, p.image_url, p.created_at,
  u.username,
  c.name as community_name,
  COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
  COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
  (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
  (SELECT COUNT(*) FROM post_views WHERE post_id = p.id) AS views,
  ${userId ?
   ` (SELECT vote_type FROM votes WHERE user_id = ${userId} AND post_id = p.id) AS user_vote_type,` : 'NULL AS user_vote_type,'}
  ${userId ?
 `(SELECT COUNT(*) FROM saved_posts WHERE user_id = ${userId} AND post_id = p.id) > 0 AS is_saved` : '0 AS is_saved'}
`;

module.exports = { getPostQueryFields };