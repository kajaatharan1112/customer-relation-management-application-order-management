import { render } from '@testing-library/react'
import { BarChart, Bar, XAxis } from 'recharts'

it('recharts renders in jsdom with an explicit size', () => {
  const { container } = render(
    <BarChart width={300} height={160} data={[{ name: 'a', v: 1 }, { name: 'b', v: 2 }]}>
      <XAxis dataKey="name" />
      <Bar dataKey="v" />
    </BarChart>,
  )
  expect(container.querySelector('svg')).not.toBeNull()
})
