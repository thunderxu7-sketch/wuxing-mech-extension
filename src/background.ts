const ALARM_NAME = 'wuxing-daily-reminder';
const NOTIFICATION_ID = 'wuxing-daily';

// Set up daily alarm on install/update
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(ALARM_NAME, {
        // First fire: next occurrence of 8:00 AM
        when: getNext8AM(),
        periodInMinutes: 24 * 60,
    });
});

// Handle alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        chrome.notifications.create(NOTIFICATION_ID, {
            type: 'basic',
            iconUrl: 'icon128.png',
            title: '五行校准',
            message: '今日灵符已更新，点击查看你的每日能量指引',
            priority: 1,
        });
    }
});

// Click notification → open popup
chrome.notifications.onClicked.addListener((id) => {
    if (id === NOTIFICATION_ID) {
        chrome.action.openPopup().catch(() => {
            // Fallback: openPopup requires Chrome 127+, open extension page instead
            chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        });
    }
});

function getNext8AM(): number {
    const now = new Date();
    const target = new Date(now);
    target.setHours(8, 0, 0, 0);
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }
    return target.getTime();
}
