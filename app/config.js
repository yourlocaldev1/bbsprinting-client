import {PDF_ICON, DOC_ICON, XLS_ICON, PPT_ICON, IMAGE_ICON, DEFAULT_FILE_ICON, MULTIPLE_FILES_ICON} from '../public/svgs/icons'

const backendUrl = 'https://bbsprinting-server.onrender.com/'
const socketUrl = 'wss://bbsprinting-server.onrender.com/server'
const bbsPrintingEpoch = 1672516800000
const CAPTCHA_SITE_KEY = '1709a7fb-56c0-4958-9af6-c18ebca39767'
const GOOGLE_CLIENT_ID = "567690812822-k3ub2kd5mmcqcrp60jf1mlqd9bf85t86.apps.googleusercontent.com"
const GOOGLE_API_KEY = "AIzaSyDt2v7Ns0uy-VXCzsJrIY-V4YYeSNkmCkM"

const Regex = {
    ID: /^\d{17,19}$/,
    TOKEN: /^([a-zA-Z0-9-_]{23,28}):([a-zA-Z0-9-_]{10,14}):([a-zA-Z0-9-_]{43})$/
}

function LongtoBigInt({low, high, unsigned}) {
    low = BigInt.asUintN(32, BigInt(low))
    high = BigInt.asUintN(32, BigInt(high))
    const combined = (high << 32n) | low
    return unsigned ? BigInt.asUintN(64, combined) : BigInt.asIntN(64, combined)
}

const pad = (num, amount) => num.toString(2).padStart(amount, '0') 

function parseTimestamp(id) {
    if(!(Regex.ID.test(id))) throw new TypeError('Invalid Id provided.')
    
    let timestamp = `0b${pad(BigInt(id), 64)}`.slice(0, 42 + 2)
    return new Date(Number(timestamp) + bbsPrintingEpoch)
}

const Sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const stringifyMsg = (json) => {
    try {
        return JSON.stringify(json)
    } catch (error) {
        return false
    }
}

const parseMsg = (string) => {
    try {
        return JSON.parse(string)
    } catch (error) {
        return false
    }
}

const PACKETS = {
    PING: 0,
    PRINTER_ONLINE: 1,
    REQUEST: 2,
    REQUEST_SEEN: 3,
    REQUEST_DONE: 4,
    REQUEST_UNDONE: 5,
    REQUEST_DELETE: 6
}

const Api = {

    async get(endpoint, headers) {

        try {
            const req = await fetch(`${backendUrl}${endpoint}`, {
                headers: {"content-type": "application/json", ...headers}
            })

            const data = await req.json()
            const {error} = data

            const isErrored = error ? true : false

            return {
                success: !isErrored,
                data,
                error: isErrored ? error: false
            }

        } catch (error) {
            console.log(`Request failed, ${error}`)
            return {success: false}        
        }
    },
    
    async post(endpoint, {headers, payload}, file = false) {

        try {
            const req = await fetch(`${backendUrl}${endpoint}`, {
                method: "POST",
                headers: file ? headers : {"content-type": "application/json", ...headers},
                body: file ? payload : JSON.stringify(payload)
            })
            
            const data = await req.json()
            const {error} = data

            const isErrored = error ? true : false
            
            return {
                success: !isErrored,
                data,
                error: isErrored ? error: false
            }

        } catch (error) {
            console.log(`Request failed, ${error}`)
            return {success: false} 
        }
    },

    async patch(endpoint, {headers, payload}, file = false) {

        try {
            const req = await fetch(`${backendUrl}${endpoint}`, {
                method: "PATCH",
                headers: file ? headers : {"content-type": "application/json", ...headers},
                body: file ? payload : JSON.stringify(payload)
            })
    
            const data = await req.json()
            const {error} = data

            if (error) return {success: false, error}

            return {success: true, data, error: false}

        } catch (error) {
            console.log(`Request failed, ${error}`)
            return {success: false}
        }
    },

    async delete(endpoint, headers) {

        try {
            const req = await fetch(`${backendUrl}${endpoint}`, {
                method: "DELETE",
                headers
            })
    
            const {error} = await req.json()

            if (error) return {success: false, error}

            return {success: true, error: false}

        } catch (error) {
            console.log(`Request failed, ${error}`)
            return {success: false}
        }
    }
}

