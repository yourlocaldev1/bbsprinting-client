
import { useState, useEffect } from 'react'

import Modal from '../modal/Modal'
import Request from '../request/Request'
import RequestView from '../request-view/RequestView'

import './CompletedRequestsView.css'

import { Api, LongtoBigInt, parseTimestamp } from '../../config'

const CompletedRequestsView = ({data: {setCompletedRequestsView, markDone, authorization, updateSeen}}) => {

    const [completedRequests, setCompletedRequests] = useState([])

    const [requestId, setRequestId] = useState('')

    const [requestView, setRequestView] = useState(false)

    const [closing, setClosing] = useState(false)

    function closeCompletedRequestsView() {
        setClosing(true)
        setTimeout(() => {setCompletedRequestsView(false)}, 240)
    }

    useEffect(() => {
      (async function getRequestData() {
        const {success, error, data} = await Api.get(`request/printing?done=true`, {authorization})

        if (!success) {
          if (error) return alert(error)
    
          return alert('Failed to get request data, please try again later')
        }

        data.forEach(request => {
            request.id = LongtoBigInt(request.id)
            request.date = parseTimestamp(request.id)
        })

        setCompletedRequests(data)
      })()
    })

  return (
    <>  
        <Modal closeModal={closeCompletedRequestsView} closing={closing}>

            <div className="completed-requests-content">
                <h3>Completed Requests</h3>

                <div className="print-requests-container">
                    {completedRequests.length === 0 ? <h3 className='no-requests-text'>No completed requests.</h3> : null}

                    {completedRequests.map(requestData => <Request key={requestData.id} data={{...requestData, setRequestId, setRequestView, setRequests: setCompletedRequests, done: true, markDone, updateSeen}}/>)}
                </div>
            </div>
        </Modal>

        {requestView ? <RequestView data={{setRequestView, requestId, authorization}} setRequestId={setRequestId} setRequestView={setRequestView}/> : null}
    </>
  )
}

export default CompletedRequestsView