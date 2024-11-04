"use client";

import '../../public/css/dash.css'
import dynamic from 'next/dynamic'
import {useState, useEffect, useRef} from 'react'

const TreeAnimation = dynamic(() => import('../components/tree/TreeAnimation'), {ssr: false})

const Realistic = dynamic(() => import('react-canvas-confetti/dist/presets/realistic'), {ssr: false})

import RingLoader from '../components/loader/RingLoader'
import DotPulse from '../components/loader/DotPulse'

import Sidebar from '../components/sidebar/Sidebar'

const PrintForm = dynamic(() => import('../components/print-form/PrintForm'), {ssr: false})

import RequestProgress from '../components/request-progress/RequestProgress';
import {EARTH_ICON} from '../../public/svgs/icons.js'

import {Api, LongtoBigInt, parseTimestamp, getIcon, getAccessToken, formatTime, connectToServer, PACKETS, sendNotification} from '../config'

export default function Page() {

  const [userData, setUserData] = useState({
    printRequests: 'Loading..',
    sheetsUsed: 'Loading..',
    filesPrinted: 'Loading..',
    requestsInfo: 'Loading..'
  })

  const [numberOfFiles, setNumberOfFiles] = useState(0)
  const [requestData, setRequestData] = useState(false)

  const [printerStatus, setPrinterStatus] = useState({
    main: false,
    ks3: false
  })

  const [server, setServer] = useState({
    send: () => {}
  })

  const [recentRequests, setRecentRequests] = useState([])

useEffect(() => {
    (async function getData() {

      const {success, data} = await Api.get('account?stats=true')

      if (!success || data?.role !== 0) return window.location.href = "../login"

      const printer = data.printerEmail === "repro.ks3@belvederebritishschool.com" ? "KS3 Repro" : "Main Repro"

      setUserData({...data, printer, requestsInfo: data?.requests?.length === 0 ? "You'll be able to see your recent requests here!" : false})
      connectToServer({setServer, updatePrinterStatus, onRequestSeen, onRequestDone})

      processRequests(data.requests)
  })()
}, [])

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

    sendNotification('Printing Completed!', {
      body: `Head to ${userData.printer} to collect your papers.`,
      icon: "https://cdn-icons-png.flaticon.com/512/2550/2550322.png"
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

  const [showPrintForm, setPrintForm] = useState(false)
  const [showRequestProgress, setRequestProgress] = useState(false)

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

    fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions?sendNotificationEmail=false`, {
      headers: {
        authorization: `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'user',
        emailAddress: 'abdulla.munir2018@belvederebritishschool.com'
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
    setRequestData(requestData => {return {...requestData, finished: false}})
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

    const {success, error, data} = await Api.post('request/send', {payload}, true)

    if (!success) {
      if (error) return setRequestData({...data, error})

      return setRequestData({...data, error: "Failed to send your request, please try again later."})
    }

    processRequests([data])

    setRequestData({...data, error: false, sharing: true, done: false})

    await Promise.all(files.map(shareFile))

    setRequestData({...data, error: false, sharing: false, done: true})

    setTimeout(() => {setRequestData({...data, error: false, sharing: false, done: true, finished: true})}, 5000)

    setUserData(currentData => {
      return {...currentData, 
        printRequests: currentData.printRequests + 1,
        sheetsUsed: currentData.sheetsUsed + data.sheets,
        filesPrinted: currentData.sheetsUsed + data.files.length,}
    })

    const {id, name, email, avatarURL} = data

    server.send({id: id?.toString?.(), type: PACKETS.REQUEST, email: userData.printerEmail, name, email, avatarURL, files: data.files})
  }

  async function cancelRequest(id, fileName) {
    const confirmDelete = window.confirm(`Are you sure you want to cancel printing ${fileName}`)
    if (!confirmDelete) return 
    
    server.send({type: PACKETS.REQUEST_DELETE, email: userData.printerEmail, id})
    const {success, error} = await Api.delete(`request/${id}/cancel`)

    if (!success) {
      if (error) return alert(error)

      return alert("Failed to cancel request, please try again later.")
    }

    setRecentRequests(recentRequests => recentRequests.filter(request => request.id !== id))
  }

  return (
    <div className='dashboard teacher'>

      {showPrintForm ? <PrintForm data={{setPrintForm, sendRequest, userData}}/> : null}
      {showRequestProgress ? <RequestProgress data={{setRequestProgress, numberOfFiles, requestData}}/> : null}

      <Sidebar userData={userData} setUserData={setUserData}/>

      <div className="second-column column">
        <div className='active-printers-container card'>
          <div className='active-printer'>
            <h4 className='printer-name'>Main Repro</h4>
            <div className='printer-status'>
              <span className='status-text'>{printerStatus.main ? 'Online' : 'Offline'}</span>
              <span className={`material-symbols-outlined status-icon ${printerStatus.main ? 'online' : 'offline'}`}>{printerStatus.main ? 'radio_button_checked' : 'person_cancel'}</span>
            </div>
          </div>

          <div className='active-printer'>
            <h4 className='printer-name'>KS3 Repro</h4>
            <div className='printer-status'>
              <span className='status-text'>{printerStatus.ks3 ? 'Online' : 'Offline'}</span>
              <span className={`material-symbols-outlined status-icon ${printerStatus.ks3 ? 'online' : 'offline'}`}>{printerStatus.ks3 ? 'radio_button_checked' : 'person_cancel'}</span>
            </div>
          </div>
        </div>

        <div className='stats card'>

          <div className="main-data">
            <div className="info-container">

              <h3>{getMonth()} {new Date().getFullYear()}</h3>

              <div className="info">
                <span className='data-category'>Number of print requests:</span>
                <span className='data-value'>{userData.printRequests}</span>
              </div>

              <div className="info">
                <span className='data-category'>Sheets of paper used:</span>
                <span className='data-value'>{userData.sheetsUsed}</span>
              </div>

              <div className="info">
                <span className='data-category'>Files printed:</span>
                <span className='data-value'>{userData.filesPrinted}</span>
              </div>

            </div>

            <div className='tree-container'>
              <div className="tree-animation">
                <TreeAnimation/>
              </div>
              <div className="tree-tooltip-container">
                <div className='tree-tooltip'>
                  <div className="info-label">
                    <span className="material-symbols-outlined info-icon">info</span>
                    <span>Did you know?</span>
                  </div>
                      On average, a pine tree can produce 10,000 sheets of paper
                </div>
              </div>
              <div className="tree-counter">
                <span className='tree-percentage'>{(userData.sheetsUsed === "Loading.." ? 0 : userData.sheetsUsed  / 10000).toPrecision(userData.sheetsUsed < 10 ? 1 : 2)}%</span>
                <span className='description'>of a pine tree</span>
              </div>
            </div>
          </div>

          <div className="notice">
              <div className='notice-heading'>
                <span>Trees are life!</span>
                <EARTH_ICON className='earth-icon'/>
              </div>
              <span>Please do your part by recycling paper and reducing prints by using online files instead.</span>
              <span className='important-note'>Remember that a small change can have a big impact...</span>
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

            {recentRequests.length === 0 ? <span>{userData.requestsInfo ? userData.requestsInfo : "All clear..."}</span> : 
            
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
