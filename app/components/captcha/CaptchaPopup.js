import {useState} from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { CAPTCHA_SITE_KEY } from '../../config'
import './CaptchaPopup.css'

const Popup = ({data: {setCaptcha, verifyCaptcha, cancelCallBack}}) => {

    const [closing, setClosing] = useState(false)
    const [solved, setSolved] = useState(false)

    function closeCaptcha() {
        setClosing(true)
        setTimeout(() => {setCaptcha(false)}, 240)
    }
    
    function cancelCaptcha() {
        console.log('Cancelled Captcha')
        closeCaptcha()
        cancelCallBack()
    }

    function onVerify(token) {
        setSolved(true)
        closeCaptcha()
        verifyCaptcha(token)
    }

    return (
        <div className='popup-layer'>
        <div onClick={solved ? null : cancelCaptcha} className={`popup-overlay ${closing ? 'overlay-closing' : ''}`}>
        </div>
        <div className={`popup ${closing ? 'popup-closing': ''}`}>
            <div className="popup-content">
                <img draggable="false" src="/images/captcha.png" alt="captcha-icon" className='captcha-icon'/>
                <h1 className='popup-heading'>Are you a human?</h1>
                <span className='captcha-info'>Please confirm you&apos;re not a robot.</span>
                <HCaptcha sitekey={CAPTCHA_SITE_KEY} onVerify={onVerify}/>
            </div>
            <button onClick={solved ? null : cancelCaptcha} className='popup-close-btn'>
                    <span className="material-symbols-outlined">close</span>
            </button>
        </div>
        </div>
    )
}

export default Popup