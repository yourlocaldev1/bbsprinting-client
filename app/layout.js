import './globals.css'

export const metadata = {
  title: 'BBS Printing',
  description: 'An app to take care of printing at Belvedere British School. Made by an amazing person too.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
