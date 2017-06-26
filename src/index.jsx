import React from 'react'
import { render } from 'react-dom'
import Root from './Root'

import './style/index.scss'

const wrapper = global.document.querySelector('#root')

function run() {
  render(
    <Root />,
    wrapper,
  )
}

run()

if (process.env.NODE_ENV !== 'production' && module.hot) {
  module.hot.accept('./Root', run)
}
