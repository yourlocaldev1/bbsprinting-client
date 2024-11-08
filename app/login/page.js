"use client";

import React, {useState, useRef, useEffect} from 'react'
import './login.css'

import LoginButton from '../components/login/LoginButton'
import {Api, GOOGLE_CLIENT_ID} from '../config'

import { GoogleOAuthProvider, hasGrantedAllScopesGoogle } from '@react-oauth/google'


export default function Page() {

  useEffect(() => {
    (async function getData() {
      
      const {success, data} = await Api.get('account')
      if (!success) return localStorage.clear()

      let webpage;

      switch (data.role) {
        case 0: webpage = 'dashboard'
          break;
        case 1: webpage = 'printing'
          break;
        default: return alert('The app is not configured to support your account yet.')
      }
      
      window.location.href = `../${webpage}`
    })()
  }, [])

    const [tokens, setTokens] = useState({})
    const [info, setUserInfo] = useState({})

    const [schoolCode, setSchoolCode] = useState('')

    const [registering, setRegistering] = useState(false)

    const [googleAuth, setGoogleAuth] = useState(false)
    const [isLoading, setLoading] = useState(false)
    const [error, setError] = useState(false)


    const arabicChoiceRef = useRef()
    const primaryChoiceRef = useRef()
    const schoolCodeRef = useRef()

    function saveData({token, accessToken, folderId}) {
      localStorage.setItem('token', token)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('access_expiry', +new Date(+new Date() + 3.5e6))
      localStorage.setItem('folderId', folderId)
    }
    
    function verifyCaptcha() {
      setLoading(true)
      setError(false)
      register({tokens, ...info, schoolCode})
    }

    async function checkAccount(credential) {
      const {success, data, error} = await Api.post('account/check', {payload: {credential}}, false, false)

      if (!success) {
        setTimeout(() => window.location.reload(), 15000)
        if (error) return setError(error)

        return setError('Failed to login, please try again later.')
      }

      const {loginAvailable, tokens, role, accessToken, token} = data

      if (role === 1) {
        localStorage.setItem('token', token)
        localStorage.setItem('accessToken', accessToken)
        return window.location.href = '../printing'
      }

      setTokens(tokens)

      const hasAccess = hasGrantedAllScopesGoogle(
        tokens,
        'https://www.googleapis.com/auth/drive',
      )

      if (!hasAccess) return setError('Please retry and allow the necessary access required to your Google account to continue.')

        setGoogleAuth(true)

      if (loginAvailable) {
        const {success, data, error} = await Api.post('account/authorize', {payload: {tokens, login: true}}, false, false)

        if (!success) {
          setTimeout(() => window.location.reload(), 15000)
          if (error) return setError(error)
  
          return setError('Failed to login, please try again later.')
        }

        saveData(data)

        if (data.role === 1) return window.location.href = '../printing'
        
        return window.location.href = '../dashboard'
      }

      setRegistering(true)
    }

    async function register(payload) {
      const {success, data, error} = await Api.post('account/authorize', {payload}, false, false)

      if (!success) {
        setLoading(false)
        schoolCodeRef.current.disabled = false
      
        if (error) return setError(error)

        return setError('Failed to register, please try again later.')
      }

      saveData(data)

      window.location.href = '../dashboard'
    }

    function selectRole(target, ref, value) {
        Array.from(ref.current.children).forEach(button => button.classList.remove('selected'))
        target.classList.add('selected')
        setUserInfo(info => {
          return {...info, ...value}
        })
    }

    return (
      <div className='login'>
\      <div className="login-card-container">
        <div className="login-card">
          <div className="login-contents">
              
          <form className='login-form' onSubmit={(e) => e.preventDefault()}>
            <h1>{googleAuth ? 'Almost there..' : 'Get started!'}</h1>

            {(googleAuth && registering) ? 
            
            <div className='last-step'>
              <div className='role-selection'>

                <div className="role-choice-wrapper">
                  <span>Are you an arabic teacher?</span>

                  <div ref={arabicChoiceRef} className='role-choice'>
                    <button onClick={({target}) => selectRole(target, arabicChoiceRef, {arabic: true})}>Yes</button>
                    <button onClick={({target}) => selectRole(target, arabicChoiceRef, {arabic: false})}>No</button>
                  </div>
                </div>

                {typeof info.arabic === 'boolean' ? <div className="role-choice-wrapper">
                <span>Stage of Education:</span>

                  <div ref={primaryChoiceRef} className='role-choice'>
                    <button onClick={({target}) => selectRole(target, primaryChoiceRef, {primary: true})}>Primary</button>
                    <button onClick={({target}) => selectRole(target, primaryChoiceRef, {primary: false})}>Secondary</button>
                  </div>
                </div> : null}


              </div>

              {typeof info.arabic === 'boolean' && typeof info.primary === 'boolean' ? <input ref={schoolCodeRef} type='text' placeholder='School Code' className='school-code' value={schoolCode} onChange={(e) => setSchoolCode(e.target.value.trim())}></input> : null}

              {(typeof info.arabic === 'boolean' && typeof info.primary === 'boolean' && schoolCode?.length === 8) ? <button onClick={(e) => {

                if (isLoading) return

                verifyCaptcha()
              }} className={`login-btn ${isLoading ? 'btn-loading' : ''}`}>{isLoading ? <div className="spinning-loader"></div> : 'GO!'}</button>
              : null}
            </div>
            
            : (googleAuth ? (error ? null : <button className='login-btn btn-loading'><div className="spinning-loader"></div></button>) : 
              
              <div className="google-sign-in">
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                  <LoginButton data={{checkAccount, setError}} />
                </GoogleOAuthProvider>
              </div>)
            }

            <div className="error-container">
                {error ? <p className='error'>{error}</p> : null}
            </div>

          </form>

        </div>
        </div>
      </div>
    </div>

    )
}
