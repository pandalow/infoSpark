import { messageManager, storage } from './storage.js';

global.chrome = {
    storage: {
        local: {
            data: {},
            get(key, callback) {
                if (typeof key === 'string') {
                    callback({ [key]: this.data[key] });
                } else if (Array.isArray(key)) {
                    const result = {};
                    key.forEach(k => {
                        result[k] = this.data[k];
                    });
                    callback(result);
                } else {
                    callback(this.data);
                }
            },
            set(items, callback) {
                Object.assign(this.data, items);
                if (callback) callback();
            },
            remove(key, callback) {
                if (Array.isArray(key)) {
                    key.forEach(k => delete this.data[k]);
                } else {
                    delete this.data[key];
                }
                if (callback) callback();
            },
            clear(callback) {
                this.data = {};
                if (callback) callback();
            }
        }
    },
    runtime: {
        lastError: null,
        sendMessage(message, callback) {
            console.log('Mock sendMessage called with:', message);
            if (typeof callback === 'function') {
                // 模拟返回一个成功的响应
                callback({ success: true, data: 'Mock response' });
            }
        }
    }
};

// 测试 StorageManager
async function testStorageManager() {

    // 测试 set 方法
    await storage.set('testKey', 'testValue');
    console.log('Set testKey to testValue');

    // 测试 get 方法
    const value = await storage.get('testKey');
    console.log('Get testKey:', value); // 应输出 'testValue'

    // 测试默认值
    const defaultValue = await storage.get('nonExistentKey');
    console.log('Get nonExistentKey (default):', defaultValue); // 应输出默认值

    // 测试 remove 方法
    await storage.remove('testKey');
    const removedValue = await storage.get('testKey');
    console.log('Get testKey after remove:', removedValue); // 应输出默认值

    // 测试 clear 方法
    await storage.set('anotherKey', 'anotherValue');
    await storage.clear();
    const clearedValue = await storage.get('anotherKey');
    console.log('Get anotherKey after clear:', clearedValue); // 应输出默认值
}

// 调用测试函数
testStorageManager();

// 测试 MessageManager
async function testMessageManager() {

    // 注册一个消息监听器
    messageManager.addListener('TEST_MESSAGE', (data, sender) => {
        console.log('Received TEST_MESSAGE:', data);
        return `Response to ${data}`;
    });

    // 模拟消息接收
    const mockMessage = { type: 'TEST_MESSAGE', data: 'Hello, MessageManager!' };
    const mockSender = { id: 'mockSenderId' };
    const mockSendResponse = (response) => {
        console.log('SendResponse called with:', response);
    };

    // 测试 handleMessage
    messageManager.handleMessage(mockMessage, mockSender, mockSendResponse);

    // 测试 sendToBackGround
    try {
        const response = await messageManager.sendToBackGround('TEST_MESSAGE', 'Hello, Background!');
        console.log('Response from background:', response);
    } catch (error) {
        console.error('Error sending message to background:', error);
    }
}

// 调用测试函数
testMessageManager();