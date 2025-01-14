// we have to do it this way because otherwise vite will bundle it to
// /src/sw/main.js and we wont be able to scope it to /
import './src/sw/main.ts'
