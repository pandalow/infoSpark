import { useEffect, useState, useRef } from 'react';
import storage from '../storage';

function User() {
    const [context, setContext] = useState("");
    const [isHide, setIsHide] = useState(true);
    const isFirstSave = useRef(true); // For skipping the initializing
    //TODO: Checking the LanguageModel availablity


    useEffect(() => {
        const doSave = async () => {
            try {
                if(isFirstSave.current){
                    return;
                }
                await storage.set('context', resume);
            } catch (e) {
                console.error('saveData error', e);
            }
        };
        doSave();
    }, [resume])

    useEffect(() => {
        const load = async () => {
            try {
                const data = await storage.get('context');
                if (typeof data !== 'undefined' && data !== null) {
                    setResume(data);
                }
            } catch (e) {
                console.error('getData error', e);
            } finally {
                // Triggering the save function
                isFirstSave.current = false;
            }
        };
        load();
    }, [])

    function handleChange(event) {
        setResume(event.target.value)
    }
    function showInput() {
        setIsHide(!isHide)
    }
    console.log(resume)
    return (
        <>
            <button onClick={showInput}>Manage Resume</button>
            {!isHide &&
                (<div>
                    <input type='text' value={context} onChange={handleChange} />
                </div>)
            }
        </>
    )
}
export default User;