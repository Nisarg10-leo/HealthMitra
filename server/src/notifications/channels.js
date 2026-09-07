// Delivery channels behind one tiny interface: { name, deliver(notification, user) }.
// The notification service records every message in the in-app log and then
// fans out to each registered channel. Adding FCM push or SMS means adding a
// channel here; no service or route changes.
export const consoleChannel = {
  name: 'in-app (push adapter placeholder)',
  deliver(notification, recipient) {
    console.log(`[notification:${notification.type}] ${recipient?.name || notification.userId}: ${notification.title}`);
  }
};

export const channels = [consoleChannel];
