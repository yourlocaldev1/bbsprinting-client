import './LoginButton.css'

import {useGoogleLogin} from '@react-oauth/google'
import {GOOGLE_ICON} from '../../../public/svgs/icons'

const LoginButton = ({data: {setCredential, checkAccount, setError}}) => {

    const login = useGoogleLogin({
        scope: "https://www.googleapis.com/auth/drive",
        onSuccess: ({code}) => {
          setError(false)
          setCredential(code)
          checkAccount(code)
        },
        flow: 'auth-code',
      })

  return (
    <button className='google-login-btn' onClick={login}><GOOGLE_ICON className='google-login-icon'></GOOGLE_ICON>Login with Google</button>
  )
}

export default LoginButton