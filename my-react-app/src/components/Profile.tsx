import { useEffect, useState } from "react";

const Profile = () => {
    const [resume, setResume] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState<string>('');
    const [processing, setProcessing] = useState<boolean>(false);

    useEffect(() => {
        chrome.storage.local.get("resumeText", (data: { [key: string]: string }) => {
            if (data.resumeText) {
                setResumeText(data.resumeText)
            }
        })
    }, [])

    function handleUploadResume() {
        // Logic to handle resume upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt';
        input.onchange = async event => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                setProcessing(true);
                const text = await extractTextFromFile(file);
                setResumeText(text);
                setResume(file);

                chrome.storage.local.set({ resumeText: text });
                setProcessing(false);
            }
        }
        input.click();
    }
    
    const extractTextFromFile = async (file: File): Promise<string> => {
        const fileType = file.type;
        if (fileType === 'application/pdf') {
            return await extractTextFromPdf(file);
        } else if (fileType == 'text/plain') {
            return await extractTextFromTxt(file)
        } else {
            throw new Error("Unsupported file type, Please use PDF or TXT files.")
        }


    }
    const extractTextFromPdf = async (file: File): Promise<string> => {
        const pdfParse = await import('pdf-parse')
        // Use pdf-parse to extract text
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const data = await pdfParse.default(buffer);
        return data.text.trim();
    }

    const extractTextFromTxt = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const text = reader.result as string;
                resolve(text);
            };
            reader.onerror = () => {
                reject(reader.error);
            };
            reader.readAsText(file)
        })
    }


    return (<>
        <div>
            <img src="profile-pic-url" alt="Profile" />
            <h2>User Name</h2>

            {processing ? <span>Processing...</span> :
                resume ? <span>Resume uploaded</span> : <button onClick={handleUploadResume}> upload resume </button>}
            {/* Profile information goes here */}
        </div>
        <div>   {resumeText ? <span>{resumeText}</span> : <span>No resume uploaded</span>}</div>
    </>
    );
}

export default Profile;