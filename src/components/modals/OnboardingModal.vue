<script setup>
import { ref } from 'vue'
const emit = defineEmits(['done'])
const name = ref('')
function submit() { if (name.value.trim()) emit('done', name.value.trim()) }
</script>

<template>
  <div class="backdrop">
    <div class="card">
      <div class="icon">🏠</div>
      <h1 class="title">Mood Board</h1>
      <p class="desc">What's your name?</p>
      <input v-model="name" placeholder="Enter your name..." class="input" @keydown.enter="submit" autofocus />
      <button class="btn" :disabled="!name.trim()" @click="submit">Continue</button>
      <p class="hint">No account needed.</p>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: var(--canvas-bg);
}
.card { width: 340px; text-align: center; }
.icon { font-size: 48px; margin-bottom: 16px; }
.title { font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.desc { font-size: 14px; color: var(--text-secondary); margin: 0 0 28px; }
.input {
  width: 100%; height: 36px;
  border: 1px solid var(--border); border-radius: 4px;
  padding: 0 12px; font-size: 14px;
  color: var(--text); outline: none; text-align: center;
}
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(46,170,220,0.15); }
.input::placeholder { color: var(--text-muted); }
.btn {
  margin-top: 10px;
  width: 100%; height: 36px;
  font-size: 14px; font-weight: 500;
  color: white; background: var(--accent);
  border-radius: 4px;
}
.btn:hover { background: var(--accent-hover); }
.btn:disabled { opacity: 0.3; cursor: not-allowed; }
.hint { font-size: 12px; color: var(--text-muted); margin: 20px 0 0; }
</style>
