import { useEffect, useState, useRef } from 'react';
import { chromeMessaging } from '../chromeMessaging';

function User() {
    const [context, setContext] = useState("");
    const [isHide, setIsHide] = useState(true);
    const isFirstSave = useRef(true);

    useEffect(() => {
        const doSave = async () => {
            try {
                if(isFirstSave.current){
                    return;
                }
                // 直接使用 Chrome Storage
                await chromeMessaging.setStorage('context', context);
            } catch (e) {
                console.error('saveData error', e);
            }
        };
        doSave();
    }, [context])

    useEffect(() => {
        const load = async () => {
            try {
                // 直接使用 Chrome Storage
                const data = await chromeMessaging.getStorage('context');
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

    function handleChange(event) {
        setContext(event.target.value)
    }
    
    function showInput() {
        setIsHide(!isHide)
    }
    
    console.log(context)
    
    return (
        <>
            <button onClick={showInput}>Manage</button>
            {!isHide &&
                (<div>
                    <input type='text' value={context} onChange={handleChange} />
                </div>)
            }
        </>
    )
}

export default User;