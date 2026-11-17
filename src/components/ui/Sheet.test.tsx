import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Sheet } from './Sheet'

function Stacked() {
  const [isOuterOpen, setIsOuterOpen] = useState(true)
  const [isInnerOpen, setIsInnerOpen] = useState(false)
  return (
    <>
      <Sheet isOpen={isOuterOpen && !isInnerOpen} onClose={() => setIsOuterOpen(false)} title="Outer">
        <button type="button" onClick={() => setIsInnerOpen(true)}>
          open inner
        </button>
      </Sheet>
      <Sheet isOpen={isOuterOpen && isInnerOpen} onClose={() => setIsInnerOpen(false)} title="Inner">
        <p>inner content</p>
      </Sheet>
      <p>outer is {isOuterOpen ? 'open' : 'closed'}</p>
    </>
  )
}

describe('Sheet', () => {
  it('hiding a sheet from the app does not count as the user closing it (stacked sheets)', async () => {
    render(<Stacked />)
    await userEvent.click(screen.getByRole('button', { name: 'open inner' }))
    expect(screen.getByText('outer is open')).toBeInTheDocument()
    expect(screen.getByText('inner content').closest('dialog')).toHaveAttribute('open')
  })

  it('reports a user dismissal through onClose', async () => {
    const onClose = vi.fn()
    render(
      <Sheet isOpen onClose={onClose} title="Solo">
        <p>x</p>
      </Sheet>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
