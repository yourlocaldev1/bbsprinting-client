import { redirect } from 'next/navigation'

export default function Page() {

redirect('./login')

  return (
        <div>redirecting...</div>
  )
}