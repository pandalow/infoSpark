import { useEffect, useState, useRef } from 'react';
import { saveData, getData } from '../service';

function User() {
    const [resume, setResume] = useState("");
    const [isHide, setIsHide] = useState(true);
    const isFirstSave = useRef(true); // For skipping the initializing

    useEffect(() => {
        const doSave = async () => {
            try {
                if(isFirstSave.current){
                    return;
                }
                await saveData('resume', resume);
            } catch (e) {
                console.error('saveData error', e);
            }
        };
        doSave();
    }, [resume])
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getData('resume');
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
                    <input type='text' value={resume} onChange={handleChange} />
                </div>)
            }
        </>
    )
}
export default User;