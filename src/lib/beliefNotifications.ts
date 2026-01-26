/**
 * Notification utilities for Belief Markets.
 * Sends notifications to users about market activity.
 */
import { sendMiniAppNotification } from './notifs';
import { sendNeynarMiniAppNotification } from './neynar';

// Use Neynar if configured, otherwise use direct notification
const neynarEnabled = process.env.NEYNAR_API_KEY && process.env.NEYNAR_CLIENT_ID;
const sendNotification = neynarEnabled ? sendNeynarMiniAppNotification : sendMiniAppNotification;

export type NotificationResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Handle notification result and convert to our result type.
 */
function handleNotificationResult(
  result: Awaited<ReturnType<typeof sendNotification>>
): NotificationResult {
  if (result.state === 'success') {
    return { success: true };
  } else if (result.state === 'no_token') {
    return { success: false, error: 'User has not enabled notifications' };
  } else if (result.state === 'rate_limit') {
    return { success: false, error: 'Rate limited' };
  } else {
    return { success: false, error: String(result.error) };
  }
}

/**
 * Notify the claim author that someone created a belief market on their cast.
 */
export async function notifyMarketCreated({
  authorFid,
  creatorUsername,
  amount,
}: {
  authorFid: number;
  creatorUsername?: string;
  amount: string;
}): Promise<NotificationResult> {
  try {
    const creatorText = creatorUsername ? `@${creatorUsername}` : 'Someone';
    const result = await sendNotification({
      fid: authorFid,
      title: 'New Belief Market',
      body: `${creatorText} put $${amount} behind your claim. See who else believes it.`,
    });

    return handleNotificationResult(result);
  } catch (error) {
    console.error('Error sending market created notification:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify the claim author that someone supported their claim.
 */
export async function notifySupport({
  authorFid,
  supporterUsername,
  amount,
}: {
  authorFid: number;
  supporterUsername?: string;
  amount: string;
}): Promise<NotificationResult> {
  try {
    const supporterText = supporterUsername ? `@${supporterUsername}` : 'Someone';
    const result = await sendNotification({
      fid: authorFid,
      title: 'New Support',
      body: `${supporterText} put $${amount} behind your claim!`,
    });

    return handleNotificationResult(result);
  } catch (error) {
    console.error('Error sending support notification:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify the claim author that someone challenged their claim.
 */
export async function notifyChallenge({
  authorFid,
  challengerUsername,
  amount,
}: {
  authorFid: number;
  challengerUsername?: string;
  amount: string;
}): Promise<NotificationResult> {
  try {
    const challengerText = challengerUsername ? `@${challengerUsername}` : 'Someone';
    const result = await sendNotification({
      fid: authorFid,
      title: 'New Challenge',
      body: `${challengerText} challenged your claim with $${amount}. The debate heats up!`,
    });

    return handleNotificationResult(result);
  } catch (error) {
    console.error('Error sending challenge notification:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify a user that their position has unlocked and is ready to withdraw.
 */
export async function notifyPositionUnlocked({
  userFid,
  amount,
}: {
  userFid: number;
  amount: string;
}): Promise<NotificationResult> {
  try {
    const result = await sendNotification({
      fid: userFid,
      title: 'Position Unlocked',
      body: `Your $${amount} position is now unlocked. You can withdraw anytime.`,
    });

    return handleNotificationResult(result);
  } catch (error) {
    console.error('Error sending position unlocked notification:', error);
    return { success: false, error: String(error) };
  }
}
