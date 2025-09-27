import {LanguageModel} from "chrome"

async function initialPrompts({resume, jd}:{resume:string, jd: string }){
    
    const session = await LanguageModel.create(
        {
            intialPrompts : [
                { role: "system", content:"xxxxx"},
                { role: "user",  content: "following is resume" + resume},
                { role: "user", content: jd}
            ]
        }
        )

    return session
    }
 
async function chat({message: string}){
    if(!session){
        const session = initialPrompts(requestFormReset, jd)
    }
    const response = await session.prompt(message)
}