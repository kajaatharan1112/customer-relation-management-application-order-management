import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Field } from '@/features/auth/authShared'

describe('Field', () => {
  it('binds the label to the input via htmlFor/id', () => {
    render(<Field id="email" label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInstanceOf(HTMLInputElement)
  })

  it('forwards the ref to the underlying input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Field id="x" label="X" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('shows the error text when error is passed', () => {
    render(<Field id="e" label="E" error="Bad" />)
    expect(screen.getByText('Bad')).toBeInTheDocument()
  })

  it('renders no error node when error is undefined', () => {
    render(<Field id="e" label="E" />)
    expect(screen.queryByText('Bad')).not.toBeInTheDocument()
  })

  it('passes through arbitrary input props', () => {
    render(<Field id="p" label="P" placeholder="type here" />)
    expect(screen.getByPlaceholderText('type here')).toBeInTheDocument()
  })
})
