import { useEffect } from 'react'

const RingLoader = ({size = "40"}) => {

  useEffect(() => {
    import('ldrs/ring')
  })

  return (
    <l-ring size={size} stroke="6" bg-opacity="0" speed="1.8" color="white"></l-ring>
  )
}

export default RingLoader