"use client"

import { useState, useEffect, useRef } from 'react'
import '../../public/css/dash.css'

import RequestView from '../components/request-view/RequestView'
import Request from '../components/request/Request'
import CompletedRequestsView from '../components/completed-requests-view/CompletedRequestsView'

import { Api, LongtoBigInt, parseTimestamp, connectToServer, PACKETS } from '../config'

const Page = () => {

    const [userData, setUserData] = useState({})
    const [incomingRequests, setIncomingRequests] = useState([])

    const [refreshing, setRefreshing] = useState(false)

    const [server, setServer] = useState(() => {})

    const [completedRequestsView, setCompletedRequestsView] = useState(false)

    const [requestView, setRequestView] = useState(false)
    const [requestId, setRequestId] = useState('')

    const requestRef = useRef()
    const reportRef = useRef()  

    useEffect(() => {
        (async function getData() {
          const token = localStorage.getItem('token')
          if (!token) return window.location.href = "../login"
    
          const {success, data} = await Api.get('account', {authorization: token})
    
          if (!success || data.role !== 1) return window.location.href = "../login"
    
          setUserData({...data, token})

          loadIncomingRequests(token)
          setInterval(() => {loadIncomingRequests(token)}, 5 * 60 * 1000)

          connectToServer({token, setServer, onRequest, onRequestDelete})
        })()
    }, [])

    const onRequest = ({id, name, email, avatarURL, files}) => {
      const newId = BigInt(id)
      const newRequest = {id: newId, from: {name, email, avatarURL}, files, date: parseTimestamp(newId)}
      
      setIncomingRequests(previousRequests => [newRequest, ...previousRequests])
    }

    const onRequestDelete = (id) => {
      const reqId = BigInt(id)
      setIncomingRequests(previousRequests => previousRequests.filter(previousRequest => previousRequest?.id !== reqId))
    }

    async function loadIncomingRequests(authorization) {
      setRefreshing(true)

      const {success, error, data} = await Api.get('request/printing', {authorization})

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

      async function markDone(email, requestId, setRequests, undo = false, undoRequest) {
        const {success, error} = await Api.patch(`request/${requestId}/done${undo ? "?undo=true" : ""}`, {headers: {authorization: userData.token}})

        if (!success) {
          if (error) return alert(error)
    
          return alert('Failed to mark request as done, please try again later')
        }

        updateDone(email, requestId, undo)

        setTimeout(() => {
            setRequests(previousRequests => previousRequests.filter(previousRequest => previousRequest?.id !== requestId))
            if (undo) setIncomingRequests(previousRequests => [undoRequest, ...previousRequests])
        }, 100)
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

    {completedRequestsView ? <CompletedRequestsView data={{setCompletedRequestsView, markDone, authorization: userData.token, markDone, updateSeen}}/> : null}
    {requestView ? <RequestView data={{setRequestView, requestId, authorization: userData.token}} setRequestId={setRequestId} setRequestView={setRequestView}/> : null}

        <div className="first-column column">
            <div className='account-info card'>
              <div className='main-info'>
                <img draggable="false" src={userData?.avatarURL ? `https://lh3.googleusercontent.com/a/${userData?.avatarURL}` : null} referrerPolicy="no-referrer" alt="profile" />

                <h2><span className='welcoming'>Welcome back, </span>{userData?.name?.split?.(' ')[0]}!</h2>

                <span className='user-email'>{userData?.email}</span>
              </div>

              <button onClick={() => {
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

          <button onClick={() => loadIncomingRequests(userData.token)} className={`refresh-btn ${refreshing ? 'refresh-load' : ''}`}>
            <span className="material-symbols-outlined">sync</span>
          </button>

        </div>
      </div>
    </div>
  )
}

export default Page