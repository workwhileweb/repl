/* @refresh reload */
import { render } from 'solid-js/web'

import { App } from './App'
import './app.css'

const root = document.getElementById('root')

if (!import.meta.env.PROD) {
  localStorage.setItem('umami.disabled', 'true')
}

render(() => <App />, root!)
