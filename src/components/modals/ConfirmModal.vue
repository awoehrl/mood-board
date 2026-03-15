<script setup>
defineProps({
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
  danger: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div class="backdrop" @pointerdown.self="emit('cancel')">
    <div class="card">
      <h2 class="heading">{{ title }}</h2>
      <p v-if="message" class="desc">{{ message }}</p>
      <div class="actions">
        <button class="btn-ghost" @click="emit('cancel')">Cancel</button>
        <button
          :class="danger ? 'btn-danger' : 'btn-primary'"
          @click="emit('confirm')"
        >{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: var(--overlay); }
.card { background: var(--bg); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 24px; width: min(340px, calc(100vw - 32px)); }
.heading { font-size: 15px; font-weight: 600; color: var(--text); margin: 0 0 4px; letter-spacing: -0.01em; }
.desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; }
.heading + .actions { margin-top: 16px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn-ghost { height: 32px; padding: 0 12px; font-size: 13px; font-weight: 500; color: var(--text-secondary); border-radius: var(--radius-sm); transition: background 0.1s; }
.btn-ghost:hover { background: var(--hover); }
.btn-primary { height: 32px; padding: 0 14px; font-size: 13px; font-weight: 500; color: white; background: var(--accent); border-radius: var(--radius-sm); transition: background 0.1s; }
.btn-primary:hover { background: var(--accent-hover); }
.btn-danger { height: 32px; padding: 0 14px; font-size: 13px; font-weight: 500; color: white; background: var(--red); border-radius: var(--radius-sm); transition: background 0.1s; }
.btn-danger:hover { opacity: 0.9; }
</style>
