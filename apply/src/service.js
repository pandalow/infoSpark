
// Wrapper all the chrome storage handling function.
// Making it easier to read and write
function saveData(key, value){
    return new Promise((resolve, reject)=>{
        try{
            chrome.storage.local.set({[key]:value}, ()=>{
                if(chrome.runtime.lastError){
                    reject(chrome.runtime.lastError)
                }else{
                    resolve()
                }
            })
        }catch(err){
            reject(err)
        }
    })
}

function getData(key){
    return new Promise((resolve, reject) => {
        try{
            chrome.storage.local.get(key, (result)=>{
                if(chrome.runtime.lastError){
                    return reject(chrome.runtime.lastError);
                }
                return resolve(result[key])
            })
        }catch(err){
            reject(err)
        }
    })
}



export { saveData, getData };