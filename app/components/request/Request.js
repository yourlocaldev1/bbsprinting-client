import { formatTime } from '../../config'

import './Request.css'

const Request = ({data: {id, from: {name, email, avatarURL}, files, date, setRequestId, setRequestView, setRequests = () => {}, done = false, markDone, updateSeen}}) => {

    async function viewRequest(requestId) {
        setRequestId(requestId)
        setRequestView(true)
        updateSeen(email, requestId?.toString?.())
      }


  return (
    <div onMouseOver={({target}) => target.classList.add('show-hidden-menu')} onMouseLeave={({target}) => {
        target.classList.add('hiding-menu')
        setTimeout(() => {
          target.classList.remove('hiding-menu')
          target.classList.remove('show-hidden-menu')
      }, 100)
    }} className="request-wrapper">
        <div className="request-inner-wrapper">
          
          <div className="print-request">
            <div className="request-profile-container">
              <img draggable={false} src={`https://lh3.googleusercontent.com/a/${avatarURL}`} referrerPolicy="no-referrer" alt=""/>
            </div>

            <div className="print-request-details">
              <div className="print-request-info">
                <span className="req-name">{name}<span className="req-email">{email}</span></span>
                <span className="req-time">
                  <span className="material-symbols-outlined date-icon">schedule</span>
                  {formatTime(date)}
                </span>
              </div>

              <button onClick={() => viewRequest(id)}>
                View
                <span className="material-symbols-outlined">open_in_full</span>
              </button>
            </div>

          </div>

          <div className="hidden-menu">
            <div className="hidden-contents">
              <div className="req-file-count-container">
                <span>{`${files.length} File${files.length > 1 ? 's' : ''}`}</span>
              </div>

              <span className="req-full-date">{date.getDate()} / {date.getMonth() + 1} / {date.getFullYear()}</span>

              <div className="req-finish-btn-container">
                {done ? <button onClick={() => markDone(email, id, setRequests, true, {id, from: {name, email, avatarURL}, date, files})} className='req-done-label'>Mark not Done</button> : <button className='req-done-btn' onClick={() => markDone(email, id, setRequests)}>Mark as Done</button>}
              </div>
            </div>
          </div>

        </div>
      </div>
  )
}

export default Request