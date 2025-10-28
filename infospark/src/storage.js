// Wrapper all the chrome storage handling function.
// Persistant layer
class StorageManager {
    constructor() {
        this.defaultSettings = {
            context: '',
            isEnabled: true,
            enableGhostText: true,
            completionSettings: {
                //pass
            },
            chatHistory: [],
        }
    }
    /**
     * 
     * @param {*} key 
     * @returns 
     */
    async get(key) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.get(key, (result) => {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    if (typeof key === 'undefined' || key === null) {
                        return resolve({ ...this.defaultSettings, ...result })
                    }
                    if (Array.isArray(key)) {
                        const merged = {};
                        key.forEach(k => {
                            merged[k] = result.hasOwnProperty(k) ? result[k] : this.defaultSettings[k];
                        })
                        return resolve(merged)
                    }
                    if (typeof key === 'string') {
                        return resolve(result.hasOwnProperty(key) ? result[key] : this.defaultSettings[key])
                    }
                    return resolve(result)
                })
            } catch (err) {
                reject(err)
            }
        })
    }
    /**
     * 
     * @param {*} key 
     * @param {*} value 
     * @returns 
     */
    async set(key, value) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.set({ [key]: value }, () => {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError)
                    }
                    resolve()
                })
            } catch (err) {
                reject(err)
            }
        })
    }
    /**
     * 
     * @param {*} key 
     * @returns 
     */
    async remove(key) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.remove(key, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError)
                    } else {
                        resolve()
                    }
                })
            } catch (err) {
                reject(err)
            }
        })
    }

    async clear() {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.clear(() => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve()
                    }

                });
            } catch (err) {
                reject(err)
            }
        })
    }
}



class MessageManager {

    constructor() {
        this.listener = new Map();
        this.requestId = 0;
    }

    // Adding sending logical
    async sendToBackGround(type, data = null) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        type,
                        data,
                        requestId: ++this.requestId,
                        timestamp: Date.now(),
                    },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            return reject(new Error(chrome.runtime.lastError.message));
                        }
                        resolve(response);
                    }
                );
            });

            if (response && response.error) {
                throw new Error(response.error);
            }

            return response;
        } catch (err) {
            console.error(`Message error (${type}):`, err);
            throw err;
        }
    }
    addListener(type, handler) {
        // Creating new type list storing handler
        if (!this.listener.has(type)) {
            this.listener.set(type, []);
        }
        this.listener.get(type).push(handler)
    }
    removeListener(type, handler) {
        if (this.listener.has(type)) {
            const handlers = this.listener.get(type);
            const index = handlers.indexOf(handler);

            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    // Receiving message 
    handleMessage(message, sender, sendResponse) {
        const { type, data } = message;
        if (this.listener.has(type)) {
            const handlers = this.listener.get(type);
            handlers.forEach(handler => {
                try {
                    const result = handler(data, sender);
                    if (result instanceof Promise) {
                        result.then(response => sendResponse({ success: true, data: response }))
                            .catch(error => sendResponse({ success: false, error: error.message }));
                        return true
                    } else if (result !== undefined) {
                        sendResponse({ success: true, data: result });
                    }
                } catch (error) {
                    sendResponse({ success: false, error: error.message })
                }
            })
        } else {
            sendResponse({ success: false, error: "Unknown message type" })
        }
    }
}

const storageManager = new StorageManager();
const messageManager = new MessageManager();

export { storageManager, messageManager }
