import { PermixProvider } from 'permix/vue'
import { createApp } from 'vue'
import App from './App.vue'
import { permix } from './lib/permix'
import './style.css'

createApp({
  components: { PermixProvider, App },
  template: '<PermixProvider :permix="permix"><App /></PermixProvider>',
  setup() {
    return { permix }
  },
}).mount('#app')
