import { cn } from '../../lib/cn';
import { relativeTime, type ActivityEntry, type Comment } from '../../lib/tasks';
import { Avatar } from '../primitives/Avatar';
import './ActivityRow.css';

export interface ActivityRowProps {
  entry: ActivityEntry;
  className?: string;
}

/**
 * §7.19 — one line of history. The actor's name leads, the verb phrase follows,
 * the age sits at the trailing edge.
 */
export function ActivityRow({ entry, className }: ActivityRowProps) {
  return (
    <li className={cn('activity', className)}>
      <span className="activity__dot" aria-hidden="true" />
      <p className="activity__text body-sm">
        {entry.actor && <strong className="activity__actor">{entry.actor.name}</strong>}{' '}
        {entry.text}
      </p>
      <time className="activity__age micro" dateTime={entry.at}>{relativeTime(entry.at)}</time>
    </li>
  );
}

export interface CommentItemProps {
  comment: Comment;
  className?: string;
}

/** §7.19 — avatar, name and age on one line, the body beneath. */
export function CommentItem({ comment, className }: CommentItemProps) {
  return (
    <li className={cn('comment', className)}>
      <Avatar
        size={32}
        name={comment.author.name}
        initials={comment.author.initials}
        channel={comment.author.domain}
      />

      <div className="comment__body">
        <p className="comment__head">
          <strong className="comment__name">{comment.author.name}</strong>
          <time className="comment__age micro" dateTime={comment.at}>
            {relativeTime(comment.at)}
          </time>
        </p>
        <p className="body-sm read-width">{comment.body}</p>
      </div>
    </li>
  );
}
