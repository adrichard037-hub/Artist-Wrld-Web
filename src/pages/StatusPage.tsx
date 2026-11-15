import { Link } from 'react-router-dom'

type StatusPageProps = {
  title: string
  message: string
}

function StatusPage({ title, message }: StatusPageProps) {
  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div>
        <h1>{title}</h1>
        <p>{message}</p>
        <p>
          <Link to="/">Return to homepage</Link>
        </p>
      </div>
    </main>
  )
}

export default StatusPage
