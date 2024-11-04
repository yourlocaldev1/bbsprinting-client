import { useRef } from 'react'

import {Api} from '../../config'

import './Sidebar.css'

const Sidebar = ({userData, setUserData}) => {

    const feedbackRef = useRef()
    
    async function submitFeedback() {
      
      const {success, error} = await Api.post('feedback/send', {payload: {feedback: feedbackRef.current?.value}})
  
      if (!success) {
        if (error) return alert(error)
  
        return alert('Failed to send feedback, please try again later.')
      }
  
      alert('Thank you for helping us improve this app!')
      feedbackRef.current.value = ""
    }

    async function submitRating({target: {id}}) {
        if (isNaN(id)) return
    
        const {success, error} = await Api.post('feedback/rating', {payload: {rating: parseInt(id)}})
    
        if (!success) {
          if (error) return alert(error)
    
          return alert('Rating failed, please try again later')
        }
    
        setUserData(data => {
            return {...data, rated: true}
        })
        alert('Thank you for the rating!')
    }

  return (
        <div className="first-column column">
            <div className='account-info card'>
              <div className='main-info'>
                <img draggable="false" src={`https://lh3.googleusercontent.com/a/${userData?.avatarURL}`} referrerPolicy="no-referrer" alt="profile" />

                <h2><span className='welcoming'>Welcome, </span>{userData?.name?.split?.(' ')[0]}!</h2>

                <span className='user-email'>{userData?.email}</span>
              </div>

              <button onClick={() => {
                localStorage.clear()
                window.location.href = '../login'
              }} className='logout'>
                <span className="material-symbols-outlined logout-icon">logout</span>
                <span>Log Out</span>
              </button>
            </div>
          
            <div className='feedback card'>
              <div className="main-review">
          
                <h4>{userData?.rated ? 'Your Feedback' : 'Rate this App!'}</h4>
          
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
                  <div className="report-container">
                    <textarea ref={feedbackRef} maxLength={200} placeholder='Report an issue or suggest a feature...' className='textarea feature'></textarea>
                    <button onClick={submitFeedback} className='request'>Send Feedback</button>
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
  )
}

export default Sidebar