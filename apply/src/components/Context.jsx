import { useEffect, useState, useRef } from 'react';
import { chromeMessaging } from '../chromeMessaging';

function Context() {
    const [context, setContext] = useState("");
    const [isHide, setIsHide] = useState(true);
    const isFirstSave = useRef(true);
    const [aiStatus, setAiStatus] = useState({
        prompt: "processing",
        writer: "processing",
        rewriter: "processing"
    })
    const [enablePrompt, setEnablePrompt] = useState(false)

    async function manageCompletion(type) {
        try {
            chrome.runtime.sendMessage({ type: type }, (response) => {
                if (response && response.success) {
                    getAiStatus()
                } else {
                    console.error('Error managing completion:', response.error);
                }
            });
        } catch (error) {
            console.error('Error managing completion:', error);
        }
    }

    function handleEnableClick() {
        setEnablePrompt(!enablePrompt)
        if (!enablePrompt) {
            manageCompletion('CREATE_COMPLETION_SESSION')
        } else {
            manageCompletion('RESET_SESSION')
        }
    }
    useEffect(() => {
        const doSave = async () => {
            try {
                if (isFirstSave.current) {
                    return;
                }
                await chromeMessaging.setStorage('prompt_content', context);
            } catch (e) {
                console.error('saveData error', e);
            }
        };
        doSave();
    }, [context])

    useEffect(() => {
        const load = async () => {
            try {
                const data = await chromeMessaging.getStorage('prompt_content');
                if (typeof data !== 'undefined' && data !== null) {
                    setContext(data);
                }
            } catch (e) {
                console.error('getData error', e);
            } finally {
                isFirstSave.current = false;
            }
        };
        load();
    }, [])

    async function getAiStatus() {
        chrome.runtime.sendMessage({ type: 'CHECK_STATUS' }, (response) => {
            if (response && response.success) {
                setAiStatus(response.data)
            } else {
                console.error('Error:', response.error);
            }
        });
    }
    function handleChange(event) {
        setContext(event.target.value)
    }

    function showInput() {
        setIsHide(!isHide)
    }


    return (
        <>
            <div>
                <p>ai Status</p>
                <p>prompt {aiStatus.prompt}</p>
                <p>writer {aiStatus.writer}</p>
            </div>
            <div>
                <button onClick={handleEnableClick}>{enablePrompt ? 'Disabled Copilot' : 'Enabled Copilot'}</button>
            </div>
            <button onClick={showInput}>Manage</button>
            {!isHide &&
                (<div>
                    <input type='text' value={context} onChange={handleChange} />
                </div>)
            }
        </>
    )
}

export default Context;