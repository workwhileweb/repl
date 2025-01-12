/* @refresh reload */
import { render } from 'solid-js/web'

import { App } from './App'
import { registerServiceWorker } from './sw/register.ts'
import './app.css'

const root = document.getElementById('root')

registerServiceWorker()

render(() => <App />, root!)
