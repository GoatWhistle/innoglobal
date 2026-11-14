import { readTheme } from '../kit-theme.js'
import { icon } from './format.js'

const button=document.querySelector('[data-theme-toggle]')
function theme(value){
 document.documentElement.dataset.theme=value
 try{localStorage.setItem('ds-theme',value)}catch{}
 button.innerHTML=`${icon(value==='dark'?'sun':'moon')} ${value==='dark'?'Светлая тема':'Тёмная тема'}`
}
button.addEventListener('click',()=>theme(document.documentElement.dataset.theme==='dark'?'light':'dark'))
theme(readTheme())
