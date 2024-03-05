import Lottie from 'react-lottie'
import animationData from '../../../public/lotties/tree.json'

const animationOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice"
    }
}

const TreeAnimation = () => {
  return <Lottie options={animationOptions}/>
}

export default TreeAnimation