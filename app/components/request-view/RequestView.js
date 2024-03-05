"use client";

import {useState, useEffect} from 'react'

import './RequestView.css'

import Modal from '../modal/Modal'
import FileViewer from '../file-viewer/FileViewer'
import RingLoader from '../loader/RingLoader'

import { Api } from '../../config'

const RequestView = ({data: {setRequestView, requestId, authorization}}) => {

    const [requestData, setRequestData] = useState(false)

    const [closing, setClosing] = useState(false)

    function closeRequestView() {
        setClosing(true)
        setTimeout(() => {setRequestView(false)}, 240)
    }

    useEffect(() => {
      (async function getRequestData() {
        const {success, error, data} = await Api.get(`request/find/${requestId}`, {authorization})

        if (!success) {
          if (error) return alert(error)
    
          return alert('Failed to get request data, please try again later')
        }

        setRequestData(data)
      })()
    }, [requestId])

  return (
    <Modal closeModal={closeRequestView} closing={closing}>
      {requestData ? <div className='request-view-content'>
        <h2>{`${requestData.files.length} File${requestData.files.length > 1 ? 's' : ''}`}</h2>
        <FileViewer files={requestData.files}/>
          {/* <div className='mark-req-done-btn-container'>
            <button onClick={() => markAsDone()} className='modal-btn'>Mark as Done</button>
          </div> */}
        </div> : 
      
      <div className='req-loader-container'>
        <RingLoader size={"60"}/>
      </div>}
    </Modal>
  )
}

export default RequestView