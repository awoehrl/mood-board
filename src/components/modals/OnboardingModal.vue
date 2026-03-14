<script setup>
import { ref } from 'vue'
const emit = defineEmits(['done'])
const name = ref('')
function submit() { if (name.value.trim()) emit('done', name.value.trim()) }
</script>

<template>
  <div class="backdrop">
    <div class="card">
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
.card { width: 320px; text-align: center; }
.title {
  font-size: 22px; font-weight: 700; color: var(--text);
  margin: 0 0 6px; letter-spacing: -0.03em;
}
.desc { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px; }
.input {
  width: 100%; height: 40px;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 0 14px; font-size: 14px;
  color: var(--text); outline: none; text-align: center;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.input::placeholder { color: var(--text-muted); }
.btn {
  margin-top: 10px;
  width: 100%; height: 40px;
  font-size: 14px; font-weight: 500;
  color: white; background: var(--accent);
  border-radius: var(--radius-md);
  transition: background 0.15s;
}
.btn:hover { background: var(--accent-hover); }
.btn:disabled { opacity: 0.3; cursor: not-allowed; }
.hint { font-size: 12px; color: var(--text-muted); margin: 20px 0 0; }
</style>
