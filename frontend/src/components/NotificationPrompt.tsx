import React, { useEffect, useState } from 'react';

const NotificationPrompt: React.FC = () => {
  const [supported, setSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isSupported = 'Notification' in window;
    setSupported(isSupported);

    if (!isSupported) return;

    const current = Notification.permission;
    setPermission(current);

    const dismissed = localStorage.getItem('notif_prompt_dismissed') === '1';
    setVisible(current === 'default' && !dismissed);
  }, []);

  const request = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setVisible(false);
      localStorage.setItem('notif_prompt_dismissed', '1');
    } catch (e) {
      console.error('Notification permission request failed', e);
      setVisible(false);
    }
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('notif_prompt_dismissed', '1');
  };

  if (!supported || !visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[1000] max-w-sm w-full bg-white shadow-lg rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">Enable notifications</h4>
          <p className="text-sm text-gray-600 mt-1">
            Get alerts for new messages even when you're on another tab.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 justify-end">
        <button
          onClick={dismiss}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Not now
        </button>
        <button
          onClick={request}
          className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Allow
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
