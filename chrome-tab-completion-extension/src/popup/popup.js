document.addEventListener('DOMContentLoaded', () => {
    const inputField = document.getElementById('context-input');
    const submitButton = document.getElementById('submit-button');

    submitButton.addEventListener('click', () => {
        const context = inputField.value;
        chrome.runtime.sendMessage({ type: 'SAVE_CONTEXT', context }, (response) => {
            if (response.success) {
                alert('Context saved successfully!');
                inputField.value = '';
            } else {
                alert('Failed to save context.');
            }
        });
    });
});