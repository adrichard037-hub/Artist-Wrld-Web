type AvailabilityBadgeProps = {
  availability?: string | null
}

// Small "Sold" or "Reserved" label. Shows nothing for artworks that are still available.
function AvailabilityBadge({ availability }: AvailabilityBadgeProps) {
  if (availability !== 'SOLD' && availability !== 'RESERVED') return null

  const isSold = availability === 'SOLD'

  return (
    <span
      title={isSold ? 'This original has been sold' : 'An order is waiting for payment'}
      style={{
        display: 'inline-block',
        marginLeft: 8,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        background: isSold ? '#f8d7da' : '#fff0c2',
        color: isSold ? '#8a1c26' : '#7a5600',
      }}
    >
      {isSold ? 'Sold' : 'Reserved'}
    </span>
  )
}

export default AvailabilityBadge
