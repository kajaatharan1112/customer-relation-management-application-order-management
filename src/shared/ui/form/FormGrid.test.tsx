import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormGrid } from './FormGrid'
import { Field } from './Field'

describe('FormGrid', () => {
  it('lays children on a 2-col md grid and spans full fields', () => {
    render(
      <FormGrid>
        <Field id="a" label="A" />
        <Field id="b" label="B" full />
      </FormGrid>,
    )
    expect(screen.getByLabelText('A').closest('[data-field]')).not.toHaveClass('md:col-span-2')
    expect(screen.getByLabelText('B').closest('[data-field]')).toHaveClass('md:col-span-2')
  })
})
