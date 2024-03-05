
import { useEffect } from 'react'

const DotPulse = () => {

  useEffect(() => {
    import('ldrs/dotPulse')
  })

  return (
    <l-dot-pulse size="30" speed="1.3" color="white"></l-dot-pulse>
  )
}

export default DotPulse