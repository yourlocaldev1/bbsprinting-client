"use client";

import {useState, useRef} from 'react'

import './PrintForm.css'

import Modal from '../modal/Modal'

import useDrivePicker from 'react-google-drive-picker'

import {Sleep, GOOGLE_CLIENT_ID, GOOGLE_API_KEY, getAccessToken, getFolderId, getIcon} from '../../config'
import {GOOGLE_DRIVE_ICON} from '../../../public/svgs/icons'

export default function PrintForm({data: {setPrintForm, sendRequest, userData}}) {

    const [files, setFiles] = useState([])
    const [fileIndex, setFileIndex] = useState(0)
    const [filesRemaining, setFilesRemaining] = useState(0)

    const [openPicker] = useDrivePicker()

    const fileUploadRef = useRef()
    const fileRefs = useRef([])
    const progressRefs = useRef([])
    const settingRefs = useRef([])

    const [note, setNote] = useState('')

    const [closing, setClosing] = useState(false)

    function closePrintForm() {
      setClosing(true)
      setTimeout(() => {setPrintForm(false)}, 240)
    }

    async function updateFiles(newFiles) {
      await Sleep(190)
      setFiles(newFiles.sort((a,b) => a.index - b.index))
    }

    async function deleteFile(id) {
      fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
        method: "DELETE",
        headers: {
            authorization: `Bearer ${await getAccessToken()}`
        }
      })
    }

    async function uploadFile(file) {

      const fileMetaData = {name: file.name, parents: [await getFolderId()]}

      switch (file.type) {
        case "application/msword":
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": fileMetaData.mimeType = "application/vnd.google-apps.document"
          break;
        case "application/vnd.openxmlformats-officedocument.presentationml.presentation": fileMetaData.mimeType = "application/vnd.google-apps.presentation"
          break;
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": fileMetaData.mimeType = "application/vnd.google-apps.presentation"
          break;
        default:
          break;
      }


      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        headers: {
          'Content-Type': "application/json",
          authorization: `Bearer ${await getAccessToken()}`
        },
        body: JSON.stringify(fileMetaData),
        method: 'POST'
      })

      const sessionURI = res.headers.get('Location')

      const totalBytes = file.size || file.sizeBytes
      let bytesUploaded = 0
    
      const progressTrackingStream = new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk)
          bytesUploaded += chunk.byteLength
          if (progressRefs.current[file.index]) progressRefs.current[file.index].value = bytesUploaded / totalBytes
        }
      })

      const uploadRes = await fetch(sessionURI, {
        method: 'PUT',
        body: file.export ? new File([file.buffer], file.name).stream().pipeThrough(progressTrackingStream) : file.stream().pipeThrough(progressTrackingStream),
        duplex: "half"
      })

      const {id} = await uploadRes.json()
      file.id = id

      if (fileMetaData.mimeType) {
        if (progressRefs.current[file.index]) progressRefs.current[file.index].value = 0 //Reset the progress

        const res = await exportFile(id)
        let loadedBytes = 0

        const newRes = trackDownload(res, (loaded) => {
          loadedBytes = loaded
          if (progressRefs.current[file.index]) progressRefs.current[file.index].value = loaded/totalBytes
        })
        
        file.buffer = await newRes.arrayBuffer()
        file.mimeType = "application/pdf"
        file.sizeBytes = totalBytes
        file.googleDrive = true
      }

      file.progressing = false
      setFilesRemaining(filesRemaining => filesRemaining - 1)
      return file
    }

    function trackDownload(res, callback) {
      let loaded = 0
  
      return new Response(

        new ReadableStream({           
          start(controller) {
  
            const reader = res.body.getReader()
            read()
  
            async function read() {
              const progressEvent = await reader.read()
                if (progressEvent.done) return controller.close()
                
                loaded += progressEvent.value.byteLength
                callback(loaded)
  
                controller.enqueue(progressEvent.value)
                read()
            }
          }
        })
      )
    }

    async function downloadFile(id) {
      return await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&acknowledgeAbuse=true`, {
        headers: {
          authorization: `Bearer ${await getAccessToken()}`
        }
      })
    }

    async function exportFile(id) {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=exportLinks`, {
        headers: {
          authorization: `Bearer ${await getAccessToken()}`,
          'content-type': 'application/json'
        }
      })

      const downloadLink = (await res.json())?.exportLinks?.['application/pdf']

      return await fetch(downloadLink, {
        headers: {
          authorization: `Bearer ${await getAccessToken()}`
        }
      })

    }

    async function getFile(file) {

      const contentLength = file.sizeBytes === 0 ? 1 : file.sizeBytes
      let loadedBytes = 0

      const exportedFile = !!file.export

      const res = exportedFile ? await exportFile(file.id) : await downloadFile(file.id) 
    
      const newRes = trackDownload(res, (loaded) => {
        loadedBytes = loaded
        if (progressRefs.current[file.index]) progressRefs.current[file.index].value = loaded/contentLength
      })
      
      file.buffer = await newRes.arrayBuffer()
      if (exportedFile) {
        file.sizeBytes = loadedBytes
        file.mimeType = "application/pdf"
        if (progressRefs.current[file.index]) progressRefs.current[file.index].value = 0
        const newFile = await uploadFile(file)
        setFilesRemaining(filesRemaining => filesRemaining - 1)
        return newFile
      }
      file.progressing = false
      setFilesRemaining(filesRemaining => filesRemaining - 1)
      return file
    }

    async function addFiles(inputFiles, googleDrive = false) {

      if (files.length + inputFiles.length > 10) return alert('Too many files, the maximum number of permitted files are 10.')

      const newFiles = Array.from(inputFiles)
      
      const updatedFiles = []
      const uploadableFiles = []
      const downloadableFiles = []
      const duplicateNames = []
      const newFilesLength = newFiles.length
      const filesLength = files.length

      loop1: for (let i = 0; i < newFilesLength; i++) {
      
        for (let x = 0; x < filesLength; x++) {
          const name = files[x]?.name
          if (name === newFiles[i]?.name) {
            duplicateNames.push(name)
            continue loop1
          }
        }

        const increment = fileIndex + i + 1
        newFiles[i].index = increment
        newFiles[i].options = {
          a3: false,
          double: false,
          color: false,
          stapled: false,
          laminated: false,
          bound: false
        }
        newFiles[i].progressing = true
        if (newFiles[i].serviceId !== "DoclistBlob" && newFiles[i].mimeType?.includes?.('vnd.google-apps')) {
          newFiles[i].export = true
          setFilesRemaining(filesRemaining => filesRemaining + 1)
        }
        if (googleDrive) {
          newFiles[i].googleDrive = true
          downloadableFiles.push(newFiles[i])
        } else {
          uploadableFiles.push(newFiles[i])
        }
        updatedFiles.push(newFiles[i])
        setFileIndex(increment + 1)
      }

      const duplicateNamesLength = duplicateNames.length
      if (duplicateNamesLength === 1) alert(`The file: '${duplicateNames[0]}' has already been uploaded.`)
      if (duplicateNamesLength > 1) alert(`The files: '${duplicateNames.join("', '")}' have already been uploaded.`)

      setFilesRemaining(filesRemaining => filesRemaining + updatedFiles.length)
      
      setFiles(prevFiles => [...prevFiles, ...updatedFiles])
      fileUploadRef.current.value = ''

      if (uploadableFiles.length !== 0) {
        const uploadedFiles = await Promise.all(uploadableFiles.map(uploadFile))
        setFiles(prevFiles => [...prevFiles, ...uploadedFiles].filter((value, index, self) => index === self.findIndex(t => t.index === value.index)))
      }

      if (downloadableFiles.length !== 0) {
        const downloadedFiles = await Promise.all(downloadableFiles.map(getFile))
        setFiles(prevFiles => [...prevFiles, ...downloadedFiles].filter((value, index, self) => index === self.findIndex(t => t.index === value.index)))
      }

    }

    async function send() {
      const incompleteFiles = []
      files.forEach(file => {if (!file.copies) incompleteFiles.push(file.name)})
      if (incompleteFiles.length >= 1) return alert(`Wait! You forgot to enter the number of copies for '${incompleteFiles.join("', '")}'`)

      closePrintForm()
      setTimeout(() => sendRequest(files, note.trim()), 300)
    }

    async function handlePicker() {
      const token = await getAccessToken()
      if (!token) return

      openPicker({
        clientId: GOOGLE_CLIENT_ID,
        developerKey: GOOGLE_API_KEY,
        token,
        viewId: 'DOCS',
        showUploadView: true,
        showUploadFolders: true,
        supportDrives: true,
        multiselect: true,
        callbackFunction: (data) => {
          if (data?.action === 'picked') {
            addFiles(data?.docs, true)
          }
        }
      })
    }

    function iconSwitch(file, className) {
      const type = file.googleDrive ? file.mimeType : file.type

      const class_name = `preview-icon ${className}`

      return getIcon(type, class_name)
    }

    function getFileSize(file) {
      let size = file.googleDrive ? file.sizeBytes : file.size
      if (!size) return '...'
      return size >= 1000 ? (size >= 1000000 ? `${(size / 1000000).toFixed(1)} MB` : `${Math.round(size / 1000)} KB`) : `${size} Bytes`
    }

    function toggleSetting(previousValue, updatedSetting, fileIndex) {
      const key = Object.keys(updatedSetting)
      if (updatedSetting[key] === previousValue) return

      const updatedFiles = []

      files.forEach(oldFile => {
        if (oldFile.index === fileIndex) oldFile.options = {...oldFile.options, ...updatedSetting}
        return updatedFiles.push(oldFile)
      })

      setFiles(updatedFiles)
    }

    function sanitize(value) {
      if (value.length >= 200) return value.slice(0, 200)
      return value
    }

  return (
    <Modal closeModal={closePrintForm} closing={closing}>
      <div className="print-form-content">
          <h2>New Print Request</h2>

          <div className="form-options">

            <div className="printer-choice">
              <span>Using printer: </span>
              <div>{userData.printerEmail === "repro.ks3@belvederebritishschool.com" ? "KS3 Repro" : "Main Repro"}</div>
            </div>

            <div className="file-input">
              <label>Attach files: </label>
              <button onClick={(e) => fileUploadRef.current.click()} className='attach-files'><span className="material-symbols-outlined upload-file-icon">upload</span>Upload</button>
              <button onClick={handlePicker} className='attach-files'><GOOGLE_DRIVE_ICON className='google-drive-icon'/>Google Drive</button>
              <input multiple ref={fileUploadRef} onChange={({target: {files}}) => addFiles(files)} type="file" className='file-upload' />
            </div>

            {files.length === 0 ? null : 
            <div className="file-preview-container">
              {files.map(file => <div key={file.index} ref={(el) => fileRefs.current[file.index] = el} className='file-preview'>
            
            <div className='copies-container'>
              <input onChange={({target: {value}}) => {
                const copies = parseInt(value)
                if (file.copies === copies) return

                const updatedFiles = files.map(oldFile => {
                  if (oldFile.index === file.index) {
                    oldFile.copies = copies > 500 ? 500 : copies < 1 ? 1 : copies
                  }
                  return oldFile
                })
                setFiles(updatedFiles)
                }} type="number" value={file.copies ? String(file.copies): ''} max={500} min={1} placeholder='Copies' />
            </div>

            {file.progressing ? null : <div className="remove-file-container">
              <button onClick={async (e) => {
                  const filteredFiles = files.filter(randomFile => randomFile.index !== file.index)
                  fileRefs.current[file.index].classList.add('file-preview-hide')
                  delete fileRefs.current[file.index]
                  delete progressRefs.current[file.index]
                  delete settingRefs.current[file.index]

                  deleteFile(file.id)
    
                  await updateFiles(filteredFiles)
              }} className="remove-file">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>}

            <div className='settings-container'>
              <button onClick={() => {
                if (settingRefs.current[file.index].classList.contains('closed')) return settingRefs.current[file.index].classList.remove('closed')
                settingRefs.current[file.index].classList.add('closing')
                setTimeout(() => {
                  settingRefs.current[file.index].classList.add('closed')
                  settingRefs.current[file.index].classList.remove('closing')
                }, 200)
                }}>
                <span className="material-symbols-outlined">edit_document</span>
              </button>
            </div>

            <div className="settings-menu-container">
              <div className="settings-menu closed" ref={el => settingRefs.current[file.index] = el}>

              <div className="options-list">
                <div className='options paper-size'>
                  <input type="checkbox" name="paper-a4" required checked={!file.options.a3} onChange={() => toggleSetting(file.options.a3, {a3: false}, file.index)}/>
                  <label htmlFor="paper-a4">A4</label>
                  <input type="checkbox" name="paper-a3" checked={file.options.a3} onChange={() => toggleSetting(file.options.a3, {a3: true}, file.index)} />
                  <label htmlFor="paper-a3">A3</label>
                </div>

                <div className='options'>
                  <input type="checkbox" name="stapled" checked={file.options.stapled} onChange={() => toggleSetting(file.options.stapled, {stapled: !file.options.stapled}, file.index)}/>
                  <label htmlFor="stapled">Stapled</label>
                </div>

                <div className='options'>
                  <input type="checkbox" name="color" checked={file.options.color} onChange={() => toggleSetting(file.options.color, {color: !file.options.color}, file.index)}/>
                  <label htmlFor="color">Colour</label>
                </div>

                <div className='options'>
                  <input type="checkbox" name="double-sided" checked={file.options.double} onChange={() => toggleSetting(file.options.double, {double: !file.options.double}, file.index)}/>
                  <label htmlFor="double-sided">Double sided</label>
                </div>

                <div className='options'>
                  <input type="checkbox" name="laminated" checked={file.options.laminated} onChange={() => toggleSetting(file.options.laminated, {laminated: !file.options.laminated}, file.index)}/>
                  <label htmlFor="laminated">Laminated</label>
                </div>

                <div className='options'>
                  <input type="checkbox" name="bound" checked={file.options.bound} onChange={() => toggleSetting(file.options.bound, {bound: !file.options.bound}, file.index)}/>
                  <label htmlFor="bound">Bound</label>
                </div>
              </div>

              </div>
            </div>

  
              <div className="preview-image-container">
                {iconSwitch(file, file.progressing ? 'progressing' : '')}

                {file.progressing ? 
                <div className="progress-container">
                  <progress className="progress-bar" ref={(el) => progressRefs.current[file.index] = el} value="-1"></progress>
                </div> : null}

              </div>
              
              <div className="file-info">
                <span title={file.name} className='file-name'>{file.name}</span>
                <span className='file-size'>
                  {getFileSize(file)}
                </span>
              </div>
            </div>)}
            </div>}

            {/* {files.length === 0 ? null : <textarea value={note} onChange={({target: {value}}) => setNote(sanitize(value))} placeholder="Type a note... (Optional)" className="custom-note"></textarea>} */}

            <button onClick={filesRemaining === 0 ? (files.length === 0 ? null : send) : null} className='modal-btn'>{filesRemaining === 0 ? (files.length === 0 ? 'Attach a file to get started!' : 'Send') : `${filesRemaining} file${filesRemaining >= 2 ? 's' : ''} remaining...`}</button>
          </div>

      </div>
    </Modal>
  )
}
