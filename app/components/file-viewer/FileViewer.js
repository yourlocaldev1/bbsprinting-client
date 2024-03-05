import './FileViewer.css'

const FileViewer = ({files, fileNames = false}) => {
  return (
        <div className="request-files-container">
          
          <div className='request-files-header'>
            <div className='link-header request-header'>
              <span className="material-symbols-outlined">link</span>
              Link
            </div>

            <div className="heading-divider"></div>

            <div className='options-header request-header'>
              <span className="material-symbols-outlined">tune</span>
              Options
            </div>

            <div className="heading-divider"></div>

            <div className='copies-header request-header'>
              <span className="material-symbols-outlined">file_copy</span>
              Copies
            </div>
          </div>

          {files.map(({id, copies, a3 = false, double = false, color = false, stapled = false, laminated = false, bound = false, name}) => <div key={id} className='request-file'>

            <div className="open-request">
              {fileNames ? <span className="view-file-name">{name}</span> : <a onClick={({target}) => target.textContent = "Opened"} href={`https://drive.google.com/file/d/${id}/view`} target="_blank">Open</a>}
              <span className="material-symbols-outlined open-link-icon">open_in_new</span>
            </div>

            <div className="section-divider"></div>

            <div className="request-options">
              <ul>
                    {a3 ? <li><span>A3</span></li> : <li><span>A4</span></li>}
                    {double ? <li><span>Double Sided</span></li> : <li><span>Single Sided</span></li>}
                    {color ? <li><span>Color</span></li> : <li><span>Black and White</span></li>}
                    {stapled ? <li><span>Stapled</span></li> : null}
                    {laminated ? <li><span>Laminated</span></li> : null}
                    {bound ? <li><span>Bound</span></li> : null}
              </ul>
            </div>

            <div className="section-divider"></div>

            <div className="request-copies">{copies}</div>
          </div>)}

        </div>
  )
}

export default FileViewer