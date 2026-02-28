// y

// Utility function to format a timestamp into a "time ago" string
export const formatTimeAgo = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000; // seconds in a year
  if (interval > 1) {
    return Math.floor(interval) + (Math.floor(interval) === 1 ? ' year ago' : ' years ago');
  }
  interval = seconds / 2592000; // seconds in a month
  if (interval > 1) {
    return Math.floor(interval) + (Math.floor(interval) === 1 ? ' month ago' : ' months ago');
  }
  interval = seconds / 86400; // seconds in a day
  if (interval > 1) {
    return Math.floor(interval) + 'd';
  }
  interval = seconds / 3600; // seconds in an hour
  if (interval > 1) {
    return Math.floor(interval) + 'h';
  }
  interval = seconds / 60; // seconds in a minute
  if (interval > 1) {
    return Math.floor(interval) + 'm';
  }
  return Math.floor(seconds) + 's';
};