async function getAccessToken() {
    const expiry = parseInt(localStorage.getItem('access_expiry'))
    if (expiry && +new Date() <= expiry) {
        const currentAccessToken = localStorage.getItem('accessToken')
        if (currentAccessToken) return currentAccessToken
    }

    const {success, data, error} = await Api.get('account/auth/refresh', {
        authorization: localStorage.getItem('token')
    })

    if (!success) {
        if (error) {
            alert(error)
            return false
        }

        alert('Failed to obtain an access token, please try again later.')
        return false
    }

    const {accessToken} = data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('access_expiry', +new Date(+new Date() + 3.5e6))

    return accessToken
}

async function getFolderId() {

    const stored = localStorage.getItem('folderId')
    if (stored) return stored

    const {success, data, error} = await Api.get('account/folder', {
        authorization: localStorage.getItem('token')
    })

      if (!success) {
        if (error) {
            alert(error)
            return false
        }

        alert('Failed to access your google drive folder, please try again later.')
        return false
    }

    const {folderId} = data
    localStorage.setItem('folderId', folderId)
    return folderId
}

function formatTime(date) {
    let hours = date.getHours()
    let minutes = date.getMinutes()
    let ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12
    minutes = minutes < 10 ? `0${minutes}` : minutes

    return hours + ':' + minutes + ' ' + ampm
  }

function getIcon(type, class_name) {

    if (type === "multiple") return <MULTIPLE_FILES_ICON className={class_name}/>

    if (/^image\//.test(type)) return <IMAGE_ICON className={class_name}/>

    switch (type) {
        case "application/pdf": return <PDF_ICON className={class_name}/>
        case "application/msword":
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        case "application/vnd.google-apps.document" : return <DOC_ICON className={class_name}/>
        case "application/vnd.ms-powerpoint":
        case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        case "application/vnd.google-apps.presentation": return <PPT_ICON className={class_name}/>
        case "application/vnd.ms-excel":
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        case "application/vnd.google-apps.spreadsheet": return <XLS_ICON className={class_name}/>
        default: return <DEFAULT_FILE_ICON className={class_name}/>
      }
}

function connectToServer({token, setServer, updatePrinterStatus = () => {}, onRequest = () => {}, onRequestSeen = () => {}, onRequestDone = () => {}, onRequestUndone = () => {}, onRequestDelete = () => {}}) {
    
    let ponged = false,
        socket,
        pingInterval

    function newConnection() {
        clearInterval(pingInterval)

        socket = new WebSocket(`${socketUrl}?auth=${token}`)

        socket.addEventListener('open', () => {

            const sendMsg = (msgData = false) => {
                if (!msgData) return
                if (socket.readyState !== 1) return
                socket?.send?.(stringifyMsg(msgData))
            }

            setServer({send: sendMsg})

            pingInterval = setInterval(() => {
                ponged = false
                sendMsg({type: PACKETS.PING})
    
                setTimeout(() => {
                    if (!ponged) {
                        setTimeout(newConnection, 5000)
                    }
                }, 15000)
            }, 30000)

            sendMsg({type: PACKETS.PING})
        })
    
        socket.addEventListener('message', ({data}) => {
            
            const msg = parseMsg(data)
            if (!msg) return
    
            switch (msg.type) {
                case PACKETS.PING: ponged = true
                    break;
                case PACKETS.PRINTER_ONLINE: updatePrinterStatus(msg.printer)
                    break;
                case PACKETS.REQUEST: onRequest(msg)
                    break;
                case PACKETS.REQUEST_SEEN: onRequestSeen(msg.id)
                    break;
                case PACKETS.REQUEST_DONE: onRequestDone(msg.id)
                    break;
                case PACKETS.REQUEST_UNDONE: onRequestDone(msg.id, true)
                    break;
                case PACKETS.REQUEST_DELETE: onRequestDelete(msg.id)
                    break;
                default:
                    break;
            }
        })

        socket.addEventListener('error', (event) => {
            window.location.reload()
        })

        socket.addEventListener('close', (event) => {
            setTimeout(newConnection, 2000)
        })
    }

    newConnection()
}

export {
    CAPTCHA_SITE_KEY,
    GOOGLE_CLIENT_ID,
    GOOGLE_API_KEY,
    getAccessToken,
    getFolderId,
    Api,
    connectToServer,
    Sleep,
    parseTimestamp,
    formatTime,
    getIcon,
    LongtoBigInt,
    PACKETS
}