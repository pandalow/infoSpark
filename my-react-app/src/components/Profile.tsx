import { useEffect, useState } from "react";
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;


const Profile = () => {
    const [resume, setResume] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState<string>('');
    const [processing, setProcessing] = useState<boolean>(false);

    useEffect(()=>{
        chrome.storage.local.get("resumeText", (data:{[key:string]:string})=>{
            if(data.resumeText){
                setResumeText(data.resumeText)
            }
        })
    },[])

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
        if (fileType === 'application/pdf'){
            return await extractTextFromPdf(file);
        }else if (fileType == 'text/plain') {
            return await extractTextFromTxt(file)
        }else{
            throw new Error("Unsupported file type, Please use PDF or TXT files.")
        }


    }
    const extractTextFromPdf = async (file:File):Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let fullText = "";

        //Extract text from each page
        for(let pageNum = 1; pageNum <= pdf.numPages; pageNum++){
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            const pageText = textContent.items.map((item:any)=> item.str).join(' ')
            
            fullText += pageText + '\n'
        }

        return fullText.trim()
    }

    const extractTextFromTxt = async (file:File):Promise<string> => {
        return new Promise((resolve, reject)=> {
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

    
    return (
        <div>
            <img src="profile-pic-url" alt="Profile" />
            <h2>User Name</h2>

            {processing ? <span>Processing...</span> :
            resumeText ? <span>Resume uploaded</span> : <button onClick={handleUploadResume}> upload resume </button>}
            {/* Profile information goes here */}
        </div>
    );
}

export default Profile;