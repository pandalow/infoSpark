async function handleContext(type: string): Promise<any> {
    const response = await chrome.runtime.sendMessage({ type: type });
    return response;
}

export { handleContext };