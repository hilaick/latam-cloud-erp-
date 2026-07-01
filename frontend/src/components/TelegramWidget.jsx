import React, { useEffect, useRef } from 'react';

const TelegramWidget = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Load Telegram widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-discussion', 'HermesAIBot');
    script.setAttribute('data-width', '100%');
    script.setAttribute('data-height', '500');
    script.setAttribute('data-dark', '1');
    script.setAttribute('data-color', '0088CC');
    script.setAttribute('data-comments-channel-username', 'HermesAIBot');
    
    // Clear container and add script
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }

    return () => {
      // Cleanup
      if (containerRef.current && script.parentNode === containerRef.current) {
        containerRef.current.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="telegram-widget-container">
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
          🤖 Chat with Hermes AI (Telegram Bot)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          This is the <strong>official Telegram interface</strong> embedded directly in your ERP.
          You're chatting with the same Hermes AI bot that you talk to on Telegram.
        </p>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          ✅ Full Telegram features • ✅ Persistent chat history • ✅ Mobile notifications
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="telegram-chat-widget rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700"
        style={{ minHeight: '500px' }}
      >
        {/* Widget will be inserted here by Telegram script */}
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p>Loading Telegram chat...</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>
          💡 <strong>Tip:</strong> This is the same chat as your Telegram app. 
          Messages sync across all your devices.
        </p>
        <p className="mt-1">
          🔗 <strong>Direct link:</strong>{' '}
          <a 
            href="https://t.me/HermesAIBot" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline"
          >
            t.me/HermesAIBot
          </a>
        </p>
      </div>
    </div>
  );
};

export default TelegramWidget;