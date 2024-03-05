"use client";

import {useState} from 'react'

import Modal from '../modal/Modal'

import './RequestProgress.css'

const RequestProgress = ({data: {setRequestProgress, numberOfFiles, requestData}}) => {

  const [closing, setClosing] = useState(false)

  function closeRequestProgress() {
    setClosing(true)
    setTimeout(() => {setRequestProgress(false)}, 240)
  }

  return (
    <Modal closeModal={closeRequestProgress} closing={closing}>
      <div className="request-progress-content">
        {requestData.finished ? <>
        <>
          <h1>{`Your request has been sent successfully, ${requestData.sheets} sheet${requestData.sheets > 1 ? 's' : ''} of paper used.`}</h1>
        </>
        </> : 
        <>
          <div className='req-state'>          
            <h1>{requestData.sharing || requestData.done ? `Your file${numberOfFiles > 1 ? 's have been' : ' has'} processed successfully` : `Your file${numberOfFiles > 1 ? 's are' : ' is'} being processed...`}</h1>
            {requestData.sharing || requestData.done ? <span className="material-symbols-outlined processing-done">check_circle</span> : <div className="spinning-loader"></div>}
          </div>

          <div className='req-state'>
            <h1>{requestData.sharing ? `Your file${numberOfFiles > 1 ? 's are' : ' is'} being shared...` : `Your file${numberOfFiles > 1 ? 's have' : ' has'} been shared successfully`}</h1>
            {requestData.done ? <span className="material-symbols-outlined processing-done">check_circle</span> : <div className="spinning-loader"></div>}
          </div>
        </>
        }
      </div>
    </Modal>
  )
}

export default RequestProgress