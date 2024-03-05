"use client";

import '../../public/css/dash.css'
import dynamic from 'next/dynamic'
import {useState, useEffect, useRef} from 'react'

const TreeAnimation = dynamic(() => import('../components/tree/TreeAnimation'), {
  ssr: false,
})

import RingLoader from '../components/loader/RingLoader'
import DotPulse from '../components/loader/DotPulse'

import PrintForm from '../components/print-form/PrintForm'
import RequestProgress from '../components/request-progress/RequestProgress';
import {EARTH_ICON} from '../../public/svgs/icons.js'

import {Api, LongtoBigInt, parseTimestamp, getIcon, getAccessToken, formatTime, connectToServer, PACKETS} from '../config'

export default function Page() {

  const [userData, setUserData] = useState({})
  const [numberOfFiles, setNumberOfFiles] = useState(0)
  const [requestData, setRequestData] = useState(false)

  const [printerStatus, setPrinterStatus] = useState({
    main: false,
    ks3: false
  })

  const [server, setServer] = useState({
    send: () => {}
  })

  const [stats, setStats] = useState({
    printRequests: 'Loading..',
    sheetsUsed: 'Loading..',
    filesPrinted: 'Loading..',
    requestsInfo: 'Loading..'
  })

  const [recentRequests, setRecentRequests] = useState([])

useEffect(() => {
    (async function getData() {
      const token = localStorage.getItem('token')
      if (!token) return window.location.href = "../login"

      const {success, data} = await Api.get('account', {authorization: token})

      if (!success || data.role !== 0) return window.location.href = "../login"

      setUserData({...data, token})
      getStats(token)
      connectToServer({token, setServer, updatePrinterStatus, onRequestSeen, onRequestDone})
  })()
})

  const updatePrinterStatus = (printer) => {
    setPrinterStatus(oldStatus => {
      const newStatus = {...oldStatus}
      newStatus[printer] = true
      setTimeout(() => {
        setPrinterStatus(outdatedStatus => {
          const updatedStatus = {...outdatedStatus}
          updatedStatus[printer] = false
          return updatedStatus
        })
      }, 28000)
      return newStatus
    })
  }

  const onRequestSeen = (id) => {
    setRecentRequests(recentRequests => {
      const newRequests = [...recentRequests]
      recentRequests.forEach(request => {
        if (request.id === id) request.seen = true
      })

      return newRequests
    })
  }

  const onRequestDone = (id, undo = false) => {
    setRecentRequests(recentRequests => {
      const newRequests = [...recentRequests]
      recentRequests.forEach(request => {
        if (request.id === id) request.done = undo ? false : true
      })

      return newRequests
    })
  }

  function processRequests(requests) {
    const unloadedRequests = []

    const processedRequests = requests.map(request => {
      const multipleFiles = request.files.length > 1 ? true : false

      const id = typeof request.id === "string" ? request.id : LongtoBigInt(request.id).toString()

      request.id = id
      request.date = parseTimestamp(id)

      if (multipleFiles) {
        request.loadingData = false
        request.fileName = `${request.files.length} Files`
        request.copies = false
        request.multipleFiles = true
        return request
      }

      const file = request.files?.[0]

      if (!file) return request

      request.loadingData = true
      request.copies = file.copies

      unloadedRequests.push(request)

      return request
    })

    setRecentRequests(recentRequests => {
      return [...processedRequests, ...recentRequests].sort((a,b) => b.id - a.id)
    })

    unloadedRequests.forEach(getFileData)

  }

  async function getStats(authorization) {
    const {success, data} = await Api.get('account/stats', {authorization})

    if (!success) return setStats({
      printRequests: 'Failed to load',
      sheetsUsed: 'Failed to load',
      filesPrinted: 'Failed to load',
      requestsInfo: 'Failed to load your recent requests.'
    })

    processRequests(data.requests)

    setStats({...stats, ...data, requestsInfo: data?.requests?.length === 0 ? "You'll be able to see your recent requests here!" : false})
  }

  const [showPrintForm, setPrintForm] = useState(false)
  const [showRequestProgress, setRequestProgress] = useState(false)
  
  const requestRef = useRef()
  const reportRef = useRef()

  function getMonth(int = new Date().getMonth()) {
    return ["January","February","March","April","May","June","July","August","September","October","November","December"][int]
  }

  function randomString() {
    const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$%^&*()[]{}|;':",.<>?`
    let charsLength = chars.length
    let result = (+new Date()).toString().slice(11)
    for (let i = 0; i < 8; i++) {
        result += chars[Math.floor(Math.random() * charsLength)]
    }

   return result
  } 

  async function getFileData(request) {

    const req = await fetch(`https://www.googleapis.com/drive/v3/files/${request?.files?.[0]?.id}`, {
      headers: {
        authorization: `Bearer ${await getAccessToken()}`
      }
    })

    const {name, mimeType} = await req.json()
    
    setRecentRequests(allRequests => {
      const requests = allRequests.filter(oldRequest => oldRequest?.id !== request?.id)

      if (!(name && mimeType)) return [...requests, {...request, fileName: "Failed to load.", mimeType: "default", loadingData: false}].sort((a,b) => b.id - a.id)

      return [...requests, {...request, fileName: name, mimeType, loadingData: false}].sort((a,b) => b.id - a.id)
    })
  }

  async function submitRating({target: {id}}) {
    if (isNaN(id)) return

    const {success, error} = await Api.post('feedback/rating', {headers: {authorization: userData.token}, payload: {rating: parseInt(id)}})

    if (!success) {
      if (error) return alert(error)

      return alert('Rating failed, please try again later')
    }

    setUserData({...userData, rated: true})
    alert('Thank you for the rating!')
  }

  async function submitRequest() {
    const {success, error} = await Api.post('feedback/request', {headers: {authorization: userData.token}, payload: {request: requestRef.current?.value}})

    if (!success) {
      if (error) return alert(error)

      return alert('Submitting request failed, please try again later')
    }

    alert('Thank you for helping us improve this app!')
    requestRef.current.value = ""
  }

  async function submitReport() {
    const {success, error} = await Api.post('feedback/report', {headers: {authorization: userData.token}, payload: {report: reportRef.current?.value}})

    if (!success) {
      if (error) return alert(error)

      return alert('Submitting report failed, please try again later')
    }

    alert('We will respond to your concerns shortly.')
    reportRef.current.value = ""
  }

  async function shareFile({id}) {

    const req = await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions?sendNotificationEmail=false`, {
      headers: {
        authorization: `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'user',
        emailAddress: userData.printerEmail
      }),
      method: "POST"
    })

    const { role } = await req.json()

    if (!role) return console.log(`Failed to share file ${id}`)
  }

  function formatFiles(files) {
    const formattedFiles = []

    files.forEach(file => {

      const fileName = randomString() + file.name

      if (file.googleDrive) {
        const newFile = new File([file.buffer], fileName, {type: file.mimeType})
        newFile.id = file.id
        newFile.copies = file.copies
        newFile.options = file.options
        return formattedFiles.push(newFile)
      }

      const newFile = new File([file], fileName, {type: file.type})
      newFile.id = file.id
      newFile.copies = file.copies
      newFile.options = file.options

      formattedFiles.push(file)
    })

    return formattedFiles
  }

  async function sendRequest(files, note = false) {
    setNumberOfFiles(files.length)
    setRequestProgress(true)

    const payload = new FormData()
    if(note) payload.append('note', note)
    payload.append('printerEmail', userData.printerEmail)
    formatFiles(files).forEach(file => {
      
      for (const option in file.options) {
        if (!file.options[option]) delete file.options[option]
      }

      payload.append('files[]', file)
      payload.append(file.name, JSON.stringify({id: file.id, copies: file.copies, ...file.options}))
    })

    const {success, error, data} = await Api.post('request/send', {headers: {authorization: userData.token}, payload}, true)

    if (!success) {
      if (error) return setRequestData({...data, error})

      return setRequestData({...data, error: "Failed to send your request, please try again later."})
    }

    processRequests([data])

    setRequestData({...data, error: false, sharing: true, done: false})

    await Promise.all(files.map(shareFile))

    setRequestData({...data, error: false, sharing: false, done: true})

    setTimeout(() => {setRequestData({...data, error: false, sharing: false, done: true, finished: true})}, 2000)

    const {id, name, email, avatarURL} = data

    server.send({id: id?.toString?.(), type: PACKETS.REQUEST, email: userData.printerEmail, name, email, avatarURL, files: data.files})
  }

  async function cancelRequest(id, fileName) {
    const confirmDelete = window.confirm(`Are you sure you want to cancel printing ${fileName}`)
    if (!confirmDelete) return 
    
    server.send({type: PACKETS.REQUEST_DELETE, email: userData.printerEmail, id})
    const {success, error} = await Api.delete(`request/${id}/cancel`, {authorization: userData.token})

    if (!success) {
      if (error) return alert(error)

      return alert("Failed to cancel request, please try again later.")
    }

    setRecentRequests(recentRequests => recentRequests.filter(request => request.id !== id))
  }

  return (
    <div className='dashboard teacher'>

      {showPrintForm ? <PrintForm data={{setPrintForm, sendRequest}}/> : null}
      {showRequestProgress ? <RequestProgress data={{setRequestProgress, numberOfFiles, requestData}}/> : null}

      <div className="first-column column">
        <div className='account-info card'>
          <div className='main-info'>
            <img draggable="false" src={userData?.avatarURL ? `https://lh3.googleusercontent.com/a/${userData?.avatarURL}` : null} referrerPolicy="no-referrer" alt="profile" />

            <h2><span className='welcoming'>Welcome back, </span>{userData?.name?.split?.(' ')[0]}!</h2>

            <span className='user-email'>{userData?.email}</span>
          </div>

          <button onClick={(e) => {
            localStorage.clear()
            setTimeout(() => window.location.href = '../login', 500)
          }} className='logout'>
            <span className="material-symbols-outlined logout-icon">logout</span>
            <span>Log Out</span>
          </button>
        </div>

        <div className='feedback card'>
          <div className="main-review">

            <h4>{userData?.rated ? 'Your Feedback!' : 'Rate this App!'}</h4>

          {userData?.rated ? null : <div className='rating'>
            <div className="stars">
              <div className="stars-container">
                <button onClick={submitRating}>
                  <div id="1" className="material-symbols-outlined star-icon">star</div>
                </button>
                <button onClick={submitRating}>
                  <div id="2" className="material-symbols-outlined star-icon">star</div>
                </button>
                <button onClick={submitRating}>
                  <div id="3" className="material-symbols-outlined star-icon">star</div>
                </button>
                <button onClick={submitRating}>
                  <div id="4" className="material-symbols-outlined star-icon">star</div>
                </button>
                <button onClick={submitRating}>
                  <div id="5" className="material-symbols-outlined star-icon">star</div>
                </button>
              </div>
            </div>
          </div>}

          <div className='review'>

              <div onMouseEnter={(e) => e.target.scrollIntoView({behavior: 'smooth'})} className="report-container">
                <textarea ref={requestRef} maxLength={200} placeholder='Request a new feature' className='textarea feature'></textarea>
                <button onClick={submitRequest} className='request'>Submit Request</button>
              </div>

              <div onMouseEnter={(e) => e.target.scrollIntoView({behavior: 'smooth'})} className="report-container">
                <textarea ref={reportRef} maxLength={200} placeholder='Report a bug or an issue' className='textarea issue'></textarea>
                <button onClick={submitReport} className='report'>Submit Report</button>
              </div>
              </div>
            </div>

            <div className='credits'>
              <span>by </span>
              <span className='developer'>Munir</span>
              <span> with the </span>
              <span className='partner'>Sustainability Club</span>
              </div>
        </div>
      </div>

      <div className="second-column column">
        <div className='active-printers-container card'>
          <div className='active-printer'>
            <img draggable="false" src="/images/bbs-logo.png" alt="profile" />
            <h4 className='printer-name'>Main Repro</h4>
            <div className='printer-status'>
              <span className='status-text'>{printerStatus.main ? 'Online' : 'Offline'}</span>
              <span className={`material-symbols-outlined status-icon ${printerStatus.main ? 'online' : 'offline'}`}>{printerStatus.main ? 'radio_button_checked' : 'person_cancel'}</span>
            </div>
          </div>

          <div className='active-printer'>
            <img draggable="false" src="/images/bbs-logo.png" alt="profile" />
            <h4 className='printer-name'>KS3 Repro</h4>
            <div className='printer-status'>
              <span className='status-text'>{printerStatus.ks3 ? 'Online' : 'Offline'}</span>
              <span className={`material-symbols-outlined status-icon ${printerStatus.ks3 ? 'online' : 'offline'}`}>{printerStatus.ks3 ? 'radio_button_checked' : 'person_cancel'}</span>
            </div>
          </div>
        </div>

        <div className='stats card'>

          <div className="info-container">

            <div className="top-info">

              <h3>{getMonth()} {new Date().getFullYear()}</h3>

              <div className="info">
                <span className='data-category'>Number of print requests:</span>
                <span className='data-value'>{stats.printRequests}</span>
              </div>

              <div className="info">
                <span className='data-category'>Sheets of paper used:</span>
                <span className='data-value'>{stats.sheetsUsed}</span>
              </div>

              <div className="info">
                <span className='data-category'>Files printed:</span>
                <span className='data-value'>{stats.filesPrinted}</span>
              </div>
            </div>


            <div className="notice">
              <div className='notice-heading'>
                <span>Trees are life!</span>
                <EARTH_ICON className='earth-icon'/>
              </div>
              <span>Please do your part by recycling paper and reducing prints by using online files instead.</span>
              <span className='important-note'>Remember that a small change can make a big impact...</span>
            </div>

          </div>

          <div className="pine-tree">
            <div className='tree-container'>
              <div className="tree-animation">
                <TreeAnimation/>
              </div>
              <div className='tree-tooltip'>
                <div className="info-label">
                  <span className="material-symbols-outlined info-icon">info</span>
                  <span>Did you know?</span>
                </div>
                    On average, a pine tree can produce 10,000 sheets of paper
              </div>
              <div className="tree-counter">
                <span className='tree-percentage'>{(stats.sheetsUsed === "Loading.." ? 0 : stats.sheetsUsed  / 10000).toPrecision(stats.sheetsUsed < 10 ? 1 : 2)}%</span>
                <span className='description'>of a pine tree</span>
              </div>
            </div>
          </div>


        </div>
      </div>

      <div className="third-column column">
        <div className='new-request'>
          <button onClick={(e) => setPrintForm(true)}>
            <span>New Request</span>
            <span className="material-symbols-outlined print-icon">print_add</span>
          </button>
        </div>

        <div className='recent-requests card'>

          <h4>Recent Prints</h4>
      
          <div className="recent-requests-container">

            {recentRequests.length === 0 ? <span>{stats.requestsInfo ? stats.requestsInfo : "All clear..."}</span> : 
            
              recentRequests.map(request => 
                <div key={request.id} className={`recent-request ${request.done ? '' : request.loadingData ? '' : 'cancelable'}`}>

                  <div title="Cancel request" className="cancel-request-container">  
                    <button onClick={() => cancelRequest(request.id, request.fileName)} className="cancel-request">
                      <span className="material-symbols-outlined">delete_forever</span>
                    </button>
                  </div>

                  <div className="file-icon-container">
                    {request.multipleFiles ? getIcon("multiple", "file-icon") : request.loadingData ? <RingLoader/> : getIcon(request.mimeType, "file-icon")}
                  </div>

                  <div className="request-details">
                    <div className="main-details">
                      <span className='request-file-name'>{request.loadingData ? "Loading..." : request.fileName}</span>

                      {request.copies ? <span className='copies'><span>Copies: </span>{request.copies}</span> : null}
                      
                      <div className="date">
                        <span className="material-symbols-outlined date-icon">schedule</span>
                        <span className='date-requested'>{getMonth(request.date?.getMonth())} {request.date?.getDate()} {formatTime(request.date)}</span>
                      </div>
                    </div>
                    <div className="request-end">
                      <div title={`This print costed ${request.sheets} sheets of paper.`} className="paper-used">
                        <span className='number-of-sheets'>{request.sheets} sheets</span>
                        <span className="material-symbols-outlined plant-icon">compost</span>
                      </div>
                      {request.done ? <span title="Files have been printed" className="material-symbols-outlined request-state print-done">task</span> : request.seen ? <span title="Your request was seen" className="material-symbols-outlined request-state print-seen">done_all</span> : <div title='Your request has been sent for printing...' className='request-state-loader'><DotPulse/></div>}
                    </div>
                  </div>
                </div>
              )
            } 

          </div>
        </div>
      </div>

    </div>
  )
}