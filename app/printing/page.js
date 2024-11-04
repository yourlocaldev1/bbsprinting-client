"use client"

import { useState, useEffect } from 'react'
import '../../public/css/dash.css'

import Sidebar from '../components/sidebar/Sidebar'
import RequestView from '../components/request-view/RequestView'
import Request from '../components/request/Request'
import CompletedRequestsView from '../components/completed-requests-view/CompletedRequestsView'

import { Api, LongtoBigInt, parseTimestamp, connectToServer, PACKETS, sendNotification } from '../config'

const Page = () => {

    const [userData, setUserData] = useState({})
    const [incomingRequests, setIncomingRequests] = useState([])

    const [refreshing, setRefreshing] = useState(false)

    const [server, setServer] = useState(() => {})

    const [completedRequestsView, setCompletedRequestsView] = useState(false)

    const [requestView, setRequestView] = useState(false)
    const [requestId, setRequestId] = useState('')

    useEffect(() => {
        (async function getData() {
    
          const {success, data} = await Api.get('account')
    
          if (!success || data.role !== 1) return window.location.href = "../login"
    
          setUserData({...data})

          loadIncomingRequests()
          setInterval(loadIncomingRequests, 60 * 1000)

          connectToServer({setServer, onRequest, onRequestDelete})
        })()
    }, [])

    const onRequest = ({id, name, email, avatarURL, files}) => {
      const newId = BigInt(id)
      const newRequest = {id: newId, from: {name, email, avatarURL}, files, date: parseTimestamp(newId)}
      
      setIncomingRequests(previousRequests => [newRequest, ...previousRequests])

      sendNotification('New Request!', {
        body: name,
      })
    }

    const onRequestDelete = (id) => {
      const reqId = BigInt(id)
      setIncomingRequests(previousRequests => previousRequests.filter(previousRequest => previousRequest?.id !== reqId))
    }

    async function loadIncomingRequests() {
      setRefreshing(true)

      const {success, error, data} = await Api.get('request/printing')

      if (!success) {
        if (error) return alert(error)
  
        return alert('Failed to load incoming requests, please try again later')
      }

      data.forEach(request => {
        request.id = LongtoBigInt(request.id)
        request.date = parseTimestamp(request.id)
      })

      setIncomingRequests(data)
      setRefreshing(false)
    }

      async function markDone(email, requestId, setRequests, undo = false, undoRequest) {
        const {success, error} = await Api.get(`request/${requestId}/done${undo ? "?undo=true" : ""}`)

        if (!success) {
          if (error) return alert(error)
    
          return alert('Failed to mark request as done, please try again later')
        }

        updateDone(email, requestId, undo)

        setRequests(previousRequests => previousRequests.filter(previousRequest => previousRequest?.id !== requestId))
        if (undo) setIncomingRequests(previousRequests => [undoRequest, ...previousRequests])
      }

      function updateSeen(email, id) {
        server.send({type: PACKETS.REQUEST_SEEN, email, id})
      }

      function updateDone(email, id, undone = false) {
        const type = undone ? PACKETS.REQUEST_UNDONE : PACKETS.REQUEST_DONE
        server.send({type, email, id: id?.toString?.()})
      }

  return (
    <div className='dashboard printing'>

    {completedRequestsView ? <CompletedRequestsView data={{setCompletedRequestsView, markDone, markDone, updateSeen}}/> : null}
    {requestView ? <RequestView data={{setRequestView, requestId}} setRequestId={setRequestId} setRequestView={setRequestView}/> : null}

      <Sidebar userData={userData} setUserData={setUserData}/>

      <div className="second-column column">
        <div className="print-requests card">
          <h3>Incoming Requests</h3>
          <div className="print-requests-container">

            {incomingRequests.length === 0 ? <h3 className='no-requests-text'>No incoming requests yet!</h3> : null}

            {incomingRequests.map(requestData => <Request key={requestData.id} data={{...requestData, setRequestId, setRequestView, setRequests: setIncomingRequests, markDone, updateSeen}}/>)}

          </div>

          <div className="completed-btn-container">
            <button onClick={() => setCompletedRequestsView(true)} className='completed-btn'>
                View Completed Prints
                <span className="material-symbols-outlined">data_table</span>
            </button>
          </div>

          <button onClick={loadIncomingRequests} className={`refresh-btn ${refreshing ? 'refresh-load' : ''}`}>
            <span className="material-symbols-outlined">sync</span>
          </button>

        </div>
      </div>
    </div>
  )
}

export default Page