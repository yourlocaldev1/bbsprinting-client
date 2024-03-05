import './Modal.css'

const Modal = ({closeModal, closing, closeButton = true, children}) => {

  return (
    <div className="modal-layer">
    <div className={`modal-overlay ${closing ? 'modal-overlay-closing' : ''}`}></div>
        <div className={`modal ${closing ? 'modal-closing': ''}`}>
            
          {children}


          {closeButton ? <button onClick={closeModal} className='modal-close-btn'>
                <span className="material-symbols-outlined">close</span>
          </button> : null}
        </div>

    </div>
  )
}

export default Modal